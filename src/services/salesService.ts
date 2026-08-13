import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export interface InvoiceItemInput {
  productId: string;
  godownId: string;
  packingItemId?: string;
  bagCapacityKg?: string;
  numberOfBags: string;
  quantity: string; // total weight in kg
  rate: string;
}

export class SalesService {
  /**
   * Finalizes a Sales Invoice in ONE SINGLE ATOMIC TRANSACTION on Supabase Pooler.
   * Performs lot deduction, packing material deduction, invoice creation, and customer balance updates safely.
   */
  static async finalizeInvoice(data: {
    customerId: string;
    vehicleId?: string;
    transportFreightAmount?: number;
    userId: string;
    items: InvoiceItemInput[];
    generateBill?: boolean;
    deliveryNote?: string;
    modeOfPayment?: string;
    buyersOrderNo?: string;
    dispatchDocNo?: string;
    destination?: string;
    termsOfDelivery?: string;
    otherReferences?: string;
    vehicleNo?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error("Invoice must have at least one item.");
    }

    const isBill = data.generateBill ?? true;

    return prisma.$transaction(async (tx) => {
      // 1. Generate Invoice Number inside tx
      const year = new Date().getFullYear();
      const prefix = isBill ? 'INV' : 'EST';
      const count = await tx.salesInvoice.count({
        where: {
          invoiceNumber: {
            startsWith: `${prefix}-${year}-`
          }
        }
      });
      const invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

      // 2. Fetch product details inside tx
      const productIds = Array.from(new Set(data.items.map(i => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // 3. Fetch packing items inside tx
      const packingItemIds = data.items.map(i => i.packingItemId).filter((id): id is string => Boolean(id));
      const packingItems = packingItemIds.length > 0 ? await tx.packingItem.findMany({
        where: { id: { in: packingItemIds } }
      }) : [];
      const packingMap = new Map(packingItems.map(p => [p.id, p]));

      let subtotal = new Decimal(0);
      let taxTotal = new Decimal(0);

      // Process and validate items
      const processedItems = data.items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product not found.`);

        let packingItemName = null;
        if (item.packingItemId) {
          const pack = packingMap.get(item.packingItemId);
          if (pack) {
            packingItemName = `${pack.brandName} ${Number(pack.capacityKg)} KG`;
          }
        }

        const bags = new Decimal(item.numberOfBags || '0');
        const qty = new Decimal(item.quantity || '0');

        if (!packingItemName) {
          const varietyName = product.name.replace(/paddy/i, '').trim() || product.name;
          const cap = item.bagCapacityKg 
            ? Number(item.bagCapacityKg) 
            : (bags.gt(0) ? qty.dividedBy(bags).toNumber() : 75);
          packingItemName = `${varietyName} Paddy - ${cap} KG`;
        }

        const ratePerBag = new Decimal(item.rate || '0');
        const gstRate = isBill ? new Decimal(Number(product.gstRate)) : new Decimal(0);

        if (bags.lte(0)) {
          throw new Error(`Number of bags must be greater than zero.`);
        }

        const lineTotal = bags.times(ratePerBag);
        const taxAmount = lineTotal.times(gstRate).dividedBy(100);

        subtotal = subtotal.plus(lineTotal);
        taxTotal = taxTotal.plus(taxAmount);

        return {
          productId: item.productId,
          godownId: item.godownId,
          packingItemId: item.packingItemId || null,
          packingItemName,
          numberOfBags: bags.toNumber(),
          quantity: qty.toNumber(),
          rate: ratePerBag.toNumber(),
          gstRate: gstRate.toNumber(),
          lineTotal: lineTotal.toNumber(),
          taxAmount: taxAmount.toNumber()
        };
      });

      const grandTotal = subtotal.plus(taxTotal);

      // 4. Batch FIFO Inventory Stock Issue inside tx
      const lotConditions = processedItems
        .filter(i => i.quantity > 0)
        .map(i => ({
          productId: i.productId,
          godownId: i.godownId,
          status: 'ACTIVE' as const
        }));

      let activeLots: any[] = [];
      if (lotConditions.length > 0) {
        activeLots = await tx.lot.findMany({
          where: { OR: lotConditions },
          orderBy: { createdAt: 'asc' }
        });
      }

      const activeLotsMap = new Map<string, any[]>();
      for (const lot of activeLots) {
        const key = `${lot.productId}_${lot.godownId}`;
        if (!activeLotsMap.has(key)) activeLotsMap.set(key, []);
        activeLotsMap.get(key)!.push(lot);
      }

      const lotUpdatesMap = new Map<string, { currentQuantity: number; status: string }>();
      const stockMovements = [];

      for (const item of processedItems) {
        if (item.quantity <= 0) continue;

        const key = `${item.productId}_${item.godownId}`;
        const lotsForThisItem = activeLotsMap.get(key) || [];
        
        let remainingToIssue = new Decimal(item.quantity);
        const consumedLots = [];

        for (const lot of lotsForThisItem) {
          if (remainingToIssue.lte(0)) break;
          
          const currentQty = lotUpdatesMap.has(lot.id) 
            ? new Decimal(lotUpdatesMap.get(lot.id)!.currentQuantity)
            : new Decimal(Number(lot.currentQuantity));

          if (currentQty.lte(0)) continue;

          const qtyToTake = Decimal.min(currentQty, remainingToIssue);
          const newLotQty = currentQty.minus(qtyToTake);

          lotUpdatesMap.set(lot.id, {
            currentQuantity: newLotQty.toNumber(),
            status: newLotQty.isZero() ? 'EXHAUSTED' : 'ACTIVE'
          });

          consumedLots.push({ lotId: lot.id, taken: qtyToTake.toNumber() });
          remainingToIssue = remainingToIssue.minus(qtyToTake);
        }

        stockMovements.push({
          productId: item.productId,
          fromGodownId: item.godownId,
          toGodownId: null,
          quantity: item.quantity,
          type: 'SALE',
          userId: data.userId,
          referenceId: JSON.stringify(consumedLots)
        });
      }

      // Execute all lot updates and stock movements concurrently
      const lotUpdatePromises = Array.from(lotUpdatesMap.entries()).map(([id, update]) => 
        tx.lot.update({ where: { id }, data: { currentQuantity: update.currentQuantity, status: update.status as any } })
      );
      
      await Promise.all([
        ...lotUpdatePromises,
        stockMovements.length > 0 ? tx.stockMovement.createMany({ data: stockMovements as any }) : Promise.resolve()
      ]);

      // 5. Packing Material Bags Stock Deduction inside tx
      const packingUpdatesMap = new Map<string, number>();
      
      for (const item of processedItems) {
        if (item.packingItemId && item.numberOfBags > 0) {
          const packingItem = packingMap.get(item.packingItemId);
          if (packingItem) {
            const currentBags = packingUpdatesMap.has(item.packingItemId)
              ? packingUpdatesMap.get(item.packingItemId)!
              : Number(packingItem.quantityBags);
            
            packingUpdatesMap.set(item.packingItemId, Math.max(0, currentBags - item.numberOfBags));
          }
        }
      }

      const packingUpdatePromises = Array.from(packingUpdatesMap.entries()).map(([id, quantityBags]) => {
        if (quantityBags <= 0) {
          return tx.packingItem.update({
            where: { id },
            data: { quantityBags: 0, deletedAt: new Date() }
          });
        }
        return tx.packingItem.update({ where: { id }, data: { quantityBags } });
      });

      if (packingUpdatePromises.length > 0) {
        await Promise.all(packingUpdatePromises);
      }

      // 6. Record Sales Invoice inside tx
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          userId: data.userId,
          subtotal: subtotal.toNumber(),
          taxTotal: taxTotal.toNumber(),
          transportFreightAmount: data.transportFreightAmount || 0,
          grandTotal: grandTotal.toNumber(),
          status: 'FINALIZED',
          deliveryNote: data.deliveryNote,
          modeOfPayment: data.modeOfPayment,
          buyersOrderNo: data.buyersOrderNo,
          dispatchDocNo: data.dispatchDocNo,
          destination: data.destination,
          termsOfDelivery: data.termsOfDelivery,
          otherReferences: data.otherReferences,
          vehicleNo: data.vehicleNo,
          items: {
            create: processedItems.map(i => ({
              productId: i.productId,
              godownId: i.godownId,
              quantity: i.quantity,
              rate: i.rate,
              gstRate: i.gstRate,
              lineTotal: i.lineTotal,
              taxAmount: i.taxAmount,
              packingItemName: i.packingItemName
            }))
          }
        },
        include: { items: true }
      });

      // 7. Update Customer Balance inside tx
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          balance: {
            increment: grandTotal.toNumber()
          }
        }
      });

      // 8. Create Customer Ledger Entry inside tx
      await tx.ledgerEntry.create({
        data: {
          customerId: data.customerId,
          transactionType: 'DEBIT',
          amount: grandTotal.toNumber(),
          description: `Sales Invoice ${invoiceNumber}`,
          referenceId: invoice.id
        }
      });

      return invoice;
    }, {
      timeout: 20000 // 20s safety timeout for Supabase pooler
    });
  }

  /**
   * Updates invoice fields and item descriptions.
   */
  static async updateInvoiceDetails(invoiceId: string, data: {
    deliveryNote?: string;
    modeOfPayment?: string;
    buyersOrderNo?: string;
    dispatchDocNo?: string;
    destination?: string;
    termsOfDelivery?: string;
    otherReferences?: string;
    vehicleNo?: string;
    items?: Array<{ id: string; description: string }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          deliveryNote: data.deliveryNote,
          modeOfPayment: data.modeOfPayment,
          buyersOrderNo: data.buyersOrderNo,
          dispatchDocNo: data.dispatchDocNo,
          destination: data.destination,
          termsOfDelivery: data.termsOfDelivery,
          otherReferences: data.otherReferences,
          vehicleNo: data.vehicleNo,
        }
      });

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await tx.salesInvoiceItem.update({
            where: { id: item.id },
            data: { packingItemName: item.description }
          });
        }
      }

      return invoice;
    });
  }

  /**
   * Auto-save a Sales Invoice draft (Queue System).
   * Does NOT deduct inventory or affect balances.
   */
  static async saveDraft(data: {
    id?: string;
    customerId: string;
    vehicleId?: string;
    transportFreightAmount?: number;
    userId: string;
    items: InvoiceItemInput[];
    generateBill?: boolean;
    deliveryNote?: string;
    modeOfPayment?: string;
    buyersOrderNo?: string;
    dispatchDocNo?: string;
    destination?: string;
    termsOfDelivery?: string;
    otherReferences?: string;
    vehicleNo?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Fetch products to calculate subtotal
      const productIds = Array.from(new Set(data.items.map(i => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // Fetch packing items
      const packingItemIds = data.items.map(i => i.packingItemId).filter((id): id is string => Boolean(id));
      const packingItems = packingItemIds.length > 0 ? await tx.packingItem.findMany({
        where: { id: { in: packingItemIds } }
      }) : [];
      const packingMap = new Map(packingItems.map(p => [p.id, p]));

      let subtotal = new Decimal(0);
      let taxTotal = new Decimal(0);
      const isBill = data.generateBill ?? true;

      const processedItems = data.items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product not found.`);

        let packingItemName = null;
        if (item.packingItemId) {
          const pack = packingMap.get(item.packingItemId);
          if (pack) {
            packingItemName = `${pack.brandName} ${Number(pack.capacityKg)} KG`;
          }
        }

        const bags = new Decimal(item.numberOfBags || '0');
        const qty = new Decimal(item.quantity || '0');
        const ratePerBag = new Decimal(item.rate || '0');
        const gstRate = isBill ? new Decimal(Number(product.gstRate)) : new Decimal(0);
        
        if (!packingItemName) {
          const varietyName = product.name.replace(/paddy/i, '').trim() || product.name;
          const cap = item.bagCapacityKg 
            ? Number(item.bagCapacityKg) 
            : (bags.gt(0) ? qty.dividedBy(bags).toNumber() : 75);
          packingItemName = `${varietyName} Paddy - ${cap} KG`;
        }

        const lineTotal = bags.times(ratePerBag);
        const taxAmount = lineTotal.times(gstRate).dividedBy(100);

        subtotal = subtotal.plus(lineTotal);
        taxTotal = taxTotal.plus(taxAmount);

        return {
          productId: item.productId,
          godownId: item.godownId,
          packingItemName,
          quantity: qty.toNumber(),
          rate: ratePerBag.toNumber(),
          gstRate: gstRate.toNumber(),
          lineTotal: lineTotal.toNumber(),
          taxAmount: taxAmount.toNumber()
        };
      });

      const grandTotal = subtotal.plus(taxTotal);

      if (data.id) {
        // Update existing draft
        const existing = await tx.salesInvoice.findUnique({ where: { id: data.id } });
        if (existing && existing.status !== 'DRAFT') {
          throw new Error("Cannot update a finalized invoice as a draft.");
        }
        
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: data.id } });
        
        return tx.salesInvoice.update({
          where: { id: data.id },
          data: {
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            subtotal: subtotal.toNumber(),
            taxTotal: taxTotal.toNumber(),
            grandTotal: grandTotal.toNumber(),
            transportFreightAmount: data.transportFreightAmount || 0,
            deliveryNote: data.deliveryNote,
            modeOfPayment: data.modeOfPayment,
            buyersOrderNo: data.buyersOrderNo,
            dispatchDocNo: data.dispatchDocNo,
            destination: data.destination,
            termsOfDelivery: data.termsOfDelivery,
            otherReferences: data.otherReferences,
            vehicleNo: data.vehicleNo,
            items: {
              create: processedItems
            }
          },
          include: { items: true, customer: true }
        });
      } else {
        // Create new draft
        const year = new Date().getFullYear();
        const prefix = 'DRAFT-INV';
        const invoiceNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        return tx.salesInvoice.create({
          data: {
            invoiceNumber,
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            userId: data.userId,
            status: 'DRAFT',
            subtotal: subtotal.toNumber(),
            taxTotal: taxTotal.toNumber(),
            grandTotal: grandTotal.toNumber(),
            transportFreightAmount: data.transportFreightAmount || 0,
            deliveryNote: data.deliveryNote,
            modeOfPayment: data.modeOfPayment,
            buyersOrderNo: data.buyersOrderNo,
            dispatchDocNo: data.dispatchDocNo,
            destination: data.destination,
            termsOfDelivery: data.termsOfDelivery,
            otherReferences: data.otherReferences,
            vehicleNo: data.vehicleNo,
            items: {
              create: processedItems
            }
          },
          include: { items: true, customer: true }
        });
      }
    });
  }

  /**
   * Delete a Draft invoice
   */
  static async deleteDraft(id: string) {
    const existing = await prisma.salesInvoice.findUnique({ where: { id } });
    if (!existing || existing.status !== 'DRAFT') {
      throw new Error("Only DRAFT invoices can be deleted directly.");
    }
    return prisma.salesInvoice.delete({ where: { id } });
  }
}

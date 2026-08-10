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

      // 4. Record Sales Invoice inside tx FIRST so we have the ID for StockMovements
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

      // 5. FIFO Inventory Stock Issue inside tx
      for (const item of processedItems) {
        if (item.quantity <= 0) continue;

        const activeLots = await tx.lot.findMany({
          where: {
            productId: item.productId,
            godownId: item.godownId,
            status: 'ACTIVE'
          },
          orderBy: { createdAt: 'asc' }
        });

        let remainingToIssue = new Decimal(item.quantity);
        const consumedLots = [];

        for (const lot of activeLots) {
          if (remainingToIssue.lte(0)) break;
          const lotQty = new Decimal(Number(lot.currentQuantity));
          const qtyToTake = Decimal.min(lotQty, remainingToIssue);
          const newLotQty = lotQty.minus(qtyToTake);

          await tx.lot.update({
            where: { id: lot.id },
            data: {
              currentQuantity: newLotQty.toNumber(),
              status: newLotQty.isZero() ? 'EXHAUSTED' : 'ACTIVE'
            }
          });

          consumedLots.push({ lotId: lot.id, taken: qtyToTake.toNumber() });
          remainingToIssue = remainingToIssue.minus(qtyToTake);
        }

        if (remainingToIssue.gt(0)) {
          throw new Error(`Insufficient stock for product ${item.productId} in godown ${item.godownId}. Missing ${remainingToIssue.toNumber()} kg.`);
        }

        // Log Stock Movement inside tx
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            fromGodownId: item.godownId,
            toGodownId: null,
            quantity: item.quantity,
            type: 'SALE',
            userId: data.userId,
            referenceId: JSON.stringify({ invoiceId: invoice.id, consumedLots })
          }
        });
      }

      // 6. Packing Material Bags Stock Deduction inside tx

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
   * Modifies an existing invoice safely:
   * 1. Reverts old inventory movements.
   * 2. Deducts new inventory.
   * 3. Records adjustment and updates balances.
   */
  static async modifyInvoice(invoiceId: string, data: {
    userId: string;
    items: InvoiceItemInput[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error("Invoice must have at least one item.");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch old invoice
      const oldInvoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: { items: true }
      });

      if (!oldInvoice) throw new Error("Invoice not found.");

      const oldGrandTotal = new Decimal(Number(oldInvoice.grandTotal));

      // 2. Fetch old Stock Movements for this invoice
      // Since we format it as JSON, we need to get all movements and filter
      // (For a small system, this is fine. A LIKE query on referenceId is better).
      const oldMovements = await tx.stockMovement.findMany({
        where: {
          referenceId: {
            contains: invoiceId
          },
          type: { in: ['SALE', 'ADJUSTMENT - SALES MODIFICATION'] }
        }
      });

      // Filter exactly those matching this invoiceId in JSON
      const invoiceMovements = oldMovements.filter(m => {
        if (!m.referenceId) return false;
        try {
          const parsed = JSON.parse(m.referenceId);
          return parsed.invoiceId === invoiceId;
        } catch {
          return false;
        }
      });

      // 3. REVERT Inventory (Lots and Packing Materials)
      // A. Revert Lots
      for (const movement of invoiceMovements) {
        try {
          const parsed = JSON.parse(movement.referenceId!);
          if (parsed.consumedLots && Array.isArray(parsed.consumedLots)) {
            for (const consumed of parsed.consumedLots) {
              await tx.lot.update({
                where: { id: consumed.lotId },
                data: {
                  currentQuantity: { increment: consumed.taken },
                  status: 'ACTIVE' // Since we added stock back, it's definitely ACTIVE
                }
              });
            }
          }
        } catch (err) {
          console.error("Failed to parse stock movement referenceId for revert.", err);
        }

        // Create a Revert Movement
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            toGodownId: movement.fromGodownId,
            quantity: movement.quantity,
            type: 'ADJUSTMENT - SALES MODIFICATION',
            userId: data.userId,
            referenceId: JSON.stringify({ invoiceId, action: 'REVERT' })
          }
        });
      }

      // B. Revert Packing Materials
      for (const item of oldInvoice.items) {
        // We need to know which packing material was used. 
        // We didn't store packingItemId directly on SalesInvoiceItem (we only stored name).
        // Let's deduce it or wait, SalesInvoiceItem might not have packingItemId!
        // Actually, we SHOULD add packingItemId to SalesInvoiceItem in schema?
        // In the original, it didn't exist. Let's look up packing item by name.
        if (item.packingItemName) {
          const packMatches = await tx.packingItem.findMany();
          // Find matching packing item by brandName and capacity
          for (const pack of packMatches) {
             const expectedName = `${pack.brandName} ${Number(pack.capacityKg)} KG`;
             if (expectedName === item.packingItemName) {
               // We don't have bags stored directly in SalesInvoiceItem! We can infer from quantity / capacity.
               const bags = Math.ceil(Number(item.quantity) / Number(pack.capacityKg));
               await tx.packingItem.update({
                 where: { id: pack.id },
                 data: { quantityBags: { increment: bags } }
               });
               break;
             }
          }
        }
      }

      // 4. PROCESS NEW ITEMS
      const productIds = Array.from(new Set(data.items.map(i => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      const packingItemIds = data.items.map(i => i.packingItemId).filter((id): id is string => Boolean(id));
      const packingItems = packingItemIds.length > 0 ? await tx.packingItem.findMany({
        where: { id: { in: packingItemIds } }
      }) : [];
      const packingMap = new Map(packingItems.map(p => [p.id, p]));

      let subtotal = new Decimal(0);
      let taxTotal = new Decimal(0);

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
        const gstRate = new Decimal(Number(product.gstRate));

        if (bags.lte(0)) throw new Error(`Number of bags must be greater than zero.`);

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

      const newGrandTotal = subtotal.plus(taxTotal);

      // 5. APPLY NEW INVENTORY DEDUCTIONS
      for (const item of processedItems) {
        if (item.quantity <= 0) continue;

        const activeLots = await tx.lot.findMany({
          where: { productId: item.productId, godownId: item.godownId, status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' }
        });

        let remainingToIssue = new Decimal(item.quantity);
        const consumedLots = [];

        for (const lot of activeLots) {
          if (remainingToIssue.lte(0)) break;
          const lotQty = new Decimal(Number(lot.currentQuantity));
          const qtyToTake = Decimal.min(lotQty, remainingToIssue);
          const newLotQty = lotQty.minus(qtyToTake);

          await tx.lot.update({
            where: { id: lot.id },
            data: {
              currentQuantity: newLotQty.toNumber(),
              status: newLotQty.isZero() ? 'EXHAUSTED' : 'ACTIVE'
            }
          });

          consumedLots.push({ lotId: lot.id, taken: qtyToTake.toNumber() });
          remainingToIssue = remainingToIssue.minus(qtyToTake);
        }

        if (remainingToIssue.gt(0)) {
          throw new Error(`Insufficient stock for modification. Missing ${remainingToIssue.toNumber()} kg.`);
        }

        // Log Stock Movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            fromGodownId: item.godownId,
            toGodownId: null,
            quantity: item.quantity,
            type: 'ADJUSTMENT - SALES MODIFICATION',
            userId: data.userId,
            referenceId: JSON.stringify({ invoiceId, consumedLots })
          }
        });
      }

      for (const item of processedItems) {
        if (item.packingItemId && item.numberOfBags > 0) {
          const packingItem = packingMap.get(item.packingItemId);
          if (packingItem) {
            const currentBags = new Decimal(Number(packingItem.quantityBags));
            const bagsToDeduct = new Decimal(item.numberOfBags);
            if (currentBags.minus(bagsToDeduct).lt(0)) {
               throw new Error(`Insufficient packing bags. Need ${bagsToDeduct.toNumber()}, have ${currentBags.toNumber()}.`);
            }
            await tx.packingItem.update({
              where: { id: item.packingItemId },
              data: { quantityBags: { decrement: bagsToDeduct.toNumber() } },
            });
          }
        }
      }

      // 6. UPDATE INVOICE AND CALCULATE DELTA
      const delta = newGrandTotal.minus(oldGrandTotal);

      // Delete old items
      await tx.salesInvoiceItem.deleteMany({
        where: { invoiceId }
      });

      // Calculate new status
      let newStatus = oldInvoice.status;
      const amountPaid = Number(oldInvoice.amountPaid || 0);
      
      if (newGrandTotal.toNumber() === amountPaid) {
        newStatus = 'PAID';
      } else if (amountPaid > 0 && newGrandTotal.toNumber() > amountPaid) {
        newStatus = 'PARTIALLY_PAID';
      } else if (newGrandTotal.toNumber() < amountPaid) {
        newStatus = 'PARTIALLY_PAID'; // Keep in queue for refund
      } else if (amountPaid === 0) {
        newStatus = 'FINALIZED'; // Assuming finalized is the non-draft unpaid state
      }

      // Update invoice
      const updatedInvoice = await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: subtotal.toNumber(),
          taxTotal: taxTotal.toNumber(),
          grandTotal: newGrandTotal.toNumber(),
          status: newStatus,
          isModified: true,
          originalGrandTotal: oldInvoice.originalGrandTotal ? Number(oldInvoice.originalGrandTotal) : oldGrandTotal.toNumber(),
          adjustmentAmount: delta.toNumber(),
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

      // 7. UPDATE FINANCIALS (Customer Balance & Ledger)
      if (!delta.isZero()) {
        await tx.customer.update({
          where: { id: oldInvoice.customerId },
          data: {
            balance: { increment: delta.toNumber() }
          }
        });

        await tx.ledgerEntry.create({
          data: {
            customerId: oldInvoice.customerId,
            transactionType: delta.gt(0) ? 'DEBIT' : 'CREDIT',
            amount: delta.abs().toNumber(),
            description: `Invoice Modification Adjustment (${updatedInvoice.invoiceNumber})`,
            referenceId: invoiceId
          }
        });
      }

      return updatedInvoice;
    }, {
      timeout: 30000 // Extended timeout for heavy rollback
    });
  }
}

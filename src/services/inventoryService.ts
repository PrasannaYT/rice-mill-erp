import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export class InventoryService {
  /**
   * Issues raw material to milling or sales from a specific godown using strict FIFO.
   */
  static async issueToMilling(
    productId: string, 
    godownId: string, 
    requestedQuantityStr: string, 
    userId: string,
    movementType: string = 'MILLING_ISSUE'
  ) {
    const requestedQty = new Decimal(requestedQuantityStr);
    if (requestedQty.lte(0)) throw new Error("Requested quantity must be positive");

    return prisma.$transaction(async (tx) => {
      // Fetch all active lots for this product in this godown, sorted by oldest first
      const activeLots = await tx.lot.findMany({
        where: {
          productId,
          godownId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'asc' }
      });

      let remainingToIssue = requestedQty;
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
        throw new Error(`Insufficient stock. Short by ${remainingToIssue.toNumber()} units.`);
      }

      // Log Movement
      await tx.stockMovement.create({
        data: {
          productId,
          fromGodownId: godownId,
          toGodownId: null,
          quantity: requestedQty.toNumber(),
          type: movementType,
          userId,
          referenceId: JSON.stringify(consumedLots)
        }
      });

      return consumedLots;
    });
  }

  /**
   * Converts Paddy into Rice products and transfers them to the Central Rice Storage Godown.
   * Deducts paddy input stock via FIFO and creates milled product lots grouped by Paddy Variety -> Output Type.
   */
  static async convertPaddyToRice({
    sourceGodownId,
    destinationGodownId,
    productId,
    paddyQuantityKg,
    milledOutputs,
    userId
  }: {
    sourceGodownId: string;
    destinationGodownId: string;
    productId: string;
    paddyQuantityKg: number;
    milledOutputs: Array<{ outputType: string; bagCapacityKg: number; numberOfBags: number; quantityKg: number }>;
    userId: string;
  }) {
    if (paddyQuantityKg <= 0) throw new Error("Paddy input quantity must be positive");
    if (!milledOutputs || milledOutputs.length === 0) throw new Error("At least one milled output row is required");

    return prisma.$transaction(async (tx) => {
      // 2. Fetch Paddy Product to extract variety name (e.g., "BPT Paddy" -> "BPT")
      const paddyProduct = await tx.product.findUnique({ where: { id: productId } });
      if (!paddyProduct) throw new Error("Selected Paddy product not found.");
      const varietyName = paddyProduct.name.replace(/paddy/i, '').trim() || paddyProduct.name;

      // 3. Issue Paddy Stock using FIFO from source godown
      const activeLots = await tx.lot.findMany({
        where: { productId, godownId: sourceGodownId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });

      let remainingToIssue = new Decimal(paddyQuantityKg);
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
        throw new Error(`Insufficient Paddy stock in source godown. Short by ${remainingToIssue.toNumber()} kg.`);
      }

      // Log movement for paddy issue
      await tx.stockMovement.create({
        data: {
          productId,
          fromGodownId: sourceGodownId,
          toGodownId: destinationGodownId,
          quantity: paddyQuantityKg,
          type: 'MILLING_ISSUE',
          userId,
          referenceId: JSON.stringify(consumedLots)
        }
      });

      // 4. Add milled outputs to Central Rice Storage Godown grouped by Paddy Variety -> Output Type
      for (const output of milledOutputs) {
        if (output.quantityKg <= 0) continue;

        // Format product name as: [Variety Name] - [Output Type] (e.g. "BPT - Fine Rice")
        const outputProductName = `${varietyName} - ${output.outputType}`;
        const isByproduct = output.outputType.toLowerCase().includes('bran') || output.outputType.toLowerCase().includes('husk');

        // Find or create product
        let product = await tx.product.findFirst({
          where: { name: { equals: outputProductName, mode: 'insensitive' } }
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: outputProductName,
              category: isByproduct ? 'BYPRODUCT' : 'FINISHED_GOOD',
              unit: 'KG',
              gstRate: 0
            }
          });
        }

        // Create lot in Central Rice Storage Godown
        await tx.lot.create({
          data: {
            productId: product.id,
            godownId: destinationGodownId,
            initialQuantity: output.quantityKg,
            currentQuantity: output.quantityKg,
            status: 'ACTIVE'
          }
        });

        // Log receipt movement for milled output
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            toGodownId: destinationGodownId,
            quantity: output.quantityKg,
            type: 'MILLING_RECEIPT',
            userId
          }
        });
      }

      // 5. Create a MillingSession record so it appears in the Reports
      let fineRiceQuantity = 0;
      let brokenRiceQuantity = 0;
      let branQuantity = 0;
      let huskQuantity = 0;

      for (const output of milledOutputs) {
        const type = output.outputType.toLowerCase();
        if (type.includes('fine') || type.includes('raw') || type.includes('black') || type.includes('mixed')) {
          fineRiceQuantity += output.quantityKg;
        } else if (type.includes('broken')) {
          brokenRiceQuantity += output.quantityKg;
        } else if (type.includes('bran')) {
          branQuantity += output.quantityKg;
        } else if (type.includes('husk')) {
          huskQuantity += output.quantityKg;
        } else {
          fineRiceQuantity += output.quantityKg;
        }
      }

      await tx.millingSession.create({
        data: {
          userId,
          inputProductId: productId,
          inputGodownId: sourceGodownId,
          inputQuantity: paddyQuantityKg,
          fineRiceGodownId: destinationGodownId,
          fineRiceQuantity,
          brokenRiceGodownId: destinationGodownId,
          brokenRiceQuantity,
          branGodownId: destinationGodownId,
          branQuantity,
          huskGodownId: destinationGodownId,
          huskQuantity,
          status: 'COMPLETED'
        }
      });

      return destinationGodownId;
    });
  }

  /**
   * Adds Opening Stock for Paddy without affecting supplier ledgers.
   */
  static async addOpeningStock({
    productId,
    godownId,
    numberOfBags,
    perBagWeight,
    ratePerBag,
    userId
  }: {
    productId: string;
    godownId: string;
    numberOfBags: number;
    perBagWeight: number;
    ratePerBag: number;
    userId: string;
  }) {
    const bags = new Decimal(numberOfBags);
    const weightPerBag = new Decimal(perBagWeight);
    const rateBag = new Decimal(ratePerBag);
    
    const totalWeight = bags.times(weightPerBag);
    const totalValue = bags.times(rateBag);
    const ratePerKg = totalWeight.gt(0) ? totalValue.dividedBy(totalWeight) : new Decimal(0);

    return prisma.$transaction(async (tx) => {
      // Find or create SYSTEM supplier for Opening Stock
      let systemSupplier = await tx.supplier.findFirst({
        where: { name: 'OPENING STOCK', category: 'SYSTEM' }
      });

      if (!systemSupplier) {
        systemSupplier = await tx.supplier.create({
          data: {
            name: 'OPENING STOCK',
            category: 'SYSTEM',
          }
        });
      }

      // Create a ProcurementBatch with FINALIZED status
      const batch = await tx.procurementBatch.create({
        data: {
          supplierId: systemSupplier.id,
          godownId,
          productId,
          grossWeight: totalWeight,
          netWeight: totalWeight,
          normalizedWeight: totalWeight,
          numberOfBags: bags,
          perBagWeight: weightPerBag,
          farmerBagRate: rateBag,
          ratePerKg: ratePerKg,
          totalPayable: totalValue,
          status: 'FINALIZED',
        }
      });

      // Create Lot
      const lot = await tx.lot.create({
        data: {
          productId,
          godownId,
          procurementId: batch.id,
          initialQuantity: totalWeight,
          currentQuantity: totalWeight,
          status: 'ACTIVE'
        }
      });

      // Log Movement
      await tx.stockMovement.create({
        data: {
          productId,
          toGodownId: godownId,
          quantity: totalWeight,
          type: 'OPENING_STOCK',
          userId,
          referenceId: lot.id
        }
      });

      return batch;
    });
  }
}

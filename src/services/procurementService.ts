import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export class ProcurementService {
  /**
   * Finalizes a procurement batch.
   * Calculates net weight, normalized weight, total payable.
   * Updates the batch status to FINALIZED.
   * Updates the supplier's balance.
   * Creates a LedgerEntry for the credit.
   */
  static async finalizeBatch(
    batchId: string, 
    tareWeightStr: string, 
    beforeDryingMoistureStr: string, 
    afterDryingMoistureStr: string,
    perBagWeightStr: string,
    farmerBagRateStr: string,
    brokerCommissionRateStr: string,
    transportFreightAmountStr: string,
    adminId: string
  ) {
    // 1. Fetch the draft batch (eager load vehicle to prevent subsequent lookups)
    const batch = await prisma.procurementBatch.findUnique({ 
      where: { id: batchId },
      include: { vehicle: true }
    });
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== 'DRAFT') throw new Error("Batch is not in DRAFT status");

    const tareWeight = new Decimal(tareWeightStr || "0");
    const beforeMoisture = new Decimal(beforeDryingMoistureStr || "0");
    const afterMoisture = new Decimal(afterDryingMoistureStr || "0");
    
    const perBagWeight = new Decimal(perBagWeightStr || "0");
    const farmerBagRate = new Decimal(farmerBagRateStr || "0");
    const brokerCommissionRate = new Decimal(brokerCommissionRateStr || "0");
    const transportFreightAmount = new Decimal(transportFreightAmountStr || "0");
    
    const grossWeight = new Decimal(Number(batch.grossWeight));
    const netWeight = grossWeight.minus(tareWeight);
    
    if (netWeight.lte(0)) {
      throw new Error("Net weight must be greater than zero");
    }

    // 2. Domain Logic: Bag Calculations
    const numberOfBags = netWeight.dividedBy(perBagWeight).toDecimalPlaces(2);
    
    const farmerTotalPayable = farmerBagRate.times(numberOfBags).toDecimalPlaces(2);
    const brokerCommissionTotal = brokerCommissionRate.times(numberOfBags).toDecimalPlaces(2);

    const ratePerKg = farmerTotalPayable.dividedBy(netWeight).toDecimalPlaces(2);
    
    // 3. Domain Logic: Moisture Shrinkage
    // Shortage = Net * ((Before - After) / (100 - After))
    let dryingShortage = new Decimal(0);
    if (beforeMoisture.greaterThan(afterMoisture)) {
      const numerator = beforeMoisture.minus(afterMoisture);
      const denominator = new Decimal(100).minus(afterMoisture);
      dryingShortage = netWeight.times(numerator.dividedBy(denominator)).toDecimalPlaces(2);
    }
    
    // Physical weight entering the godown
    const finalGodownWeight = netWeight.minus(dryingShortage);

    // 4. Database Transaction (Parallelized Mutations)
    return prisma.$transaction(async (tx) => {
      const promises: Promise<any>[] = [];

      // Update the Batch
      const updatedBatchPromise = tx.procurementBatch.update({
        where: { id: batchId },
        data: {
          tareWeight: tareWeight.toNumber(),
          netWeight: netWeight.toNumber(),
          beforeDryingMoisture: beforeMoisture.toNumber(),
          afterDryingMoisture: afterMoisture.toNumber(),
          dryingShortage: dryingShortage.toNumber(),
          ratePerKg: ratePerKg.toNumber(),
          totalPayable: farmerTotalPayable.toNumber(),
          
          numberOfBags: numberOfBags.toNumber(),
          perBagWeight: perBagWeight.toNumber(),
          farmerBagRate: farmerBagRate.toNumber(),
          farmerTotalPayable: farmerTotalPayable.toNumber(),
          brokerCommissionRate: brokerCommissionRate.toNumber(),
          brokerCommissionTotal: brokerCommissionTotal.toNumber(),
          transportFreightAmount: transportFreightAmount.toNumber(),
          
          status: 'FINALIZED',
        }
      });
      promises.push(updatedBatchPromise);

      if (batch.farmerId) {
        // Update the Farmer Balance
        promises.push(tx.farmer.update({
          where: { id: batch.farmerId },
          data: { balance: { increment: farmerTotalPayable.toNumber() } }
        }));

        // Create Ledger Entry for Farmer
        promises.push(tx.ledgerEntry.create({
          data: {
            farmerId: batch.farmerId,
            transactionType: 'CREDIT',
            amount: farmerTotalPayable.toNumber(),
            description: `Paddy Procurement (Bags: ${numberOfBags.toNumber()} @ ₹${farmerBagRate.toNumber()}/bag)`,
            referenceId: batch.id,
          }
        }));
      } else {
        // Update the Supplier (Broker) Balance for Paddy Cost if no farmer is specified
        promises.push(tx.supplier.update({
          where: { id: batch.supplierId },
          data: { balance: { increment: farmerTotalPayable.toNumber() } }
        }));

        promises.push(tx.ledgerEntry.create({
          data: {
            supplierId: batch.supplierId,
            transactionType: 'CREDIT',
            amount: farmerTotalPayable.toNumber(),
            description: `Paddy Procurement (No Farmer specified) (Bags: ${numberOfBags.toNumber()} @ ₹${farmerBagRate.toNumber()}/bag)`,
            referenceId: batch.id,
          }
        }));
      }

      // Update the Broker (Supplier) Balance for Commission
      promises.push(tx.supplier.update({
        where: { id: batch.supplierId },
        data: { balance: { increment: brokerCommissionTotal.toNumber() } }
      }));

      // Create Ledger Entry for Broker Commission
      promises.push(tx.ledgerEntry.create({
        data: {
          supplierId: batch.supplierId,
          transactionType: 'CREDIT',
          amount: brokerCommissionTotal.toNumber(),
          description: `Broker Commission (Bags: ${numberOfBags.toNumber()} @ ₹${brokerCommissionRate.toNumber()}/bag)`,
          referenceId: batch.id,
        }
      }));
      
      // Update Vehicle Freight Commission if third-party vehicle is used
      if (transportFreightAmount.greaterThan(0) && batch.vehicle && batch.vehicle.ownershipType === 'THIRD_PARTY') {
        promises.push(tx.vehicle.update({
          where: { id: batch.vehicle.id },
          data: { balance: { increment: transportFreightAmount.toNumber() } }
        }));
        
        promises.push(tx.ledgerEntry.create({
          data: {
            vehicleId: batch.vehicle.id,
            transactionType: 'CREDIT',
            amount: transportFreightAmount.toNumber(),
            description: `Inward Freight Commission (Batch ${batch.id})`,
            referenceId: batch.id,
          }
        }));
      }

      if (batch.productId && batch.godownId) {
        // Create Initial Lot for Inventory
        promises.push(tx.lot.create({
          data: {
            productId: batch.productId,
            godownId: batch.godownId,
            procurementId: batch.id,
            initialQuantity: finalGodownWeight.toNumber(),
            currentQuantity: finalGodownWeight.toNumber(),
            dryingShortage: dryingShortage.toNumber(),
            status: 'ACTIVE'
          }
        }));

        // Create Stock Movement
        promises.push(tx.stockMovement.create({
          data: {
            productId: batch.productId,
            toGodownId: batch.godownId,
            quantity: finalGodownWeight.toNumber(),
            type: 'PROCUREMENT',
            referenceId: batch.id,
            userId: adminId
          }
        }));
      }

      // Audit Log
      promises.push(tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'FINALIZE_BATCH',
          entity: 'ProcurementBatch',
          entityId: batch.id,
          afterState: JSON.stringify({ farmerTotalPayable: farmerTotalPayable.toNumber(), dryingShortage: dryingShortage.toNumber() })
        }
      }));

      const [updatedBatch] = await Promise.all(promises);
      return updatedBatch;
    });
  }

  static async cancelBatch(batchId: string, adminId: string) {
    const batch = await prisma.procurementBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== 'DRAFT') throw new Error("Only pending drafts can be cancelled");

    return prisma.$transaction(async (tx) => {
      await tx.procurementBatch.delete({
        where: { id: batchId }
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DELETE',
          entity: 'ProcurementBatch',
          entityId: batchId,
          beforeState: JSON.stringify({ message: 'Cancelled draft procurement ticket.' })
        }
      });
    });
  }
}

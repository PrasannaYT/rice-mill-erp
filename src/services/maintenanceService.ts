import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export type MaintenanceInput = {
  assetId: string;
  type: 'FUEL' | 'OIL' | 'REPAIR' | 'SERVICE';
  cost: string;
  downtimeHrs?: string;
  notes?: string;
  expenseCategoryId?: string;
  bankId?: string;
  userId: string;
};

export class MaintenanceService {
  static async logMaintenance(data: MaintenanceInput) {
    const cost = new Decimal(data.cost);
    if (cost.lt(0)) throw new Error("Cost cannot be negative");

    return prisma.$transaction(async (tx) => {
      // 1. Log the Maintenance Record
      const log = await tx.maintenanceLog.create({
        data: {
          assetId: data.assetId,
          type: data.type,
          cost: cost.toNumber(),
          downtimeHrs: data.downtimeHrs ? new Decimal(data.downtimeHrs).toNumber() : 0,
          notes: data.notes
        }
      });

      // 2. If it was a paid expense, route it to Accounting Cashbook automatically
      if (cost.gt(0) && data.expenseCategoryId && data.bankId) {
        await tx.paymentTransaction.create({
          data: {
            type: 'PAYMENT',
            mode: 'BANK', // Assuming bank for simplicity, but could be parameter
            amount: cost.toNumber(),
            referenceNumber: `Maint-${log.id}`,
            expenseCategoryId: data.expenseCategoryId,
            bankId: data.bankId,
            notes: `Auto-generated from Maintenance Log: ${data.notes || data.type}`,
            userId: data.userId
          }
        });

        // Decrement Bank Balance
        await tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: cost.toNumber() } }
        });
      }

      return log;
    });
  }
}

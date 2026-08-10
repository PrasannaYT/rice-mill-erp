import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export type LaborWageInput = {
  laborerId: string;
  workType?: string;
  quantity?: string; // Optional if providing flat wage
  rate?: string;     // Optional if providing flat wage
  totalWage?: string;
};

export class PayrollService {
  static async recordWage(data: LaborWageInput) {
    let finalWage = new Decimal(0);

    if (data.quantity && data.rate) {
      finalWage = new Decimal(data.quantity).times(new Decimal(data.rate));
    } else if (data.totalWage) {
      finalWage = new Decimal(data.totalWage);
    } else {
      throw new Error("Must provide either (quantity & rate) or (totalWage)");
    }

    if (finalWage.lte(0)) throw new Error("Wage must be positive");

    return prisma.$transaction(async (tx) => {
      // 1. Create Wage Record
      const wage = await tx.laborWage.create({
        data: {
          laborerId: data.laborerId,
          workType: data.workType || 'General Work',
          quantity: data.quantity ? new Decimal(data.quantity).toNumber() : null,
          rate: data.rate ? new Decimal(data.rate).toNumber() : null,
          totalWage: finalWage.toNumber(),
          status: 'UNPAID'
        }
      });

      // 2. Increment Laborer Ledger Balance (We owe them)
      await tx.laborer.update({
        where: { id: data.laborerId },
        data: { balance: { increment: finalWage.toNumber() } }
      });

      return wage;
    });
  }
}

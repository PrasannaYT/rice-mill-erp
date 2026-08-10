import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export class DepreciationService {
  /**
   * Calculates and logs annual Straight Line Method (SLM) Depreciation for all Assets.
   * This is typically run via a CRON job at the end of the financial year.
   */
  static async processAnnualDepreciation(userId: string) {
    const assets = await prisma.asset.findMany();
    
    // Find or create a specific ExpenseCategory for Depreciation to keep P&L clean
    let depCategory = await prisma.expenseCategory.findFirst({
      where: { name: 'Depreciation (Non-Cash)' }
    });

    if (!depCategory) {
      depCategory = await prisma.expenseCategory.create({
        data: {
          name: 'Depreciation (Non-Cash)',
          description: 'System generated SLM depreciation.'
        }
      });
    }

    let totalDepreciation = new Decimal(0);

    await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        const purchasePrice = new Decimal(Number(asset.purchasePrice));
        const rate = new Decimal(Number(asset.depreciationRate));
        
        // SLM Formula: Annual Depreciation = Purchase Price * (Rate / 100)
        // (In a real system, you'd prorate this based on purchaseDate if bought mid-year)
        const annualDep = purchasePrice.times(rate).dividedBy(100);
        
        if (annualDep.gt(0)) {
          // Log it as an expense to hit the P&L (but don't touch the Bank since it's non-cash)
          await tx.paymentTransaction.create({
            data: {
              type: 'PAYMENT',
              mode: 'CASH', // Non-cash, but we need a valid enum. We'll use CASH + Notes to identify
              amount: annualDep.toNumber(),
              expenseCategoryId: depCategory.id,
              notes: `Automatic SLM Depreciation (10%) for ${asset.name} (${asset.type})`,
              userId: userId
            }
          });
          totalDepreciation = totalDepreciation.plus(annualDep);
        }
      }
    });

    return totalDepreciation.toNumber();
  }
}

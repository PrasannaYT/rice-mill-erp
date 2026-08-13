import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class PersonalDebtRepository {
  static async createLoan(data: {
    lenderName: string;
    loanType: string;
    principalAmount: Prisma.Decimal | number;
    interestRate: Prisma.Decimal | number;
    tenureMonths: number;
    startDate: Date;
    isPrivate: boolean;
  }) {
    return prisma.personalLoan.create({
      data,
    });
  }

  static async listLoans() {
    return prisma.personalLoan.findMany({
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getLoanById(id: string) {
    return prisma.personalLoan.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });
  }

  static async recordTransaction(data: {
    loanId: string;
    paymentDate: Date;
    amountPaid: Prisma.Decimal | number;
    principalComponent: Prisma.Decimal | number;
    interestComponent: Prisma.Decimal | number;
    paymentType: 'EMI' | 'PREPAYMENT';
  }) {
    return prisma.personalLoanTransaction.create({
      data,
    });
  }
}

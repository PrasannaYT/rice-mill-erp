import { PrismaClient } from '@prisma/client';

const modelsWithSoftDelete = [
  'User', 'Supplier', 'Farmer', 'Customer', 'Product', 'Godown',
  'PackingItem', 'Vehicle', 'Laborer', 'Bank', 'ExpenseCategory',
  'ProcurementBatch', 'LedgerEntry', 'Lot', 'StockMovement',
  'MillingSession', 'SalesInvoice', 'SalesInvoiceItem', 'PaymentTransaction',
  'LaborWage', 'Asset', 'MaintenanceLog', 'SparePart', 'SpareAssignment',
  'ScrapEntry', 'PersonalLoan', 'PersonalLoanTransaction'
];

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (modelsWithSoftDelete.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (modelsWithSoftDelete.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (modelsWithSoftDelete.includes(model) && result && (result as any).deletedAt) {
            return null;
          }
          return result;
        },
        async count({ model, args, query }) {
          if (modelsWithSoftDelete.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (modelsWithSoftDelete.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (modelsWithSoftDelete.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        }
      }
    }
  }) as unknown as PrismaClient; // Cast to original PrismaClient to avoid massive type footprint issues in Next.js
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

globalThis.prismaGlobal = prisma;

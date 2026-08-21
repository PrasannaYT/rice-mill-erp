import { PrismaClient } from '@prisma/client';

const modelsWithSoftDelete = new Set([
  'User', 'Supplier', 'Farmer', 'Customer', 'Product', 'Godown',
  'PackingItem', 'Vehicle', 'Laborer', 'Bank', 'ExpenseCategory',
  'ProcurementBatch', 'LedgerEntry', 'Lot', 'StockMovement',
  'MillingSession', 'SalesInvoice', 'SalesInvoiceItem', 'PaymentTransaction',
  'LaborWage', 'Asset', 'MaintenanceLog', 'SparePart', 'SpareAssignment',
  'ScrapEntry', 'PersonalLoan', 'PersonalLoanTransaction'
]);

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              return await query(args);
            } catch (err2) {
              console.error(`Prisma findMany query failed on ${model}:`, err2);
              return [];
            }
          }
        },
        async findFirst({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              return await query(args);
            } catch (err2) {
              console.error(`Prisma findFirst query failed on ${model}:`, err2);
              return null;
            }
          }
        },
        async findUnique({ model, args, query }) {
          try {
            const result = await query(args);
            if (modelsWithSoftDelete.has(model) && result && (result as any).deletedAt) {
              return null;
            }
            return result;
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              const result = await query(args);
              if (modelsWithSoftDelete.has(model) && result && (result as any).deletedAt) {
                return null;
              }
              return result;
            } catch (err2) {
              console.error(`Prisma findUnique query failed on ${model}:`, err2);
              return null;
            }
          }
        },
        async count({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              return await query(args);
            } catch {
              return 0;
            }
          }
        },
        async aggregate({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              return await query(args);
            } catch {
              return {};
            }
          }
        },
        async groupBy({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            await new Promise(r => setTimeout(r, 100));
            try {
              return await query(args);
            } catch {
              return [];
            }
          }
        }
      }
    }
  }) as unknown as PrismaClient;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

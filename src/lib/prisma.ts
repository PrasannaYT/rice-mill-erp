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
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              return await query(args).catch(() => []);
            }
            return [];
          }
        },
        async findFirst({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              return await query(args).catch(() => null);
            }
            return null;
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
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              const result = await query(args).catch(() => null);
              if (modelsWithSoftDelete.has(model) && result && (result as any).deletedAt) {
                return null;
              }
              return result;
            }
            return null;
          }
        },
        async count({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              return await query(args).catch(() => 0);
            }
            return 0;
          }
        },
        async aggregate({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              return await query(args).catch(() => ({}));
            }
            return {};
          }
        },
        async groupBy({ model, args, query }) {
          if (modelsWithSoftDelete.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          try {
            return await query(args);
          } catch (err: any) {
            if (err?.message?.includes('timed out') || err?.code === 'P2024' || err?.code === 'P1001') {
              await new Promise(r => setTimeout(r, 150));
              return await query(args).catch(() => []);
            }
            return [];
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

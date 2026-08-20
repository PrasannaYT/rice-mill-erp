import prisma from '@/lib/prisma';
import { type Prisma } from '@prisma/client';
import { withMemoryCache, invalidateCache } from '@/lib/memoryCache';

export class SupplierRepository {
  static async create(data: Prisma.SupplierCreateInput) {
    const res = await prisma.supplier.create({ data });
    invalidateCache('supplier');
    return res;
  }

  static async list() {
    return withMemoryCache('supplier_list', () =>
      prisma.supplier.findMany({ take: 1000, orderBy: { name: 'asc' } })
    );
  }

  static async count() {
    return withMemoryCache('supplier_count', () => prisma.supplier.count());
  }

  static async update(id: string, data: Prisma.SupplierUpdateInput) {
    const res = await prisma.supplier.update({ where: { id }, data });
    invalidateCache('supplier');
    return res;
  }

  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      const childFarmers = await tx.farmer.findMany({ take: 1000, where: { brokerId: id }, select: { id: true } });
      const childFarmerIds = childFarmers.map(f => f.id);

      if (childFarmerIds.length > 0) {
        await tx.ledgerEntry.deleteMany({ where: { farmerId: { in: childFarmerIds } } });
        await tx.procurementBatch.updateMany({ where: { farmerId: { in: childFarmerIds } }, data: { farmerId: null } });
        await tx.farmer.deleteMany({ where: { brokerId: id } });
      }

      await tx.ledgerEntry.deleteMany({ where: { supplierId: id } });
      await tx.paymentTransaction.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
      await tx.procurementBatch.deleteMany({ where: { supplierId: id } });

      return tx.supplier.delete({ where: { id } });
    });
    invalidateCache('supplier');
    return res;
  }
}

export class CustomerRepository {
  static async create(data: Prisma.CustomerCreateInput) {
    const res = await prisma.customer.create({ data });
    invalidateCache('customer');
    return res;
  }

  static async list() {
    return withMemoryCache('customer_list', () =>
      prisma.customer.findMany({ take: 1000, orderBy: { name: 'asc' } })
    );
  }

  static async count() {
    return withMemoryCache('customer_count', () => prisma.customer.count());
  }

  static async update(id: string, data: Prisma.CustomerUpdateInput) {
    const res = await prisma.customer.update({ where: { id }, data });
    invalidateCache('customer');
    return res;
  }

  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { customerId: id } });
      await tx.paymentTransaction.updateMany({ where: { customerId: id }, data: { customerId: null } });
      await tx.salesInvoiceItem.deleteMany({ where: { invoice: { customerId: id } } });
      await tx.salesInvoice.deleteMany({ where: { customerId: id } });
      return tx.customer.delete({ where: { id } });
    });
    invalidateCache('customer');
    return res;
  }
}

export class ProductRepository {
  static async create(data: Prisma.ProductCreateInput) {
    const res = await prisma.product.create({ data });
    invalidateCache('product');
    return res;
  }

  static async list() {
    return withMemoryCache('product_list', () =>
      prisma.product.findMany({ take: 1000, orderBy: { name: 'asc' } })
    );
  }

  static async count() {
    return withMemoryCache('product_count', () => prisma.product.count());
  }

  static async update(id: string, data: Prisma.ProductUpdateInput) {
    const res = await prisma.product.update({ where: { id }, data });
    invalidateCache('product');
    return res;
  }

  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({ where: { productId: id } });
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.lot.deleteMany({ where: { productId: id } });
      await tx.procurementBatch.updateMany({ where: { productId: id }, data: { productId: null } });
      return tx.product.delete({ where: { id } });
    });
    invalidateCache('product');
    return res;
  }
}

export class GodownRepository {
  static async create(data: Prisma.GodownCreateInput) {
    const res = await prisma.godown.create({ data });
    invalidateCache('godown');
    return res;
  }
  static async list() {
    return withMemoryCache('godown_list', () =>
      prisma.godown.findMany({ take: 1000, orderBy: { name: 'asc' } })
    );
  }
  static async count() {
    return withMemoryCache('godown_count', () => prisma.godown.count());
  }
  static async update(id: string, data: Prisma.GodownUpdateInput) {
    const res = await prisma.godown.update({ where: { id }, data });
    invalidateCache('godown');
    return res;
  }
  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({ where: { godownId: id } });
      await tx.stockMovement.deleteMany({ where: { OR: [{ fromGodownId: id }, { toGodownId: id }] } });
      await tx.lot.deleteMany({ where: { godownId: id } });
      await tx.procurementBatch.updateMany({ where: { godownId: id }, data: { godownId: null } });
      
      const packingItems = await tx.packingItem.findMany({ where: { godownId: id } });
      const packingItemIds = packingItems.map(p => p.id);
      if (packingItemIds.length > 0) {
        await tx.paymentTransaction.updateMany({ where: { packingItemId: { in: packingItemIds } }, data: { packingItemId: null } });
        await tx.packingItem.deleteMany({ where: { godownId: id } });
      }
      
      return tx.godown.delete({ where: { id } });
    });
    invalidateCache('godown');
    return res;
  }
}

export class VehicleRepository {
  static async create(data: Prisma.VehicleCreateInput) {
    const res = await prisma.vehicle.create({ data });
    invalidateCache('vehicle');
    return res;
  }
  static async list() {
    return withMemoryCache('vehicle_list', () =>
      prisma.vehicle.findMany({ take: 1000, orderBy: { licensePlate: 'asc' } })
    );
  }
  static async count() {
    return withMemoryCache('vehicle_count', () => prisma.vehicle.count());
  }
  static async update(id: string, data: Prisma.VehicleUpdateInput) {
    const res = await prisma.vehicle.update({ where: { id }, data });
    invalidateCache('vehicle');
    return res;
  }
  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.salesInvoice.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
      await tx.procurementBatch.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
      return tx.vehicle.delete({ where: { id } });
    });
    invalidateCache('vehicle');
    return res;
  }
}

export class BankRepository {
  static async create(data: Prisma.BankCreateInput) {
    const res = await prisma.bank.create({ data });
    invalidateCache('bank');
    return res;
  }
  static async list() {
    return withMemoryCache('bank_list', () =>
      prisma.bank.findMany({ take: 1000, orderBy: { bankName: 'asc' } })
    );
  }
  static async count() {
    return withMemoryCache('bank_count', () => prisma.bank.count());
  }
  static async update(id: string, data: Prisma.BankUpdateInput) {
    const res = await prisma.bank.update({ where: { id }, data });
    invalidateCache('bank');
    return res;
  }
  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.updateMany({ where: { bankId: id }, data: { bankId: null } });
      return tx.bank.delete({ where: { id } });
    });
    invalidateCache('bank');
    return res;
  }
}

export class LaborerRepository {
  static async create(data: { name: string; contact?: string | null; type: string }) {
    const res = await prisma.laborer.create({ data });
    invalidateCache('laborer');
    return res;
  }
  static async list() {
    return withMemoryCache('laborer_list', () =>
      prisma.laborer.findMany({ take: 1000, orderBy: { name: 'asc' } })
    );
  }
  static async count() {
    return withMemoryCache('laborer_count', () => prisma.laborer.count());
  }
  static async update(id: string, data: Prisma.LaborerUpdateInput) {
    const res = await prisma.laborer.update({ where: { id }, data });
    invalidateCache('laborer');
    return res;
  }
  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.laborWage.deleteMany({ where: { laborerId: id } });
      return tx.laborer.delete({ where: { id } });
    });
    invalidateCache('laborer');
    return res;
  }
}

export class FarmerRepository {
  static async list() {
    return withMemoryCache('farmer_list', () =>
      prisma.farmer.findMany({ take: 1000, include: { broker: true }, orderBy: { createdAt: 'desc' } })
    );
  }

  static async create(data: { name: string; contact?: string | null; village?: string | null; brokerId: string }) {
    const res = await prisma.farmer.create({ data });
    invalidateCache('farmer');
    return res;
  }

  static async count() {
    return withMemoryCache('farmer_count', () => prisma.farmer.count());
  }

  static async update(id: string, data: Prisma.FarmerUpdateInput) {
    const res = await prisma.farmer.update({ where: { id }, data });
    invalidateCache('farmer');
    return res;
  }

  static async delete(id: string) {
    const res = await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { farmerId: id } });
      await tx.procurementBatch.updateMany({ where: { farmerId: id }, data: { farmerId: null } });
      return tx.farmer.delete({ where: { id } });
    });
    invalidateCache('farmer');
    return res;
  }
}

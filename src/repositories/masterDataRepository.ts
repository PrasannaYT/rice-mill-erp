import prisma from '@/lib/prisma';
import { type Prisma } from '@prisma/client';

export class SupplierRepository {
  static async create(data: Prisma.SupplierCreateInput) {
    return prisma.supplier.create({ data });
  }

  static async list() {
    return prisma.supplier.findMany({ take: 1000, orderBy: { name: 'asc' } });
  }

  static async count() {
    return prisma.supplier.count();
  }

  static async update(id: string, data: Prisma.SupplierUpdateInput) {
    return prisma.supplier.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // Delete or disassociate child farmers and references
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
  }
}

export class CustomerRepository {
  static async create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({ data });
  }

  static async list() {
    return prisma.customer.findMany({ take: 1000, orderBy: { name: 'asc' } });
  }

  static async count() {
    return prisma.customer.count();
  }

  static async update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { customerId: id } });
      await tx.paymentTransaction.updateMany({ where: { customerId: id }, data: { customerId: null } });
      await tx.salesInvoiceItem.deleteMany({ where: { invoice: { customerId: id } } });
      await tx.salesInvoice.deleteMany({ where: { customerId: id } });
      return tx.customer.delete({ where: { id } });
    });
  }
}

export class ProductRepository {
  static async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  }

  static async list() {
    return prisma.product.findMany({ take: 1000, orderBy: { name: 'asc' } });
  }

  static async count() {
    return prisma.product.count();
  }

  static async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({ where: { productId: id } });
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.lot.deleteMany({ where: { productId: id } });
      await tx.procurementBatch.updateMany({ where: { productId: id }, data: { productId: null } });
      return tx.product.delete({ where: { id } });
    });
  }
}

export class GodownRepository {
  static async create(data: Prisma.GodownCreateInput) {
    return prisma.godown.create({ data });
  }
  static async list() {
    return prisma.godown.findMany({ take: 1000, orderBy: { name: 'asc' } });
  }
  static async count() {
    return prisma.godown.count();
  }
  static async update(id: string, data: Prisma.GodownUpdateInput) {
    return prisma.godown.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
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
  }
}

export class VehicleRepository {
  static async create(data: Prisma.VehicleCreateInput) {
    return prisma.vehicle.create({ data });
  }
  static async list() {
    return prisma.vehicle.findMany({ take: 1000, orderBy: { licensePlate: 'asc' } });
  }
  static async count() {
    return prisma.vehicle.count();
  }
  static async update(id: string, data: Prisma.VehicleUpdateInput) {
    return prisma.vehicle.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.salesInvoice.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
      await tx.procurementBatch.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
      return tx.vehicle.delete({ where: { id } });
    });
  }
}



export class BankRepository {
  static async create(data: Prisma.BankCreateInput) {
    return prisma.bank.create({ data });
  }
  static async list() {
    return prisma.bank.findMany({ take: 1000, orderBy: { bankName: 'asc' } });
  }
  static async count() {
    return prisma.bank.count();
  }
  static async update(id: string, data: Prisma.BankUpdateInput) {
    return prisma.bank.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.updateMany({ where: { bankId: id }, data: { bankId: null } });
      return tx.bank.delete({ where: { id } });
    });
  }
}

export class LaborerRepository {
  static async create(data: { name: string; contact?: string | null; type: string }) {
    return prisma.laborer.create({ data });
  }
  static async list() {
    return prisma.laborer.findMany({ take: 1000, orderBy: { name: 'asc' } });
  }
  static async count() {
    return prisma.laborer.count();
  }
  static async update(id: string, data: Prisma.LaborerUpdateInput) {
    return prisma.laborer.update({ where: { id }, data });
  }
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.laborWage.deleteMany({ where: { laborerId: id } });
      return tx.laborer.delete({ where: { id } });
    });
  }
}

export class FarmerRepository {
  static async list() {
    return prisma.farmer.findMany({ take: 1000, include: { broker: true },
      orderBy: { createdAt: 'desc' } 
    });
  }

  static async create(data: { name: string; contact?: string | null; village?: string | null; brokerId: string }) {
    return prisma.farmer.create({ data });
  }

  static async count() {
    return prisma.farmer.count();
  }

  static async update(id: string, data: Prisma.FarmerUpdateInput) {
    return prisma.farmer.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { farmerId: id } });
      await tx.procurementBatch.updateMany({ where: { farmerId: id }, data: { farmerId: null } });
      return tx.farmer.delete({ where: { id } });
    });
  }
}

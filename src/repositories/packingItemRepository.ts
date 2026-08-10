import prisma from '@/lib/prisma';

export class PackingItemRepository {
  static async create(data: {
    brandName: string;
    capacityKg: number;
    quantityBags: number;
    perBagRate: number;
    godownId: string;
    supplierId?: string | null;
    hsnCode?: string | null;
    status?: string;
  }) {
    return prisma.packingItem.create({
      data: {
        brandName: data.brandName,
        capacityKg: data.capacityKg,
        quantityBags: data.quantityBags,
        perBagRate: data.perBagRate,
        godownId: data.godownId,
        supplierId: data.supplierId || null,
        hsnCode: data.hsnCode || null,
        status: data.status || 'PAID',
      },
    });
  }

  static async list(options?: { status?: string }) {
    return prisma.packingItem.findMany({ take: 1000, where: options?.status ? { status: options.status } : undefined,
      include: {
        godown: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async update(id: string, data: {
    brandName?: string;
    capacityKg?: number;
    quantityBags?: number;
    perBagRate?: number;
    godownId?: string;
    supplierId?: string | null;
    hsnCode?: string | null;
    status?: string;
  }) {
    return prisma.packingItem.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.packingItem.delete({
      where: { id },
    });
  }
}

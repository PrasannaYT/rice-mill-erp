import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';
import { unstable_cache } from 'next/cache';

export class ReportService {
  static async generatePnL() {
    // Run all three independent aggregate queries in parallel
    const [sales, purchases, wages] = await Promise.all([
      prisma.salesInvoice.aggregate({
        _sum: { subtotal: true },
        where: { status: { not: 'DRAFT' } },
      }),
      prisma.procurementBatch.aggregate({
        _sum: { totalPayable: true },
      }),
      prisma.laborWage.aggregate({
        _sum: { totalWage: true },
      }),
    ]);

    const revenue = new Decimal(sales._sum.subtotal || 0);
    const procurementCost = new Decimal(purchases._sum.totalPayable || 0);
    const laborCost = new Decimal(wages._sum.totalWage || 0);

    const cogs = procurementCost.plus(laborCost);
    const grossProfit = revenue.minus(cogs);
    const netProfit = grossProfit;
    const margin = revenue.gt(0)
      ? netProfit.dividedBy(revenue).times(100)
      : new Decimal(0);

    return {
      revenue: revenue.toNumber(),
      cogs: {
        procurement: procurementCost.toNumber(),
        labor: laborCost.toNumber(),
        total: cogs.toNumber(),
      },
      grossProfit: grossProfit.toNumber(),
      netProfit: netProfit.toNumber(),
      netMarginPercentage: margin.toNumber(),
    };
  }

  /**
   * Heavy analytics function — fetches 100% live data directly from database via parallel Promise.all.
   */
  static async getAdvancedAnalytics() {
    return ReportService._getAdvancedAnalyticsRaw();
  }

  /**
   * Raw (uncached) implementation. All 9 independent top-level Prisma queries are
   * fanned out in parallel via Promise.all, reducing total latency from
   * Σ(query times) to max(query times).
   */
  static async _getAdvancedAnalyticsRaw() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // ─── Fan-out: all independent queries run in parallel ────────────────────
    const [
      millingAgg,
      expenseCategories,
      unpaidInvoices,
      batches,
      lots,
      vehicles,
      brokerCommissions,
      salesVelocityRaw,
      hamaliAgg,
      monthlySalesRaw,
      paymentModes,
      millingCount,
      laborWorkTypes,
      packingItems,
      spares,
    ] = await Promise.all([
      // 1. Yield analysis
      prisma.millingSession.aggregate({
        where: { status: 'COMPLETED' },
        _sum: {
          inputQuantity: true,
          fineRiceQuantity: true,
          brokenRiceQuantity: true,
          branQuantity: true,
          huskQuantity: true,
        },
      }),

      // 2. Expense breakdown
      prisma.expenseCategory.findMany({
        include: {
          payments: {
            where: { type: 'PAYMENT' },
            select: { amount: true },
          },
        },
      }),

      // 3. AR Aging
      prisma.salesInvoice.findMany({
        where: { status: { in: ['DRAFT', 'FINALIZED', 'PARTIALLY_PAID'] } },
        include: { customer: true },
      }),

      // 4. Supplier pricing trends
      prisma.procurementBatch.findMany({
        where: { status: { not: 'DRAFT' }, ratePerKg: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, ratePerKg: true },
      }),

      // 5. Inventory valuation
      prisma.lot.findMany({
        where: { currentQuantity: { gt: 0 } },
        include: { product: true, godown: true },
      }),

      // 6. Vehicle profitability
      prisma.vehicle.findMany({
        include: {
          invoices: { select: { transportFreightAmount: true } },
          payments: { select: { amount: true } },
        },
      }),

      // 7. Broker commissions
      prisma.procurementBatch.groupBy({
        by: ['farmerId'],
        _sum: { brokerCommissionTotal: true },
        where: { farmerId: { not: null }, brokerCommissionTotal: { gt: 0 } },
      }),

      // 8. Sales velocity
      prisma.salesInvoiceItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // 9. Hamali efficiency
      Promise.all([
        prisma.laborWage.aggregate({ _sum: { totalWage: true } }),
        prisma.salesInvoiceItem.aggregate({ _sum: { quantity: true } }),
        prisma.procurementBatch.aggregate({ _sum: { netWeight: true } }),
      ]),

      // 10. Monthly sales trend (last 6 months)
      prisma.salesInvoice.findMany({
        where: {
          status: { not: 'DRAFT' },
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
        },
        select: { createdAt: true, subtotal: true, grandTotal: true },
        orderBy: { createdAt: 'asc' },
      }),

      // 11. Payment mode breakdown
      prisma.paymentTransaction.groupBy({
        by: ['mode'],
        _sum: { amount: true },
        where: { type: 'RECEIPT' },
      }),

      // 12. Milling session count
      prisma.millingSession.count({ where: { status: 'COMPLETED' } }),

      // 13. Labor work type breakdown
      prisma.laborWage.groupBy({
        by: ['workType'],
        _sum: { totalWage: true },
      }),

      // 14. Packing Items
      prisma.packingItem.findMany({
        where: { quantityBags: { gt: 0 } },
        include: { godown: true }
      }),

      // 15. Spare Parts
      prisma.sparePart.findMany({
        where: { availableQty: { gt: 0 } }
      })
    ]);

    // ─── 1. Yield Analytics ──────────────────────────────────────────────────
    const totalPaddy = new Decimal(millingAgg._sum.inputQuantity || 0);
    const totalFine = new Decimal(millingAgg._sum.fineRiceQuantity || 0);
    const totalBroken = new Decimal(millingAgg._sum.brokenRiceQuantity || 0);
    const totalBran = new Decimal(millingAgg._sum.branQuantity || 0);
    const totalHusk = new Decimal(millingAgg._sum.huskQuantity || 0);

    const yieldAnalytics = totalPaddy.gt(0)
      ? [
          { name: 'Fine Rice', value: totalFine.dividedBy(totalPaddy).times(100).toNumber(), color: '#10b981' },
          { name: 'Broken Rice', value: totalBroken.dividedBy(totalPaddy).times(100).toNumber(), color: '#f59e0b' },
          { name: 'Bran', value: totalBran.dividedBy(totalPaddy).times(100).toNumber(), color: '#f97316' },
          {
            name: 'Husk & Shortage',
            value: totalHusk
              .plus(totalPaddy.minus(totalFine).minus(totalBroken).minus(totalBran).minus(totalHusk))
              .dividedBy(totalPaddy)
              .times(100)
              .toNumber(),
            color: '#94a3b8',
          },
        ]
      : [];

    // ─── 2. Expense Breakdown ────────────────────────────────────────────────
    const expenseBreakdown = expenseCategories
      .map(cat => ({
        name: cat.name,
        value: cat.payments.reduce((acc, p) => acc.plus(p.amount), new Decimal(0)).toNumber(),
      }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value);

    // ─── 3. AR Aging ─────────────────────────────────────────────────────────
    let currentDue = new Decimal(0);
    let thirtyToSixtyDue = new Decimal(0);
    let sixtyPlusDue = new Decimal(0);

    const arAging = unpaidInvoices
      .map(inv => {
        const due = new Decimal(inv.grandTotal).minus(inv.amountPaid);
        if (due.lte(0)) return null;

        const invDate = new Date(inv.createdAt);
        const ageDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

        if (invDate >= thirtyDaysAgo) {
          currentDue = currentDue.plus(due);
        } else if (invDate >= sixtyDaysAgo) {
          thirtyToSixtyDue = thirtyToSixtyDue.plus(due);
        } else {
          sixtyPlusDue = sixtyPlusDue.plus(due);
        }

        return {
          customer: inv.customer.name,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt.toISOString().split('T')[0],
          dueAmount: due.toNumber(),
          ageDays,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.dueAmount - a.dueAmount);

    const arSummary = [
      { name: '0-30 Days', value: currentDue.toNumber() },
      { name: '31-60 Days', value: thirtyToSixtyDue.toNumber() },
      { name: '60+ Days', value: sixtyPlusDue.toNumber() },
    ];

    // ─── 4. Supplier Pricing Trends ──────────────────────────────────────────
    const priceMap = new Map<string, { totalRate: Decimal; count: number }>();
    for (const b of batches) {
      const month = b.createdAt.toISOString().slice(0, 7);
      const current = priceMap.get(month) || { totalRate: new Decimal(0), count: 0 };
      current.totalRate = current.totalRate.plus(b.ratePerKg || 0);
      current.count += 1;
      priceMap.set(month, current);
    }
    const supplierTrends = Array.from(priceMap.entries()).map(([month, data]) => ({
      month,
      avgPricePerKg: data.totalRate.dividedBy(data.count).toNumber(),
    }));

    // ─── 5. Inventory Valuation (Grouped by Godown) ─────────────────────────
    const getStandardRate = (category: string, productName: string = '', godownType: string = ''): number => {
      const cat = (category || '').toUpperCase();
      const name = (productName || '').toLowerCase();
      const gType = (godownType || '').toUpperCase();
      if (cat === 'FINISHED_GOOD' || cat.includes('RICE') || name.includes('rice') || gType === 'RICE') return 45;
      if (cat === 'RAW_MATERIAL' || name.includes('paddy')) return 22;
      if (cat === 'BYPRODUCT' || name.includes('bran') || name.includes('husk')) return 15;
      return 25;
    };

    let totalValuation = new Decimal(0);
    const godownMap = new Map<string, {
      godownId: string;
      godownName: string;
      godownType: string;
      location: string;
      totalValue: Decimal;
      totalQuantityKg: Decimal;
      items: Array<{
        product: string;
        category: string;
        quantity: number;
        estimatedValue: number;
      }>;
    }>();

    const valuation: Array<{
      product: string;
      category: string;
      quantity: number;
      estimatedValue: number;
      godownName?: string;
    }> = [];

    for (const lot of lots) {
      const gType = (lot.godown as any)?.type || '';
      const isRice = lot.product.category === 'FINISHED_GOOD' || 
                     lot.product.category === 'RICE' || 
                     (lot.product.name.toLowerCase().includes('rice') && !lot.product.name.toLowerCase().includes('paddy')) || 
                     gType === 'RICE' ||
                     (lot.godown?.name || '').toLowerCase().includes('rice');
      
      const effectiveCategory = isRice ? 'FINISHED_GOOD' : lot.product.category;
      const rate = getStandardRate(effectiveCategory, lot.product.name, gType);
      const value = new Decimal(lot.currentQuantity).times(rate);
      totalValuation = totalValuation.plus(value);

      const gId = lot.godownId;
      const gName = lot.godown?.name || 'Unassigned Storage';
      const gLoc = lot.godown?.location || 'Main Storage';

      const existingGodown = godownMap.get(gId) || {
        godownId: gId,
        godownName: gName,
        godownType: gType,
        location: gLoc,
        totalValue: new Decimal(0),
        totalQuantityKg: new Decimal(0),
        items: [] as Array<{ product: string; category: string; quantity: number; estimatedValue: number }>
      };

      existingGodown.totalValue = existingGodown.totalValue.plus(value);
      existingGodown.totalQuantityKg = existingGodown.totalQuantityKg.plus(lot.currentQuantity);
      existingGodown.items.push({
        product: lot.product.name,
        category: effectiveCategory,
        quantity: lot.currentQuantity.toNumber(),
        estimatedValue: value.toNumber(),
      });
      godownMap.set(gId, existingGodown);

      valuation.push({
        product: lot.product.name,
        category: effectiveCategory,
        quantity: lot.currentQuantity.toNumber(),
        estimatedValue: value.toNumber(),
        godownName: gName,
      });
    }

    for (const pkg of packingItems) {
      const rate = Number(pkg.perBagRate);
      const qty = Number(pkg.quantityBags);
      const value = new Decimal(qty).times(rate);
      totalValuation = totalValuation.plus(value);

      const gId = pkg.godownId;
      const gName = pkg.godown?.name || 'Unassigned Storage';
      const gLoc = pkg.godown?.location || 'Main Storage';

      const existingGodown = godownMap.get(gId) || {
        godownId: gId,
        godownName: gName,
        godownType: (pkg.godown as any)?.type || 'PACKAGING',
        location: gLoc,
        totalValue: new Decimal(0),
        totalQuantityKg: new Decimal(0),
        items: [] as Array<{ product: string; category: string; quantity: number; estimatedValue: number }>
      };

      existingGodown.totalValue = existingGodown.totalValue.plus(value);
      // Not adding bag count to totalQuantityKg to prevent skewing Kg metrics

      existingGodown.items.push({
        product: `${pkg.brandName} (${pkg.capacityKg}kg Bags)`,
        category: 'PACKAGING_MATERIAL',
        quantity: qty,
        estimatedValue: value.toNumber()
      });

      godownMap.set(gId, existingGodown);

      valuation.push({
        product: `${pkg.brandName} (${pkg.capacityKg}kg Bags)`,
        category: 'PACKAGING_MATERIAL',
        quantity: qty,
        estimatedValue: value.toNumber(),
        godownName: gName
      });
    }

    for (const spare of spares) {
      const rate = Number(spare.ratePerUnit);
      const qty = Number(spare.availableQty);
      const value = new Decimal(qty).times(rate);
      totalValuation = totalValuation.plus(value);

      const gId = 'spares-godown';
      const gName = 'Maintenance Spares Storage';
      const gLoc = 'Mill Premise';

      const existingGodown = godownMap.get(gId) || {
        godownId: gId,
        godownName: gName,
        godownType: 'SPARES',
        location: gLoc,
        totalValue: new Decimal(0),
        totalQuantityKg: new Decimal(0),
        items: [] as Array<{ product: string; category: string; quantity: number; estimatedValue: number }>
      };

      existingGodown.totalValue = existingGodown.totalValue.plus(value);
      // Not adding units to totalQuantityKg to prevent skewing Kg metrics

      existingGodown.items.push({
        product: spare.name,
        category: 'SPARE_PART',
        quantity: qty,
        estimatedValue: value.toNumber()
      });

      godownMap.set(gId, existingGodown);

      valuation.push({
        product: spare.name,
        category: 'SPARE_PART',
        quantity: qty,
        estimatedValue: value.toNumber(),
        godownName: gName
      });
    }

    const godownValuationSummary = Array.from(godownMap.values()).map(g => ({
      godownId: g.godownId,
      godownName: g.godownName,
      location: g.location,
      totalValue: g.totalValue.toNumber(),
      totalQuantityKg: g.totalQuantityKg.toNumber(),
      items: g.items
    })).sort((a, b) => b.totalValue - a.totalValue);

    // ─── 6. Vehicle Profitability ─────────────────────────────────────────────
    const vehicleProfitability = vehicles
      .map(v => {
        const income = v.invoices.reduce(
          (acc, inv) => acc.plus(inv.transportFreightAmount || 0),
          new Decimal(0)
        );
        const expense = v.payments.reduce(
          (acc, p) => acc.plus(p.amount),
          new Decimal(0)
        );
        return {
          vehicle: v.licensePlate,
          income: income.toNumber(),
          expense: expense.toNumber(),
          netProfit: income.minus(expense).toNumber(),
        };
      })
      .filter(v => v.income > 0 || v.expense > 0);

    // ─── 7. Broker Stats ──────────────────────────────────────────────────────
    const farmerIds = brokerCommissions
      .map(bc => bc.farmerId)
      .filter((id): id is string => id !== null);

    const velocityProductIds = salesVelocityRaw.map(r => r.productId);

    const [farmers, velocityProducts] = await Promise.all([
      prisma.farmer.findMany({
        where: { id: { in: farmerIds } },
        select: { id: true, name: true },
      }),
      prisma.product.findMany({
        where: { id: { in: velocityProductIds } },
        select: { id: true, name: true },
      })
    ]);
    const farmerMap = new Map(farmers.map(f => [f.id, f]));

    const brokerStats = brokerCommissions
      .filter(bc => bc.farmerId !== null)
      .map(bc => ({
        broker: farmerMap.get(bc.farmerId!)?.name ?? 'Unknown',
        commission: new Decimal(bc._sum.brokerCommissionTotal || 0).toNumber(),
      }));

    // ─── 8. Sales Velocity ────────────────────────────────────────────────────
    // velocityProducts already fetched in parallel above
    const velocityProductMap = new Map(velocityProducts.map(p => [p.id, p.name]));

    const salesVelocity = salesVelocityRaw.map(r => ({
      product: velocityProductMap.get(r.productId) ?? r.productId,
      quantity: new Decimal(r._sum.quantity || 0).toNumber(),
    }));

    // ─── 9. Hamali Efficiency ─────────────────────────────────────────────────
    const [laborWages, totalSalesTonnage, totalProcTonnage] = hamaliAgg;
    const totalWage = new Decimal(laborWages._sum.totalWage || 0);
    const totalTons = new Decimal(totalSalesTonnage._sum.quantity || 0)
      .plus(totalProcTonnage._sum.netWeight || 0)
      .dividedBy(1000);
    const hamaliCostPerTon = totalTons.gt(0) ? totalWage.dividedBy(totalTons).toNumber() : 0;

    // ─── 10. Monthly Sales Trend ──────────────────────────────────────────────
    const monthlySalesMap = new Map<string, { revenue: Decimal; count: number }>();
    for (const inv of monthlySalesRaw) {
      const month = inv.createdAt.toISOString().slice(0, 7);
      const cur = monthlySalesMap.get(month) || { revenue: new Decimal(0), count: 0 };
      cur.revenue = cur.revenue.plus(inv.subtotal || 0);
      cur.count += 1;
      monthlySalesMap.set(month, cur);
    }
    const monthlySales = Array.from(monthlySalesMap.entries()).map(([month, d]) => ({
      month,
      revenue: d.revenue.toNumber(),
      invoices: d.count,
    }));

    // ─── 11. Payment Mode Breakdown ───────────────────────────────────────────
    const paymentModeBreakdown = paymentModes.map(pm => ({
      mode: pm.mode,
      amount: new Decimal(pm._sum.amount || 0).toNumber(),
    }));

    // ─── 12. Milling Session Count (already a number) ─────────────────────────
    // millingCount is already a number from prisma.millingSession.count()

    // ─── 13. Labor Work Type Breakdown ───────────────────────────────────────
    const laborBreakdown = laborWorkTypes.map(lt => ({
      workType: lt.workType,
      totalWage: new Decimal(lt._sum.totalWage || 0).toNumber(),
    }));

    return {
      yieldAnalytics,
      expenseBreakdown,
      arAging,
      arSummary,
      supplierTrends,
      valuation,
      godownValuationSummary,
      totalValuation: totalValuation.toNumber(),
      vehicleProfitability,
      salesVelocity,
      hamaliEfficiency: {
        totalWage: totalWage.toNumber(),
        totalTons: totalTons.toNumber(),
        costPerTon: hamaliCostPerTon,
      },
      brokerStats,
      monthlySales,
      paymentModeBreakdown,
      millingSessionCount: millingCount,
      laborBreakdown,
    };
  }

  static async getEntityLedgerData({
    mode,
    periodType,
    periodValue
  }: {
    mode: 'PURCHASES' | 'SALES';
    periodType: 'MONTHLY' | 'YEARLY';
    periodValue: string;
  }) {
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'MONTHLY') {
      const [yearStr, monthStr] = periodValue.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      if (periodValue.includes('-')) {
        const [startYear] = periodValue.split('-');
        const sy = parseInt(startYear, 10);
        startDate = new Date(sy, 3, 1);
        endDate = new Date(sy + 1, 2, 31, 23, 59, 59, 999);
      } else {
        const year = parseInt(periodValue, 10);
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }

    if (mode === 'PURCHASES') {
      const batches = await prisma.procurementBatch.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'DRAFT' }
        },
        include: {
          supplier: true,
          farmer: true,
          product: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const entityMap = new Map<string, any>();
      for (const b of batches) {
        const entityId = b.supplierId || b.farmerId || 'unknown';
        const entityName = b.supplier?.name || b.farmer?.name || 'Unknown Entity';
        
        if (!entityMap.has(entityId)) {
          entityMap.set(entityId, {
            entityId,
            entityName,
            totalTransactions: 0,
            totalVolumeKg: 0,
            totalValue: 0,
            transactions: []
          });
        }
        
        const entry = entityMap.get(entityId);
        entry.totalTransactions += 1;
        entry.totalVolumeKg += Number(b.netWeight || b.grossWeight || 0);
        entry.totalValue += Number(b.totalPayable || 0);
        entry.transactions.push({
          id: b.id,
          date: b.createdAt,
          refNo: `WB-${b.id.slice(-4).toUpperCase()}`,
          particulars: b.product?.name || 'Paddy Procurement',
          qtyAndRate: `${Number(b.netWeight || b.grossWeight || 0)} KG @ ₹${Number(b.ratePerKg || 0)}`,
          amount: Number(b.totalPayable || 0)
        });
      }

      return Array.from(entityMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    } else {
      const invoices = await prisma.salesInvoice.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'DRAFT' }
        },
        include: {
          customer: true,
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const entityMap = new Map<string, any>();
      for (const inv of invoices) {
        const entityId = inv.customerId;
        const entityName = inv.customer?.name || 'Unknown Customer';
        
        if (!entityMap.has(entityId)) {
          entityMap.set(entityId, {
            entityId,
            entityName,
            totalTransactions: 0,
            totalVolumeKg: 0,
            totalValue: 0,
            transactions: []
          });
        }
        
        const entry = entityMap.get(entityId);
        entry.totalTransactions += 1;
        const invVolume = inv.items.reduce((sum, item) => sum + Number(item.quantity), 0);
        entry.totalVolumeKg += invVolume;
        entry.totalValue += Number(inv.grandTotal || 0);

        const particulars = inv.items.map(i => i.product.name).join(', ');
        
        entry.transactions.push({
          id: inv.id,
          date: inv.createdAt,
          refNo: inv.invoiceNumber,
          particulars: particulars || 'Sales Invoice',
          qtyAndRate: `${invVolume} KG (Multiple items)`,
          amount: Number(inv.grandTotal || 0)
        });
      }

      return Array.from(entityMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    }
  }
}

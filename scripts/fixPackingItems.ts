import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing initialQuantityBags for existing PackingItems...');

  const rawPackingItems = await prisma.packingItem.findMany();
  const salesInvoiceItems = await prisma.salesInvoiceItem.findMany({
    where: { packingItemName: { not: null } }
  });

  for (const item of rawPackingItems) {
    if (Number(item.initialQuantityBags) > 0) {
      console.log(`Skipping ${item.brandName}, already has initialQuantityBags: ${item.initialQuantityBags}`);
      continue;
    }

    // Reverse calculate total sold
    const sales = salesInvoiceItems.filter(s => `${item.brandName} ${Number(item.capacityKg)} KG` === s.packingItemName);
    let totalSold = 0;
    
    for (const sale of sales) {
      let bags = 0;
      if (Number(item.capacityKg) > 0) {
        bags = Math.ceil(Number(sale.quantity) / Number(item.capacityKg));
      }
      totalSold += bags > 0 ? bags : Number(sale.quantity);
    }

    const originalQuantity = Number(item.quantityBags) + totalSold;
    
    console.log(`Updating ${item.brandName}: currentBags=${item.quantityBags}, totalSold=${totalSold} -> initialQuantityBags=${originalQuantity}`);

    await prisma.packingItem.update({
      where: { id: item.id },
      data: { initialQuantityBags: originalQuantity }
    });
  }

  console.log('Done fixing PackingItems.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

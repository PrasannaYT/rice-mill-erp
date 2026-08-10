import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const lots = await prisma.lot.findMany({
    where: { currentQuantity: { gt: 0 } },
    include: { product: true, godown: true }
  });
  console.log('Lots with gt 0:', lots.length);
  
  const lotsGt = await prisma.lot.findMany({
    where: { currentQuantity: { gt: '0' } }
  });
  console.log('Lots with gt "0":', lotsGt.length);

  const lotsGtNum = await prisma.lot.findMany({
    where: { currentQuantity: { gt: 0.0 } }
  });
  console.log('Lots with gt 0.0:', lotsGtNum.length);
}
main();

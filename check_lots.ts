import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const lots = await prisma.lot.findMany({
    include: { product: true }
  });
  console.log(lots);
}
main();

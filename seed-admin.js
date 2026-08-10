const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@mill.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@mill.com',
      passwordHash: hash,
      role: 'ADMIN'
    }
  });
  
  console.log('✅ Admin user created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

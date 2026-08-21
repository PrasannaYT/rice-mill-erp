import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  try {
    const passwordHash = await bcrypt.hash('admin@1994', 10);

    // Reset or update admin@mill.com password to admin123
    const updatedUser = await prisma.user.upsert({
      where: { email: 'admin@mill.com' },
      update: {
        passwordHash: passwordHash,
        isActive: true,
        role: 'SUPER_ADMIN',
      },
      create: {
        name: 'System Admin',
        email: 'admin@mill.com',
        passwordHash: passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    });

    console.log("=== ADMIN PASSWORD RESET SUCCESS ===");
    console.log("Email: admin@mill.com");
    console.log("Password set to: admin@1994");
    console.log("User Account Updated:", updatedUser.id, updatedUser.email, updatedUser.role);
  } catch (err: any) {
    console.error("Error resetting admin password:", err);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

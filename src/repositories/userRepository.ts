import prisma from '@/lib/prisma';
import { type Prisma, type User } from '@prisma/client';

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: { equals: cleanEmail, mode: 'insensitive' } }
        ]
      },
    });
  }

  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  static async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async list(): Promise<User[]> {
    let result = await prisma.user.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }).catch(() => []);
    if (result.length === 0) {
      await new Promise(r => setTimeout(r, 150));
      result = await prisma.user.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }).catch(() => []);
    }
    return result;
  }

  static async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}

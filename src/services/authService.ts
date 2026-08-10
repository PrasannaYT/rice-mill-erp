import { UserRepository } from '@/repositories/userRepository';
import { type CreateUserInput } from '@/validators/authValidators';
import bcrypt from 'bcryptjs';

export class AuthService {
  static async createUser(input: CreateUserInput) {
    // Check if email is already taken
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw new Error('Email already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // Create user
    const newUser = await UserRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      isActive: true,
    });

    return newUser;
  }

  static async verifyPassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}

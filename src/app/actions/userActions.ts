'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRepository } from "@/repositories/userRepository";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    throw new Error("Unauthorized: Only admins and mill owners can manage users");
  }
  return session;
}

const roleSchema = z.enum(["ADMIN", "MANAGER", "WEIGHBRIDGE_OPERATOR", "FLOOR_MANAGER", "ACCOUNTANT", "MILL_OWNER", "SUPER_ADMIN"]);

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: roleSchema,
});

const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: roleSchema,
  isActive: z.string().transform(v => v === 'true'),
});

const resetPasswordSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const deleteUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export async function createUserAction(formData: FormData): Promise<void> {
  const session = await checkAdminAuth();
  
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const existing = await UserRepository.findByEmail(parsed.data.email);
    if (existing) {
      throw new Error("A user with this email already exists");
    }

    if (session.user?.role === 'MILL_OWNER' && (parsed.data.role === 'ADMIN' || parsed.data.role === 'SUPER_ADMIN')) {
      throw new Error("Mill Owners cannot create Admin or Super Admin accounts");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await UserRepository.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
    });
    
    revalidatePath('/admin/users');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create user");
  }
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await checkAdminAuth();
  
  const parsed = deleteUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const targetUser = await UserRepository.findById(parsed.data.id);
    if (!targetUser) throw new Error("User not found");
    if (session.user?.role === 'MILL_OWNER' && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN')) {
      throw new Error("Mill Owners cannot delete Admin or Super Admin accounts");
    }

    await UserRepository.delete(parsed.data.id);
    revalidatePath('/admin/users');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete user");
  }
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const session = await checkAdminAuth();

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const targetUser = await UserRepository.findById(parsed.data.id);
    if (!targetUser) throw new Error("User not found");
    if (session.user?.role === 'MILL_OWNER' && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN' || parsed.data.role === 'ADMIN' || parsed.data.role === 'SUPER_ADMIN')) {
      throw new Error("Mill Owners cannot edit Admin/Super Admin accounts or grant Admin/Super Admin roles");
    }

    await UserRepository.update(parsed.data.id, {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    });
    revalidatePath('/admin/users');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update user");
  }
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const session = await checkAdminAuth();
  
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const targetUser = await UserRepository.findById(parsed.data.id);
    if (!targetUser) throw new Error("User not found");
    if (session.user?.role === 'MILL_OWNER' && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN')) {
      throw new Error("Mill Owners cannot reset Admin or Super Admin passwords");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await UserRepository.update(parsed.data.id, { passwordHash });
    revalidatePath('/admin/users');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to reset password");
  }
}

'use server'

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';

export async function toggleGlobalSetting(key: string, value: boolean) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.globalSetting.upsert({
    where: { key },
    update: { value: value.toString() },
    create: { key, value: value.toString(), description: `Auto-generated key: ${key}` }
  });

  // Revalidate the dashboard and god mode modules page
  revalidatePath('/dashboard');
  revalidatePath('/admin/god-mode/modules');
  
  return { success: true };
}

export async function getGlobalSetting(key: string, defaultVal: boolean): Promise<boolean> {
  try {
    const setting = await prisma.globalSetting.findUnique({ where: { key } });
    if (!setting) return defaultVal;
    return setting.value === 'true';
  } catch {
    return defaultVal;
  }
}

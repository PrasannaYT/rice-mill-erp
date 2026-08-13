import { revalidatePath } from 'next/cache';

export async function clearAnalyticsCache() {
  revalidatePath('/admin/reports');
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function LandingPage() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect('/dashboard');
    }
  } catch (err) {
    // If session check fails or unauthenticated, fallback redirect to login
  }
  redirect('/login');
}

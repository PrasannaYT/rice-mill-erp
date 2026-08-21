import { redirect } from 'next/navigation';

export default function LanderRedirectPage() {
  redirect('/login');
}

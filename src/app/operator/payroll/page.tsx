import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PayrollForm from "@/components/PayrollForm";

import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Hamali & Payroll Desk - Rice Mill ERP',
};

export default async function PayrollPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const [laborers, banks] = await Promise.all([
    prisma.laborer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, contact: true, balance: true }
    }),
    prisma.bank.findMany({
      select: { id: true, bankName: true, accountNumber: true }
    })
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Hamali & Payroll" subtitle="Labor Payments & Expenses" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Payroll'}]} />
      <div className="page-wrapper pb-32">
        <PayrollForm laborers={laborers} banks={banks} />
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VehicleRepository } from "@/repositories/masterDataRepository";
import VehicleManagementModule from "@/components/VehicleManagementModule";
import prisma from "@/lib/prisma";

import { AppHeader } from "@/components/ui/AppHeader";

export default async function VehiclesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR', 'ACCOUNTANT', 'MILL_OWNER', 'SUPER_ADMIN'].includes(session.user?.role || '')) {
    redirect('/dashboard');
  }

  const vehicles = await VehicleRepository.list();
  
  const drivers = await prisma.laborer.findMany({
    where: { type: 'DRIVER' },
    select: { id: true, name: true }
  });
  
  const banks = await prisma.bank.findMany({
    select: { id: true, bankName: true, accountNumber: true }
  });
  
  const expenses = await prisma.expenseCategory.findMany({
    where: { type: 'EXPENSE' },
    select: { id: true, name: true }
  });

  // We map the Date objects to string for Client Components to avoid serialization errors
  const serializedVehicles = vehicles.map(v => ({
    ...v,
    tareWeight: v.tareWeight ? Number(v.tareWeight) : null,
    balance: Number(v.balance),
    insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString() : null,
    fitnessExpiry: v.fitnessExpiry ? v.fitnessExpiry.toISOString() : null,
    pollutionExpiry: v.pollutionExpiry ? v.pollutionExpiry.toISOString() : null,
  }));

  return (
    <div className="min-h-screen">
      <AppHeader title="Fleet Management" subtitle="Vehicle Ledger & Logbook" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Vehicles'}]} />
      <div className="page-wrapper pb-32">
        <VehicleManagementModule 
          initialVehicles={serializedVehicles} 
          drivers={drivers}
          banks={banks}
          expenseCategories={expenses}
          userRole={session.user?.role || ''}
        />
      </div>
    </div>
  );
}

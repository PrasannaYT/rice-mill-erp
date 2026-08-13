import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { PersonalDebtRepository } from "@/repositories/personalDebtRepository";
import PersonalDebtDashboardClient from "@/components/PersonalDebtDashboardClient";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Personal Debt Portfolio - Rice Mill ERP',
};

export default async function PersonalDebtPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const loans = await PersonalDebtRepository.listLoans();

  // Convert Decimals to numbers for the client component
  const formattedLoans = loans.map(loan => {
    const totalPrincipal = Number(loan.principalAmount);
    const paidPrincipal = loan.transactions
      .filter(t => t.paymentType === 'PREPAYMENT' || t.paymentType === 'EMI')
      .reduce((acc, curr) => acc + Number(curr.principalComponent), 0);
    
    // Including straight prepayments
    const prepayments = loan.transactions
      .filter(t => t.paymentType === 'PREPAYMENT')
      .reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

    const outstanding = totalPrincipal - paidPrincipal - prepayments;

    return {
      id: loan.id,
      lenderName: loan.lenderName,
      loanType: loan.loanType,
      principalAmount: totalPrincipal,
      outstandingPrincipal: outstanding > 0 ? outstanding : 0,
      interestRate: Number(loan.interestRate),
      tenureMonths: loan.tenureMonths,
      startDate: loan.startDate.toISOString(),
      isPrivate: loan.isPrivate,
      paidPrincipal: paidPrincipal + prepayments,
      transactions: loan.transactions.map(t => ({
        id: t.id,
        paymentDate: t.paymentDate.toISOString(),
        amountPaid: Number(t.amountPaid),
        principalComponent: Number(t.principalComponent),
        interestComponent: Number(t.interestComponent),
        paymentType: t.paymentType,
      })),
    };
  });

  return (
    <div className="min-h-screen bg-[#121212]">
      <AppHeader 
        title="Personal Debt Portfolio" 
        subtitle="Strictly Isolated Workspace" 
        breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Personal Debt'}]} 
      />
      <div className="page-wrapper pb-32">
        <PersonalDebtDashboardClient initialLoans={formattedLoans} />
      </div>
    </div>
  );
}

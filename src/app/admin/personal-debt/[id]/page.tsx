import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { PersonalDebtRepository } from "@/repositories/personalDebtRepository";
import PersonalDebtDetailClient from "@/components/PersonalDebtDetailClient";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Loan Details - Personal Debt Portfolio',
};

export default async function PersonalDebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const loan = await PersonalDebtRepository.getLoanById(resolvedParams.id);

  if (!loan) {
    redirect('/admin/personal-debt');
  }

  const totalPrincipal = Number(loan.principalAmount);
  const paidPrincipal = loan.transactions
    .filter(t => t.paymentType === 'PREPAYMENT' || t.paymentType === 'EMI')
    .reduce((acc, curr) => acc + Number(curr.principalComponent), 0);
    
  const prepayments = loan.transactions
    .filter(t => t.paymentType === 'PREPAYMENT')
    .reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

  const outstanding = totalPrincipal - paidPrincipal - prepayments;

  const formattedLoan = {
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

  return (
    <div className="min-h-screen bg-[#121212]">
      <AppHeader 
        title="Personal Debt Portfolio" 
        subtitle="Strictly Isolated Workspace" 
        breadcrumbs={[
          {label: 'Dashboard', href: '/dashboard'}, 
          {label: 'Personal Debt', href: '/admin/personal-debt'},
          {label: loan.lenderName}
        ]} 
      />
      <div className="page-wrapper pb-32">
        <PersonalDebtDetailClient loan={formattedLoan} />
      </div>
    </div>
  );
}

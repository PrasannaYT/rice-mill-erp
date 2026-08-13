'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingDown, AlertTriangle, ArrowRight, Wallet, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { useFormAction } from '@/hooks/useFormAction';
import { createPersonalLoanAction } from '@/app/actions/personalDebt';
import { FormErrorBanner } from './ui/FormErrorBanner';

type FormattedLoan = {
  id: string;
  lenderName: string;
  loanType: string;
  principalAmount: number;
  outstandingPrincipal: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  isPrivate: boolean;
  paidPrincipal: number;
};

export default function PersonalDebtDashboardClient({ initialLoans }: { initialLoans: FormattedLoan[] }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const { pending, error, wrap, clearError } = useFormAction();

  const handleAddLoan = wrap(async (formData: FormData) => {
    await createPersonalLoanAction(formData);
    setIsAddModalOpen(false);
  });

  const totalDebt = initialLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0);
  
  // Approximate EMI calculation (assuming simple compound for summary sake, or standard formula)
  // standard EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const calculateEMI = (P: number, R_annual: number, N_months: number) => {
    if (R_annual === 0) return P / N_months;
    const r = (R_annual / 12) / 100;
    return (P * r * Math.pow(1 + r, N_months)) / (Math.pow(1 + r, N_months) - 1);
  };

  const totalEmiBurden = initialLoans.reduce((sum, loan) => {
    if (loan.outstandingPrincipal <= 0) return sum;
    return sum + calculateEMI(loan.outstandingPrincipal, loan.interestRate, loan.tenureMonths);
  }, 0);

  const bankLoansTotal = initialLoans.filter(l => !l.isPrivate).reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const privateLoansTotal = initialLoans.filter(l => l.isPrivate).reduce((sum, l) => sum + l.outstandingPrincipal, 0);

  const chartData = [
    { name: 'Bank Loans', value: bankLoansTotal, color: '#00D09C' },
    { name: 'Private Loans', value: privateLoansTotal, color: '#9B51E0' }
  ].filter(d => d.value > 0);

  // Avalanche Alert Logic
  const highInterestPrivate = initialLoans.find(l => l.isPrivate && l.interestRate > 18 && l.outstandingPrincipal > 0);
  const lowInterestBank = initialLoans.find(l => !l.isPrivate && l.interestRate < 12 && l.outstandingPrincipal > 0);

  return (
    <div className="space-y-8 animate-fade-in text-[#FAFAF7]">
      
      {/* Top Level Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 card-brutal bg-[#1A1A1A] p-6 border-[#333]">
          <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2">Net Outstanding Debt</p>
          <h2 className="text-4xl sm:text-6xl font-black tabular-nums font-display">
            ₹{totalDebt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </h2>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-[#2A2A2A] px-4 py-3 rounded border-l-4 border-emerald-500">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Monthly EMI Burden</p>
              <p className="text-xl font-bold tabular-nums text-white">
                ₹{totalEmiBurden.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <Button variant="green" onClick={() => setIsAddModalOpen(true)} className="h-auto">
              <Plus className="w-5 h-5 mr-2" /> ADD LOAN
            </Button>
          </div>
        </div>

        <div className="col-span-1 card-brutal bg-[#1A1A1A] p-6 border-[#333] flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest w-full text-left">Debt Distribution</p>
          {totalDebt > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs font-bold mt-2">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#00D09C] inline-block rounded-full"></span> Bank</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#9B51E0] inline-block rounded-full"></span> Private</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
              NO ACTIVE DEBT
            </div>
          )}
        </div>
      </div>

      {/* Smart Insights */}
      {highInterestPrivate && lowInterestBank && (
        <div className="card-brutal bg-purple-900/20 border-purple-500 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-12 h-12 bg-purple-500 rounded flex items-center justify-center shrink-0">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-lg text-purple-400 uppercase tracking-wider mb-1">Avalanche Alert</h3>
            <p className="text-sm text-gray-300 font-medium">
              You are paying <span className="text-white font-bold">{highInterestPrivate.interestRate}%</span> on your private loan to {highInterestPrivate.lenderName}. 
              Consider taking a top-up on your {lowInterestBank.lenderName} loan (currently at {lowInterestBank.interestRate}%) to clear this high-interest debt and save significantly on interest.
            </p>
          </div>
        </div>
      )}

      {/* Loan Grid */}
      <div>
        <h3 className="font-display font-black text-xl text-emerald-500 uppercase tracking-widest mb-4">Active Liabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialLoans.filter(l => l.outstandingPrincipal > 0).map(loan => {
            const progress = (loan.paidPrincipal / loan.principalAmount) * 100;
            return (
              <Link key={loan.id} href={`/admin/personal-debt/${loan.id}`} className="block">
                <div className="card-brutal bg-[#1A1A1A] border-[#333] hover:border-emerald-500 p-5 transition-colors cursor-pointer group h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-lg text-white uppercase">{loan.lenderName}</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase">{loan.loanType}</p>
                      </div>
                      <div className={`px-2 py-1 text-[10px] font-black uppercase rounded ${loan.isPrivate ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {loan.isPrivate ? 'Private' : 'Bank'}
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outstanding</p>
                      <p className="font-black text-2xl text-white tabular-nums">
                        ₹{loan.outstandingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-emerald-400 mt-1 font-bold">@ {loan.interestRate}% p.a.</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 uppercase">
                      <span>Paid: {progress.toFixed(1)}%</span>
                      <span>Total: ₹{loan.principalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-[#333] h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); clearError(); }} title="Add Liability" className="bg-[#121212]">
        <form action={handleAddLoan} className="space-y-4 mt-4 text-[#FAFAF7]">
          <FormErrorBanner message={error} onDismiss={clearError} />
          
          <Select label="Liability Category *" name="isPrivate" required className="bg-[#1A1A1A] text-white border-[#333]">
            <option value="false">Formal Bank Loan</option>
            <option value="true">Informal Private Loan</option>
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Lender Name *" type="text" name="lenderName" required placeholder="e.g. HDFC Bank" className="bg-[#1A1A1A] text-white border-[#333]" />
            <Input label="Loan Type *" type="text" name="loanType" required placeholder="e.g. Auto Loan" className="bg-[#1A1A1A] text-white border-[#333]" />
          </div>

          <Input label="Principal Amount (₹) *" type="number" step="0.01" name="principalAmount" required className="bg-[#1A1A1A] text-white border-[#333]" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Interest Rate (% p.a.) *" type="number" step="0.01" name="interestRate" required className="bg-[#1A1A1A] text-white border-[#333]" />
            <Input label="Tenure (Months) *" type="number" name="tenureMonths" required className="bg-[#1A1A1A] text-white border-[#333]" />
          </div>

          <Input label="Start Date *" type="date" name="startDate" required className="bg-[#1A1A1A] text-white border-[#333]" />

          <Button type="submit" variant="green" loading={pending} className="w-full mt-4">
            {pending ? 'SAVING...' : 'SAVE LIABILITY'}
          </Button>
        </form>
      </Modal>

    </div>
  );
}

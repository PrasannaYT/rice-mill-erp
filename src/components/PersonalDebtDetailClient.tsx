'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowLeft, Wallet, Calendar, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { useFormAction } from '@/hooks/useFormAction';
import { recordPersonalLoanTransactionAction } from '@/app/actions/personalDebt';
import { FormErrorBanner } from './ui/FormErrorBanner';

type Transaction = {
  id: string;
  paymentDate: string;
  amountPaid: number;
  principalComponent: number;
  interestComponent: number;
  paymentType: 'EMI' | 'PREPAYMENT';
};

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
  transactions: Transaction[];
};

export default function PersonalDebtDetailClient({ loan }: { loan: FormattedLoan }) {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'AMORTIZATION'>('TRANSACTIONS');
  
  const { pending, error, wrap, clearError } = useFormAction();

  const handleRecordPayment = wrap(async (formData: FormData) => {
    formData.append('loanId', loan.id);
    await recordPersonalLoanTransactionAction(formData);
    setIsRecordModalOpen(false);
  });

  const totalInterestPayable = (loan.principalAmount * loan.interestRate * loan.tenureMonths) / (12 * 100);
  const chartData = [
    { name: 'Principal', value: loan.principalAmount, color: '#00D09C' },
    { name: 'Interest', value: totalInterestPayable, color: '#9B51E0' }
  ];

  const calculateEMI = (P: number, R_annual: number, N_months: number) => {
    if (R_annual === 0) return P / N_months;
    const r = (R_annual / 12) / 100;
    return (P * r * Math.pow(1 + r, N_months)) / (Math.pow(1 + r, N_months) - 1);
  };

  const emiAmount = calculateEMI(loan.principalAmount, loan.interestRate, loan.tenureMonths);

  // Amortization Schedule Generation
  const schedule = [];
  let balance = loan.principalAmount;
  const monthlyRate = (loan.interestRate / 12) / 100;

  for (let i = 1; i <= loan.tenureMonths; i++) {
    const interest = balance * monthlyRate;
    const principal = emiAmount - interest;
    balance -= principal;
    if (balance < 0) balance = 0;

    schedule.push({
      month: i,
      emi: emiAmount,
      principal,
      interest,
      balance,
    });
  }

  // Prepayment simulation state
  const [prepaymentSimAmount, setPrepaymentSimAmount] = useState<number>(0);
  let simSavedInterest = 0;
  let simReducedTenure = 0;

  if (prepaymentSimAmount > 0) {
    // Re-run amortization with prepayment applied immediately on current outstanding
    let simBalance = loan.outstandingPrincipal - prepaymentSimAmount;
    let simMonths = 0;
    let simTotalInterest = 0;

    while (simBalance > 0 && simMonths < loan.tenureMonths * 2) {
      const interest = simBalance * monthlyRate;
      simTotalInterest += interest;
      const principal = emiAmount - interest;
      simBalance -= principal;
      simMonths++;
    }

    // Remaining interest without prepayment
    let normalBalance = loan.outstandingPrincipal;
    let normalMonths = 0;
    let normalTotalInterest = 0;
    while (normalBalance > 0 && normalMonths < loan.tenureMonths * 2) {
      const interest = normalBalance * monthlyRate;
      normalTotalInterest += interest;
      const principal = emiAmount - interest;
      normalBalance -= principal;
      normalMonths++;
    }

    simSavedInterest = normalTotalInterest - simTotalInterest;
    simReducedTenure = normalMonths - simMonths;
  }

  // Find next EMI date (simple assumption based on start date and months passed)
  const startDate = new Date(loan.startDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const nextEmiDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthsDiff + 1, startDate.getDate());
  
  const isWithin3Days = (nextEmiDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3;

  return (
    <div className="space-y-8 animate-fade-in text-[#FAFAF7]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/admin/personal-debt" className="text-emerald-500 font-bold uppercase tracking-wider text-xs flex items-center mb-2 hover:text-emerald-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Portfolio
          </Link>
          <h2 className="text-3xl sm:text-5xl font-black uppercase font-display">{loan.lenderName}</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest">{loan.loanType} &bull; {loan.isPrivate ? 'Private' : 'Bank'}</p>
        </div>
        <Button variant="green" onClick={() => setIsRecordModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" /> RECORD PAYMENT
        </Button>
      </div>

      {isWithin3Days && (
        <div className="card-brutal bg-red-900/20 border-red-500 p-4 flex gap-4 items-center">
          <AlertTriangle className="text-red-500 w-8 h-8 shrink-0" />
          <div>
            <h3 className="font-black text-red-500 uppercase tracking-wider">EMI Bounce Warning</h3>
            <p className="text-sm font-medium text-gray-300">
              Upcoming EMI of ₹{emiAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} for {loan.lenderName} is due on {nextEmiDate.toLocaleDateString()}. Ensure your linked bank account is funded.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 card-brutal bg-[#1A1A1A] border-[#333] p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Outstanding</p>
              <p className="text-4xl font-black text-white tabular-nums">
                ₹{loan.outstandingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Sanctioned</p>
              <p className="text-4xl font-black text-emerald-500 tabular-nums">
                ₹{loan.principalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Interest Rate</p>
              <p className="text-2xl font-black text-white tabular-nums">{loan.interestRate}% <span className="text-sm text-gray-500">p.a.</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tenure</p>
              <p className="text-2xl font-black text-white tabular-nums">{loan.tenureMonths} <span className="text-sm text-gray-500">Months</span></p>
            </div>
          </div>
        </div>

        <div className="col-span-1 card-brutal bg-[#1A1A1A] border-[#333] p-6 flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest w-full text-left">Payable Breakdown</p>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `₹${Number(value || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}`}
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #333' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-[10px] font-bold mt-2 uppercase text-gray-400">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#00D09C] inline-block rounded-full"></span> Principal</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#9B51E0] inline-block rounded-full"></span> Interest</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prepayment Calculator */}
      {loan.outstandingPrincipal > 0 && (
        <div className="card-brutal bg-[#1A1A1A] border-[#333] p-6">
          <h3 className="font-black text-lg text-emerald-500 uppercase tracking-wider mb-4 flex items-center">
            <Wallet className="w-5 h-5 mr-2" /> Prepayment Impact Simulator
          </h3>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-1/3">
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Simulate Prepayment (₹)</label>
              <input 
                type="range" 
                min="0" 
                max={loan.outstandingPrincipal} 
                step="5000" 
                value={prepaymentSimAmount}
                onChange={(e) => setPrepaymentSimAmount(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="text-center mt-2 font-black text-2xl text-white tabular-nums">
                ₹{prepaymentSimAmount.toLocaleString('en-IN')}
              </div>
            </div>
            
            {prepaymentSimAmount > 0 && (
              <div className="flex-1 bg-[#2A2A2A] border border-[#444] rounded p-4 flex flex-col justify-center animate-fade-up">
                <p className="text-gray-300 font-medium text-sm">
                  Making this prepayment today will reduce your tenure by <span className="text-emerald-400 font-black">{simReducedTenure} months</span> and save you <span className="text-emerald-400 font-black">₹{simSavedInterest.toLocaleString('en-IN', {maximumFractionDigits:0})}</span> in total interest.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-[#333]">
        <button 
          className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'TRANSACTIONS' ? 'text-emerald-500 border-b-2 border-emerald-500 -mb-[2px]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('TRANSACTIONS')}
        >
          Transactions
        </button>
        <button 
          className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'AMORTIZATION' ? 'text-emerald-500 border-b-2 border-emerald-500 -mb-[2px]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('AMORTIZATION')}
        >
          Amortization Schedule
        </button>
      </div>

      {activeTab === 'TRANSACTIONS' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#333]">
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500">Date</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500">Type</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Principal</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Interest</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-emerald-500 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {loan.transactions.map(t => (
                <tr key={t.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] transition-colors">
                  <td className="p-3 font-medium text-white">{new Date(t.paymentDate).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase rounded ${t.paymentType === 'PREPAYMENT' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#333] text-gray-300'}`}>
                      {t.paymentType}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-gray-400 tabular-nums text-right">₹{t.principalComponent.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 font-bold text-gray-400 tabular-nums text-right">₹{t.interestComponent.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 font-black text-emerald-400 tabular-nums text-right">₹{t.amountPaid.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                </tr>
              ))}
              {loan.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold text-gray-500 uppercase tracking-wider">No payments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'AMORTIZATION' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#333]">
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500">Month</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500 text-right">EMI</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Principal</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Interest</th>
                <th className="p-3 text-xs font-black uppercase tracking-widest text-emerald-500 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(s => (
                <tr key={s.month} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] transition-colors">
                  <td className="p-3 font-medium text-white">{s.month}</td>
                  <td className="p-3 font-bold text-gray-300 tabular-nums text-right">₹{s.emi.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 font-bold text-gray-400 tabular-nums text-right">₹{s.principal.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 font-bold text-purple-400 tabular-nums text-right">₹{s.interest.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 font-black text-emerald-400 tabular-nums text-right">₹{s.balance.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isRecordModalOpen} onClose={() => { setIsRecordModalOpen(false); clearError(); }} title="Record Payment" className="bg-[#121212]">
        <form action={handleRecordPayment} className="space-y-4 mt-4 text-[#FAFAF7]">
          <FormErrorBanner message={error} onDismiss={clearError} />
          
          <Select label="Payment Type *" name="paymentType" required className="bg-[#1A1A1A] text-white border-[#333]">
            <option value="EMI">Standard EMI</option>
            <option value="PREPAYMENT">Lump-Sum Prepayment</option>
          </Select>
          
          <Input label="Payment Date *" type="date" name="paymentDate" required defaultValue={new Date().toISOString().split('T')[0]} className="bg-[#1A1A1A] text-white border-[#333]" />
          
          <Input label="Total Amount Paid (₹) *" type="number" step="0.01" name="amountPaid" required className="bg-[#1A1A1A] text-white border-[#333]" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Principal Component (₹)" type="number" step="0.01" name="principalComponent" className="bg-[#1A1A1A] text-white border-[#333]" placeholder="Optional" />
            <Input label="Interest Component (₹)" type="number" step="0.01" name="interestComponent" className="bg-[#1A1A1A] text-white border-[#333]" placeholder="Optional" />
          </div>

          <Button type="submit" variant="green" loading={pending} className="w-full mt-4">
            {pending ? 'SAVING...' : 'SAVE PAYMENT'}
          </Button>
        </form>
      </Modal>

    </div>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, Calculator, Plus, X, CreditCard, Banknote, History } from 'lucide-react';
import { recordWageAction, getLaborerHistoryAction, issueAdvanceAction, settleLaborerPaymentAction } from '@/app/actions/payroll';
import { createLaborerAction } from '@/app/actions/masterData';
import MobilePayrollDesk from '@/components/MobilePayrollDesk';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

type Laborer = { id: string; name: string; type: string; balance: number | string | { toString(): string } };
type SelectOption = { id: string; bankName?: string; accountNumber?: string };

type HistoryItem = { id: string; date: Date; type: string; desc: string; amount: number };

export default function PayrollForm({ laborers, banks = [] }: { laborers: Laborer[], banks?: SelectOption[] }) {
  const [localLaborers, setLocalLaborers] = useState(laborers);
  const [laborerId, setLaborerId] = useState('');
  const [workType, setWorkType] = useState('');
  const [totalWageFlat, setTotalWageFlat] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isAddingLaborer, setIsAddingLaborer] = useState(false);
  const [newLaborerName, setNewLaborerName] = useState('');
  const [newLaborerType, setNewLaborerType] = useState('HAMALI');
  const [newLaborerContact, setNewLaborerContact] = useState('');
  
  // New features state
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (laborerId) {
      setIsLoadingHistory(true);
      getLaborerHistoryAction(laborerId).then(data => {
        setHistory(data);
        setIsLoadingHistory(false);
      });
    } else {
      setHistory([]);
    }
  }, [laborerId]);

  const calculatedTotal = useMemo(() => {
    return Number(totalWageFlat) || 0;
  }, [totalWageFlat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotal <= 0) {
      toast.error("Total wage must be greater than zero.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('laborerId', laborerId);
      if (workType) formData.append('workType', workType);
      formData.append('totalWage', totalWageFlat);
      
      await recordWageAction(formData);
      toast.success('Wage recorded successfully! Balance updated.');
      
      setTotalWageFlat('');
      setWorkType('');
      window.location.reload();
    } catch (error) {
      toast.error('Error recording wage: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  const handleAddLaborer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingLaborer(true);
    try {
      const formData = new FormData();
      formData.append('name', newLaborerName);
      formData.append('type', newLaborerType);
      if (newLaborerContact) formData.append('contact', newLaborerContact);
      
      const newLaborer = await createLaborerAction(formData);
      
      const laborerObj = {
        id: newLaborer.id,
        name: newLaborer.name,
        type: newLaborerType,
        balance: 0
      };
      
      setLocalLaborers(prev => [...prev, laborerObj]);
      setLaborerId(newLaborer.id);
      setAddModalOpen(false);
      setNewLaborerName('');
      setNewLaborerContact('');
    } catch (error) {
      toast.error('Error adding laborer: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAddingLaborer(false);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('laborerId', laborerId);
      formData.append('amount', amount);
      formData.append('description', description);
      if (selectedBankId) formData.append('bankId', selectedBankId);
      
      await issueAdvanceAction(formData);
      toast.success('Advance issued successfully!');
      window.location.reload();
    } catch (error) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('laborerId', laborerId);
      formData.append('amount', amount);
      if (selectedBankId) formData.append('bankId', selectedBankId);
      
      await settleLaborerPaymentAction(formData);
      toast.success('Payment settled successfully!');
      window.location.reload();
    } catch (error) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  const selectedLaborer = localLaborers.find(l => l.id === laborerId);

  return (
    <>
      <div className="md:hidden">
        <MobilePayrollDesk laborers={laborers} banks={banks} />
      </div>
      <div className="hidden md:block max-w-4xl mx-auto space-y-8 mt-6">
        
        <div className="card-brutal p-0 overflow-hidden">
          <div className="bg-[var(--gold)] p-6 sm:p-10 text-[var(--text)] border-b-2 border-[var(--border)]">
            <h2 className="font-display font-black text-3xl flex items-center tracking-tight">
              <Users className="h-8 w-8 mr-3" />
              PAYROLL DESK
            </h2>
            <p className="mt-2 text-[var(--text)]/80 font-bold uppercase tracking-wider text-sm">
              Log piece-rate wages and manage labor ledgers
            </p>
          </div>
          
          <div className="p-6 sm:p-10">
            <form className="space-y-8 pb-28 sm:pb-0" onSubmit={handleSubmit}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 stagger">
                <div className="flex gap-2 items-end animate-fade-up">
                  <Select
                    label="Laborer / Gang *"
                    value={laborerId} 
                    onChange={(e) => setLaborerId(e.target.value)} 
                    required
                  >
                    <option value="">Select Laborer...</option>
                    {localLaborers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
                  </Select>
                  <Button type="button" variant="ghost" onClick={() => setAddModalOpen(true)} className="px-3 mb-[2px]">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                
                <AnimatePresence>
                  {selectedLaborer && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="w-full p-4 bg-[var(--surface-2)] border-2 border-[var(--border)] shadow-brutal-sm flex justify-between items-center">
                        <div>
                          <span className="font-display font-bold uppercase tracking-widest text-[var(--muted)] text-[10px] block mb-1">Current Ledger Balance</span>
                          <span className={`text-2xl font-black tabular-nums ${Number(selectedLaborer.balance) > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                            ₹{Number(selectedLaborer.balance).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => { setAmount(''); setDescription(''); setIsAdvanceModalOpen(true); }}
                          className="flex-1 bg-amber-200 border-amber-900 text-amber-900"
                        >
                          <Banknote className="h-4 w-4 mr-2" /> ADVANCE
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => { setAmount(''); setIsSettleModalOpen(true); }}
                          className="flex-1 bg-[var(--green)]"
                        >
                          <CreditCard className="h-4 w-4 mr-2" /> SETTLE
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="animate-fade-up">
                <Input
                  label="Work Type (Optional)"
                  type="text"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  placeholder="e.g. Unloading, General Labor"
                />
              </div>

              <div className="pt-8 border-t-2 border-[var(--border)] animate-fade-up">
                <h3 className="font-display font-black text-xl text-[var(--text)] uppercase flex items-center mb-6">
                  <Calculator className="h-5 w-5 mr-2 text-[var(--blue)]" /> WAGE CALCULATION
                </h3>
                
                <Input 
                  label="Total Flat Wage (₹) *"
                  type="number" 
                  step="0.01" 
                  required 
                  value={totalWageFlat} 
                  onChange={(e) => setTotalWageFlat(e.target.value)} 
                  className="text-2xl font-black text-[var(--blue)] tabular-nums p-4 h-auto"
                  placeholder="0.00" 
                />
              </div>

              {/* Sticky Action Bar on Mobile */}
              <div className="fixed bottom-[70px] sm:static sm:bottom-auto left-0 w-full z-20 p-4 sm:p-6 bg-[var(--charcoal)] border-t-4 sm:border-4 border-[var(--blue)] shadow-[0_-8px_20px_rgba(0,0,0,0.5)] sm:shadow-brutal text-white flex flex-col sm:flex-row justify-between items-center mt-0 sm:mt-8 gap-4 sm:gap-0 sm:rounded-sm">
                <div className="flex justify-between sm:justify-start w-full sm:w-auto items-center gap-4">
                  <span className="font-display font-bold uppercase tracking-wider text-sm sm:text-base">Total Wage</span>
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--blue)]">₹{calculatedTotal.toFixed(2)}</span>
                </div>
                
                <div className="w-full sm:w-auto">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !laborerId || calculatedTotal <= 0}
                    className="w-full sm:w-auto py-3 sm:py-2 text-lg sm:text-sm"
                  >
                    {isSubmitting ? 'RECORDING...' : 'CREDIT LEDGER'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Recent History Table */}
        <AnimatePresence>
          {laborerId && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-brutal p-0 overflow-hidden"
            >
              <div className="bg-[var(--charcoal)] p-4 sm:p-6 text-white border-b-2 border-[var(--border)]">
                <h3 className="font-display font-black text-xl flex items-center tracking-tight">
                  <History className="h-5 w-5 mr-2 text-[var(--gold)]" /> LEDGER HISTORY
                </h3>
              </div>
              
              <div className="p-0">
                {isLoadingHistory ? (
                  <div className="p-8 text-center font-display font-bold text-[var(--muted)] animate-pulse">LOADING HISTORY...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center font-display font-bold uppercase text-[var(--muted)]">
                    No records found for this laborer.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-brutal">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th className="text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id}>
                            <td className="whitespace-nowrap font-bold text-sm">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td>
                              <Badge variant={item.amount > 0 ? 'green' : 'red'}>
                                {item.type}
                              </Badge>
                            </td>
                            <td className="text-sm font-medium">{item.desc}</td>
                            <td className={`text-right font-black tabular-nums ${item.amount > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                              {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advance Modal */}
        <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title="ISSUE CASH ADVANCE">
          <form onSubmit={handleAdvanceSubmit} className="space-y-6">
            <Input
              label="Amount (₹) *"
              type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
              className="text-xl font-bold"
            />
            <Input
              label="Description (Reason) *"
              type="text" required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Weekly advance for groceries"
            />
            <Select 
              label="Paid From (Source)"
              value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}
            >
              <option value="">Cash Account</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
              ))}
            </Select>
            <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
              <Button type="button" variant="ghost" onClick={() => setIsAdvanceModalOpen(false)}>CANCEL</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>ISSUE ADVANCE</Button>
            </div>
          </form>
        </Modal>

        {/* Settle Modal */}
        <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title="SETTLE PAYMENT">
          <form onSubmit={handleSettleSubmit} className="space-y-6">
            <div className="p-4 bg-[var(--green)] text-white font-bold border-2 border-[var(--border)] shadow-brutal-sm text-sm">
              Paying off the ledger balance decreases the amount owed to this laborer.
            </div>
            <Input
              label="Payment Amount (₹) *"
              type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
              className="text-xl font-bold"
            />
            <Select 
              label="Source Account"
              value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}
            >
              <option value="">Cash Account</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
              ))}
            </Select>
            <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
              <Button type="button" variant="ghost" onClick={() => setIsSettleModalOpen(false)}>CANCEL</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>PAY NOW</Button>
            </div>
          </form>
        </Modal>

        {/* Add Laborer Modal */}
        <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="QUICK ADD LABORER">
          <form onSubmit={handleAddLaborer} className="space-y-6">
            <Input
              label="Name *"
              type="text" required value={newLaborerName} onChange={e => setNewLaborerName(e.target.value)}
              placeholder="Laborer or Gang Name"
            />
            <Select
              label="Type *"
              value={newLaborerType} onChange={e => setNewLaborerType(e.target.value)}
            >
              <option value="HAMALI">Hamali (Loading/Unloading)</option>
              <option value="DRIVER">Driver</option>
              <option value="OPERATOR">Machine Operator</option>
              <option value="GENERAL">General Laborer</option>
            </Select>
            <Input
              label="Contact (Optional)"
              type="text" value={newLaborerContact} onChange={e => setNewLaborerContact(e.target.value)}
              placeholder="Phone Number"
            />
            
            <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
              <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>CANCEL</Button>
              <Button type="submit" variant="primary" disabled={isAddingLaborer}>
                {isAddingLaborer ? 'ADDING...' : 'ADD LABORER'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

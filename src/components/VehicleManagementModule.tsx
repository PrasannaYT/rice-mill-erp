'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Truck, ShieldAlert, BadgeCheck, FileWarning, Search, Landmark, CreditCard,
  Droplet, UserCog, Edit, Trash2, Plus, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import { createVehicleAction, updateVehicleAction, deleteVehicleAction } from '@/app/actions/masterData';
import { recordVehicleCommissionAction, logVehicleExpenseAction, settleVehiclePaymentAction, assignDriverAction } from '@/app/actions/vehicles';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';

type SerializedVehicle = {
  id: string; licensePlate: string; type: string; tareWeight: number | null;
  ownershipType: string; insuranceExpiry: string | null; fitnessExpiry: string | null;
  pollutionExpiry: string | null; ownerName: string | null; contactNumber: string | null;
  balance: number; assignedDriverId: string | null;
};
type SelectOption = { id: string; name?: string; bankName?: string; accountNumber?: string };

function CompliancePill({ label, expiry }: { label: string; expiry: string | null }) {
  const now = new Date();
  const exp = expiry ? new Date(expiry) : null;
  const diffDays = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null;
  const isExpired = exp ? exp < now : false;
  const isSoon = !isExpired && diffDays !== null && diffDays <= 30;

  if (!exp) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isExpired ? 'bg-red-950/50 border-red-900/60 text-red-400' :
        isSoon ? 'bg-amber-950/50 border-amber-900/60 text-amber-400' :
          'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
      }`}>
      {isExpired ? <ShieldAlert className="w-3 h-3" /> : isSoon ? <FileWarning className="w-3 h-3" /> : <BadgeCheck className="w-3 h-3" />}
      {label}
      {isExpired ? ' EXP' : isSoon ? ` ${diffDays}d` : ' OK'}
    </div>
  );
}

export default function VehicleManagementModule({
  initialVehicles, drivers, banks, expenseCategories, userRole
}: {
  initialVehicles: SerializedVehicle[]; drivers: SelectOption[]; banks: SelectOption[];
  expenseCategories: SelectOption[]; userRole: string;
}) {
  const [activeTab, setActiveTab] = useState<'OWNED' | 'THIRD_PARTY'>('OWNED');
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const isAdmin = ['ADMIN', 'MANAGER', 'MILL_OWNER', 'SUPER_ADMIN'].includes(userRole);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formLicensePlate, setFormLicensePlate] = useState('');
  const [formType, setFormType] = useState('TRUCK');
  const [formTareWeight, setFormTareWeight] = useState('');
  const [formInsurance, setFormInsurance] = useState('');
  const [formFitness, setFormFitness] = useState('');
  const [formPollution, setFormPollution] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVehicles = vehicles
    .filter(v => v.ownershipType === activeTab)
    .filter(v => v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()));

  const ownedCount = vehicles.filter(v => v.ownershipType === 'OWNED').length;
  const thirdPartyCount = vehicles.filter(v => v.ownershipType === 'THIRD_PARTY').length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('licensePlate', formLicensePlate);
      fd.append('type', formType);
      fd.append('ownershipType', activeTab);
      if (formTareWeight) fd.append('tareWeight', formTareWeight);
      if (activeTab === 'OWNED') {
        if (formInsurance) fd.append('insuranceExpiry', formInsurance);
        if (formFitness) fd.append('fitnessExpiry', formFitness);
        if (formPollution) fd.append('pollutionExpiry', formPollution);
      } else {
        if (formOwnerName) fd.append('ownerName', formOwnerName);
        if (formContact) fd.append('contactNumber', formContact);
      }
      if (editMode && selectedVehicleId) {
        fd.append('id', selectedVehicleId);
        await updateVehicleAction(fd);
        toast.success('Vehicle updated!');
      } else {
        await createVehicleAction(fd);
        toast.success('Vehicle registered!');
      }
      window.location.reload();
    } catch (error) {
      toast.error('Failed: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  const handleCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleId', selectedVehicleId); fd.append('amount', amount); fd.append('description', description);
      await recordVehicleCommissionAction(fd);
      toast.success('Freight commission recorded!'); window.location.reload();
    } catch (error) { toast.error('Failed: ' + (error instanceof Error ? error.message : String(error))); setIsSubmitting(false); }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleId', selectedVehicleId);

      if (isCreatingCategory) {
        if (!newCategoryName.trim()) throw new Error("Category name is required");
        fd.append('categoryId', `NEW:${newCategoryName.trim()}`);
      } else {
        if (!selectedCategoryId) throw new Error("Please select a category");
        fd.append('categoryId', selectedCategoryId);
      }

      fd.append('amount', amount); fd.append('description', description);
      if (selectedBankId) fd.append('bankId', selectedBankId);
      await logVehicleExpenseAction(fd);
      toast.success('Expense logged!'); window.location.reload();
    } catch (error) { toast.error('Failed: ' + (error instanceof Error ? error.message : String(error))); setIsSubmitting(false); }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('vehicleId', selectedVehicleId); fd.append('amount', amount);
      if (selectedBankId) fd.append('bankId', selectedBankId);
      await settleVehiclePaymentAction(fd);
      toast.success('Payment settled!'); window.location.reload();
    } catch (error) { toast.error('Failed: ' + (error instanceof Error ? error.message : String(error))); setIsSubmitting(false); }
  };

  const handleAssignDriver = async (vehicleId: string, driverId: string) => {
    try {
      const fd = new FormData();
      fd.append('vehicleId', vehicleId); fd.append('driverId', driverId);
      await assignDriverAction(fd);
      toast.success('Driver assigned!');
    } catch { toast.error('Failed to assign driver'); }
  };

  const handleEditClick = (v: SerializedVehicle) => {
    setEditMode(true); setSelectedVehicleId(v.id);
    setFormLicensePlate(v.licensePlate); setFormType(v.type);
    setFormTareWeight(v.tareWeight != null ? v.tareWeight.toString() : '');
    setFormInsurance(v.insuranceExpiry ? v.insuranceExpiry.split('T')[0] : '');
    setFormFitness(v.fitnessExpiry ? v.fitnessExpiry.split('T')[0] : '');
    setFormPollution(v.pollutionExpiry ? v.pollutionExpiry.split('T')[0] : '');
    setFormOwnerName(v.ownerName || ''); setFormContact(v.contactNumber || '');
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Delete this vehicle? This will remove associated records.')) {
      try {
        const fd = new FormData(); fd.append('id', id);
        await deleteVehicleAction(fd); window.location.reload();
      } catch { toast.error('Failed to delete vehicle'); }
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-4 space-y-6">

      {/* Tab Toggle */}
      <div className="flex bg-[#1A1A1A] p-1.5 rounded-2xl border border-neutral-800 shadow-xl">
        {[
          { id: 'OWNED', label: 'Business Fleet', color: 'bg-emerald-500', count: ownedCount },
          { id: 'THIRD_PARTY', label: 'Third-Party', color: 'bg-[#F5A623]', count: thirdPartyCount },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'text-neutral-500 hover:text-neutral-300'}`}>
            <Truck className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === tab.id ? 'bg-white/20' : 'bg-neutral-800'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Register Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input type="text" placeholder="Search plate number..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-[#1A1A1A] border border-neutral-800 rounded-2xl text-white font-semibold text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#F5A623] transition-colors" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-neutral-700 rounded-full">
              <X className="w-3 h-3 text-neutral-300" />
            </button>
          )}
        </div>
        <button
          onClick={() => { setEditMode(false); setIsAddModalOpen(true); setFormLicensePlate(''); setFormType('TRUCK'); setFormTareWeight(''); setFormInsurance(''); setFormFitness(''); setFormPollution(''); setFormOwnerName(''); setFormContact(''); }}
          className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black uppercase tracking-wider text-sm transition-all active:scale-95 shadow-lg w-full sm:w-auto ${activeTab === 'OWNED' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-[#F5A623] text-black shadow-[#F5A623]/30'}`}>
          <Plus className="w-5 h-5" />
          Register {activeTab === 'OWNED' ? 'Fleet' : 'Third-Party'}
        </button>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredVehicles.map((v, i) => {
            const hasCompliance = v.ownershipType === 'OWNED';
            const isAnyExpired = hasCompliance && (
              (v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date()) ||
              (v.fitnessExpiry && new Date(v.fitnessExpiry) < new Date()) ||
              (v.pollutionExpiry && new Date(v.pollutionExpiry) < new Date())
            );

            return (
              <motion.div key={v.id}
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
                className={`bg-[#1A1A1A] rounded-2xl border flex flex-col overflow-hidden transition-colors ${isAnyExpired ? 'border-red-900/60' : 'border-neutral-800 hover:border-neutral-700'}`}>

                {/* Card Header */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Vehicle Icon */}
                    <div className={`p-2.5 rounded-xl shrink-0 ${activeTab === 'OWNED' ? 'bg-emerald-500/20' : 'bg-[#F5A623]/20'}`}>
                      <Truck className={`w-5 h-5 ${activeTab === 'OWNED' ? 'text-emerald-400' : 'text-[#F5A623]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono font-black text-xl text-white uppercase tracking-tighter truncate">{v.licensePlate}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-lg border border-neutral-700">{v.type}</span>
                        {v.tareWeight && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-lg border border-neutral-700">{v.tareWeight} MT</span>}
                      </div>
                    </div>
                  </div>
                  {isAnyExpired && (
                    <div className="shrink-0 p-1.5 bg-red-950/60 border border-red-900/60 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>

                {/* Compliance Pills (OWNED only) */}
                {activeTab === 'OWNED' && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    <CompliancePill label="Ins" expiry={v.insuranceExpiry} />
                    <CompliancePill label="Fit" expiry={v.fitnessExpiry} />
                    <CompliancePill label="PUC" expiry={v.pollutionExpiry} />
                  </div>
                )}

                {/* Third-Party Info */}
                {activeTab === 'THIRD_PARTY' && (
                  <div className="px-4 pb-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500 font-black uppercase">Owner</span>
                      <span className="text-neutral-300 font-semibold">{v.ownerName || 'Unknown'}</span>
                    </div>
                    {v.contactNumber && (
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500 font-black uppercase">Contact</span>
                        <span className="text-neutral-300 font-semibold">{v.contactNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                      <span className="text-neutral-500 font-black uppercase text-xs">Commission Due</span>
                      <span className={`font-mono font-black text-lg tabular-nums ${v.balance > 0 ? 'text-[#F5A623]' : 'text-neutral-400'}`}>₹{v.balance.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Owned: Driver Assignment */}
                {activeTab === 'OWNED' && (
                  <div className="px-4 pb-3 border-t border-neutral-800 pt-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1 mb-1.5">
                      <UserCog className="w-3 h-3" /> Driver
                    </label>
                    <select value={v.assignedDriverId || ''}
                      onChange={e => handleAssignDriver(v.id, e.target.value)}
                      className="w-full text-sm font-bold py-2 px-3 bg-[#111] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
                      <option value="">Unassigned</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="mt-auto border-t border-neutral-800 flex overflow-x-auto hide-scrollbar">
                  {activeTab === 'THIRD_PARTY' && (
                    <>
                      <button onClick={() => { setSelectedVehicleId(v.id); setAmount(''); setDescription(''); setIsCommissionModalOpen(true); }}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-[#F5A623] hover:bg-[#F5A623]/10 transition-colors border-r border-neutral-800 min-w-[64px]">
                        <Landmark className="w-4 h-4" />
                        Freight
                      </button>
                      <button onClick={() => { setSelectedVehicleId(v.id); setAmount(''); setIsSettleModalOpen(true); }}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-emerald-400 hover:bg-emerald-500/10 transition-colors border-r border-neutral-800 min-w-[64px]">
                        <CreditCard className="w-4 h-4" />
                        Settle
                      </button>
                    </>
                  )}
                  {activeTab === 'OWNED' && (
                    <button onClick={() => { setSelectedVehicleId(v.id); setAmount(''); setDescription(''); setIsExpenseModalOpen(true); }}
                      className="flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-sky-400 hover:bg-sky-500/10 transition-colors border-r border-neutral-800 min-w-[64px]">
                      <Droplet className="w-4 h-4" />
                      Expense
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => handleEditClick(v)}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-neutral-400 hover:bg-neutral-800 transition-colors border-r border-neutral-800 min-w-[64px]">
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button onClick={() => handleDeleteClick(v.id)}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-red-400 hover:bg-red-500/10 transition-colors min-w-[64px]">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredVehicles.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Truck className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 font-black uppercase tracking-widest text-sm">No vehicles found.</p>
            <p className="text-neutral-600 text-xs mt-1">Register a new vehicle to get started.</p>
          </div>
        )}
      </div>

      {/* Floating FAB on mobile */}
      <button
        onClick={() => { setEditMode(false); setIsAddModalOpen(true); setFormLicensePlate(''); setFormType('TRUCK'); setFormTareWeight(''); setFormInsurance(''); setFormFitness(''); setFormPollution(''); setFormOwnerName(''); setFormContact(''); }}
        className={`fixed bottom-6 right-5 sm:hidden w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg z-30 active:scale-95 transition-transform ${activeTab === 'OWNED' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-[#F5A623] shadow-[#F5A623]/30'}`}>
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Commission Modal */}
      <Modal isOpen={isCommissionModalOpen} onClose={() => setIsCommissionModalOpen(false)} title="LOG FREIGHT COMMISSION">
        <form onSubmit={handleCommissionSubmit} className="space-y-6">
          <Input label="Amount (₹) *" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="text-xl font-bold" />
          <Input label="Description *" type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Inward Transport from Farm" />
          <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsCommissionModalOpen(false)}>CANCEL</Button>
            <Button type="submit" className="bg-[var(--gold)] text-white" disabled={isSubmitting}>RECORD COMMISSION</Button>
          </div>
        </form>
      </Modal>

      {/* Settle Modal */}
      <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title="SETTLE PAYMENT">
        <form onSubmit={handleSettleSubmit} className="space-y-6">
          <Input label="Payment Amount (₹) *" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="text-xl font-bold" />
          <Select label="Source Account" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
            <option value="">Cash Account</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
          </Select>
          <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsSettleModalOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>PAY NOW</Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="LOG VEHICLE EXPENSE">
        <form onSubmit={handleExpenseSubmit} className="space-y-6">
          <div className="relative">
            {isCreatingCategory ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input label="New Category Name *" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Toll Charges" />
                </div>
                <Button type="button" variant="ghost" onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }} className="mb-[2px]">Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select label="Expense Category *" required={!isCreatingCategory} value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                    <option value="">Select Category...</option>
                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <Button type="button" variant="ghost" onClick={() => { setIsCreatingCategory(true); setSelectedCategoryId(''); }} className="mb-[2px]"><Plus className="w-4 h-4 mr-1" /> New</Button>
              </div>
            )}
          </div>
          <Input label="Amount (₹) *" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="text-xl font-bold" />
          <Input label="Description *" type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. 50L Diesel, Tire Repair" />
          <Select label="Paid From" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
            <option value="">Cash Account</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
          </Select>
          <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="bg-sky-600">LOG EXPENSE</Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Vehicle Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
        title={`${editMode ? 'Edit' : 'Register'} ${activeTab === 'OWNED' ? 'Fleet Vehicle' : 'Third-Party Vehicle'}`}>
        <form onSubmit={handleAddSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="License Plate *" type="text" required value={formLicensePlate} onChange={e => setFormLicensePlate(e.target.value)} className="font-mono uppercase" />
            <Select label="Type *" value={formType} onChange={e => setFormType(e.target.value)}>
              <option value="TRUCK">Truck</option>
              <option value="TRACTOR">Tractor</option>
              <option value="AUTO">Auto/Light</option>
            </Select>
          </div>
          <Input label="Tare Weight (MT) - Optional" type="number" step="0.01" value={formTareWeight} onChange={e => setFormTareWeight(e.target.value)} />

          {activeTab === 'OWNED' ? (
            <div className="space-y-4 pt-4 border-t-2 border-dashed border-[var(--dust)]">
              <h4 className="font-display font-bold uppercase tracking-widest text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Compliance Documents
              </h4>
              <Input label="Insurance Expiry" type="date" value={formInsurance} onChange={e => setFormInsurance(e.target.value)} />
              <Input label="Fitness Expiry" type="date" value={formFitness} onChange={e => setFormFitness(e.target.value)} />
              <Input label="Pollution Expiry" type="date" value={formPollution} onChange={e => setFormPollution(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t-2 border-dashed border-[var(--dust)]">
              <h4 className="font-display font-bold uppercase tracking-widest text-[#F5A623] text-xs">Owner Details</h4>
              <Input label="Owner Name" type="text" value={formOwnerName} onChange={e => setFormOwnerName(e.target.value)} />
              <Input label="Contact Number" type="text" value={formContact} onChange={e => setFormContact(e.target.value)} />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t-2 border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}
              className={activeTab === 'OWNED' ? 'bg-emerald-600' : 'bg-[var(--gold)]'}>
              {editMode ? 'UPDATE' : 'SAVE'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

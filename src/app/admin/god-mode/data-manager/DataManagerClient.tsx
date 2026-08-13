'use client'

import { useState, useEffect } from 'react';
import { Database, AlertTriangle, Search, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner'; // Assuming sonner is used for toasts, standard for this app

const MODELS = [
  'User', 'Supplier', 'Farmer', 'Customer', 'Product', 'Godown',
  'PackingItem', 'Vehicle', 'Laborer', 'Bank', 'ExpenseCategory',
  'ProcurementBatch', 'LedgerEntry', 'Lot', 'StockMovement',
  'MillingSession', 'SalesInvoice', 'SalesInvoiceItem', 'PaymentTransaction',
  'LaborWage', 'Asset', 'MaintenanceLog', 'SparePart', 'PersonalLoan'
];

export function DataManagerClient() {
  const [selectedTable, setSelectedTable] = useState(MODELS[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [password, setPassword] = useState('');
  
  // Truncate State
  const [isTruncating, setIsTruncating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedTable]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/data/${selectedTable}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record: any) => {
    setEditingId(record.id);
    setEditForm(record);
    setPassword('');
  };

  const handleSave = async () => {
    if (!password) {
      toast.error("Super Admin password required.");
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/data/${selectedTable}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, _password: password })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      
      toast.success('Record updated successfully');
      setEditingId(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTruncate = async () => {
    if (!password) {
      toast.error("Super Admin password required to truncate.");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to TRUNCATE ${selectedTable}? This soft deletes all records!`)) return;

    try {
      const res = await fetch(`/api/admin/data/${selectedTable}/truncate`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _password: password })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to truncate');
      
      toast.success(json.message);
      setIsTruncating(false);
      setPassword('');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const renderTableHeaders = () => {
    if (data.length === 0) return <th>No Data</th>;
    return Object.keys(data[0]).map(key => (
      <th key={key} className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase tracking-wider bg-red-950/20 border-b border-red-900/30">
        {key}
      </th>
    ));
  };

  const renderTableRows = () => {
    if (data.length === 0) return <tr><td className="px-4 py-8 text-center text-red-300/50">No records found.</td></tr>;
    
    return data.map(record => (
      <tr key={record.id} className="hover:bg-red-950/20 transition-colors border-b border-red-900/10 group cursor-pointer" onClick={() => handleEditClick(record)}>
        {Object.entries(record).map(([key, val], idx) => (
          <td key={idx} className="px-4 py-3 text-sm text-red-100 max-w-[200px] truncate">
            {val === null ? <span className="text-red-500/50">null</span> : typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="w-1/3">
          <label className="block text-sm font-medium text-red-300 mb-2">Select Database Table</label>
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        
        <button 
          onClick={() => setIsTruncating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-950 text-red-400 hover:bg-red-900 hover:text-white border border-red-900 rounded-md transition-colors"
        >
          <AlertTriangle size={16} /> Truncate Table
        </button>
      </div>

      <div className="bg-[#1a1315] border border-red-900/40 rounded-lg overflow-x-auto shadow-xl">
        <table className="min-w-full">
          <thead>
            <tr>{renderTableHeaders()}</tr>
          </thead>
          <tbody className="divide-y divide-red-900/10">
            {loading ? <tr><td className="px-4 py-8 text-center text-red-300/50 animate-pulse">Loading data...</td></tr> : renderTableRows()}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1315] border border-red-900 rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Database className="text-red-500" /> Edit Record ({selectedTable})</h2>
              <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-white"><X /></button>
            </div>
            
            <div className="space-y-4 mb-6">
              {Object.entries(editForm).map(([key, val]) => {
                if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
                  return <div key={key} className="opacity-50"><label className="block text-xs text-red-300">{key}</label><input disabled value={String(val)} className="w-full bg-black/20 border border-red-900/20 rounded px-2 py-1 text-sm text-red-100" /></div>;
                }
                return (
                  <div key={key}>
                    <label className="block text-xs font-medium text-red-300 mb-1">{key}</label>
                    <input 
                      value={val === null ? '' : String(val)}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-red-900/30">
              <label className="block text-sm font-medium text-red-400 mb-2">Super Admin Password (Required to Save)</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password to confirm changes..."
                className="w-full bg-[#121212] border border-red-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 text-red-300 hover:text-white">Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"><Save size={16} /> Force Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Truncate Modal */}
      {isTruncating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1315] border border-red-600 rounded-lg max-w-md w-full p-6 shadow-[0_0_40px_rgba(220,38,38,0.2)]">
            <div className="text-center mb-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3 animate-pulse" />
              <h2 className="text-xl font-bold text-white mb-2">TRUNCATE TABLE</h2>
              <p className="text-sm text-red-300">You are about to softly delete ALL records in <span className="font-bold text-white">{selectedTable}</span>. This action is logged.</p>
            </div>

            <div className="space-y-4">
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Super Admin Password"
                className="w-full bg-[#121212] border border-red-500 rounded-md py-3 px-3 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono tracking-widest"
              />
              <div className="flex gap-3">
                <button onClick={() => {setIsTruncating(false); setPassword('');}} className="flex-1 px-4 py-2 text-red-300 hover:text-white border border-red-900/50 rounded-md hover:bg-red-950/30">Cancel</button>
                <button onClick={handleTruncate} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors font-bold"><Trash2 size={16} /> TRUNCATE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

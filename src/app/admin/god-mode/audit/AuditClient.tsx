'use client'

import { useState } from 'react';
import { Search, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

export function AuditClient({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState('');
  
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [password, setPassword] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.entity.toLowerCase().includes(search.toLowerCase()) ||
    l.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRevert = async () => {
    if (!password) {
      toast.error('Super Admin password required.');
      return;
    }
    
    setIsReverting(true);
    try {
      const res = await fetch(`/api/admin/god-mode/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: selectedLog.id, _password: password })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to revert action');
      
      toast.success('Action successfully reverted!');
      
      // Update local state to show it's reverted
      setLogs(logs.map(l => l.id === selectedLog.id ? { ...l, isReverted: true } : l));
      setSelectedLog(null);
      setPassword('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500/50 h-5 w-5" />
          <input 
            type="text"
            placeholder="Search audit logs by action, entity, or user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 pl-10 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="bg-[#1a1315] border border-red-900/40 rounded-lg overflow-x-auto shadow-xl">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase bg-red-950/20 border-b border-red-900/30">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase bg-red-950/20 border-b border-red-900/30">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase bg-red-950/20 border-b border-red-900/30">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase bg-red-950/20 border-b border-red-900/30">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-red-300 uppercase bg-red-950/20 border-b border-red-900/30">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-900/10">
            {filteredLogs.map(log => (
              <tr 
                key={log.id} 
                className={`hover:bg-red-950/20 transition-colors cursor-pointer ${log.isReverted ? 'opacity-50' : ''}`}
                onClick={() => setSelectedLog(log)}
              >
                <td className="px-4 py-3 text-sm text-red-100/70 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-100">{log.user.name}</td>
                <td className="px-4 py-3 text-sm font-mono text-red-400">{log.action}</td>
                <td className="px-4 py-3 text-sm font-mono text-red-100/80">{log.entity} <span className="text-xs text-red-500/50">({log.entityId})</span></td>
                <td className="px-4 py-3 text-sm">
                  {log.isReverted ? (
                    <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full text-xs">Reverted</span>
                  ) : (
                    <span className="bg-green-900/20 text-green-400 border border-green-900/30 px-2 py-0.5 rounded-full text-xs">Committed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1315] border border-red-600 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(225,29,72,0.15)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><RotateCcw className="text-red-500" /> Inspect & Revert Action</h2>
              <button onClick={() => setSelectedLog(null)} className="text-red-400 hover:text-white"><X /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden mb-6">
              <div className="flex flex-col border border-red-900/30 rounded-md overflow-hidden bg-black/30">
                <div className="bg-red-950/20 px-3 py-2 border-b border-red-900/30 text-red-300 text-sm font-medium">Before State</div>
                <pre className="p-3 text-xs font-mono text-red-100/80 overflow-auto flex-1">
                  {selectedLog.beforeState ? JSON.stringify(JSON.parse(selectedLog.beforeState), null, 2) : 'null'}
                </pre>
              </div>
              <div className="flex flex-col border border-red-900/30 rounded-md overflow-hidden bg-black/30">
                <div className="bg-red-950/20 px-3 py-2 border-b border-red-900/30 text-red-300 text-sm font-medium">After State</div>
                <pre className="p-3 text-xs font-mono text-green-400/80 overflow-auto flex-1">
                  {selectedLog.afterState ? JSON.stringify(JSON.parse(selectedLog.afterState), null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="border-t border-red-900/30 pt-4 mt-auto">
              {selectedLog.isReverted ? (
                <div className="text-center text-red-400 py-2 border border-red-900/50 bg-red-950/20 rounded-md">
                  This action has already been reverted.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-red-400 mb-3 bg-red-950/30 p-2 rounded">
                    <AlertTriangle size={16} /> Reverting will attempt to restore the "Before State". If this was a delete, it will undelete.
                  </div>
                  <input 
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Super Admin Password to confirm Revert"
                    className="w-full bg-[#121212] border border-red-500 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setSelectedLog(null)} className="px-4 py-2 text-red-300 hover:text-white">Cancel</button>
                    <button 
                      onClick={handleRevert} 
                      disabled={isReverting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={16} /> Execute Reversal
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

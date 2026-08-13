'use client'

import { useState } from 'react';
import { Database, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function BackupClient() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [password, setPassword] = useState('');
  const [backups, setBackups] = useState<{ id: string, date: string, size: string, status: string }[]>([
    { id: 'snp_12345', date: '2026-08-13T12:00:00.000Z', size: '14.2 MB', status: 'COMPLETED' }
  ]); // Mock initial state since we aren't persisting backup records to DB yet

  const handleCreateSnapshot = async () => {
    if (!password) {
      toast.error('Super Admin password required.');
      return;
    }

    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/god-mode/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _password: password })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create snapshot');

      toast.success('Database snapshot generated successfully.');
      setBackups([{
        id: `snp_${Date.now()}`,
        date: new Date().toISOString(),
        size: json.size || 'Unknown',
        status: 'COMPLETED'
      }, ...backups]);
      setPassword('');
      
      // If the backend returns a URL or file content, we could trigger a download here
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">Create New Snapshot</h3>
          <p className="text-sm text-red-300/70 mb-6">Generates a logical SQL dump using pg_dump. This may take several minutes depending on database size.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-red-300 mb-1">Super Admin Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required for backup"
                className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button 
              onClick={handleCreateSnapshot}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-800 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Database size={18} />
              {isBackingUp ? 'Generating Snapshot...' : 'Initiate Snapshot'}
            </button>
          </div>
        </div>

        <div className="bg-[#1a1315] border border-red-900/40 p-4 rounded-lg flex gap-3 items-start">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <p className="text-xs text-red-300/80 leading-relaxed">
            Snapshots are stored on the server's local file system. Frequent backups can consume significant disk space. Ensure you periodically download and delete old snapshots.
          </p>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-[#1a1315] border border-red-900/40 rounded-lg overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-red-900/30 bg-red-950/20">
            <h3 className="text-lg font-medium text-white">Snapshot History</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {backups.map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-4 border border-red-900/30 bg-black/40 rounded-lg hover:border-red-500/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-950/50 flex items-center justify-center text-red-500 border border-red-900/50">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="text-red-100 font-medium font-mono text-sm">{backup.id}.sql</h4>
                    <div className="flex items-center gap-3 text-xs text-red-300/50 mt-1">
                      <span>{new Date(backup.date).toLocaleString()}</span>
                      <span>•</span>
                      <span>{backup.size}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} /> {backup.status}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <button className="p-2 text-red-400 hover:text-white hover:bg-red-900/50 rounded-full transition-colors" title="Download Snapshot">
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

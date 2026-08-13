import { Database } from 'lucide-react';
import { BackupClient } from './BackupClient';

export const metadata = { title: 'Database Snapshots | God Mode' };

export default function BackupsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <Database className="text-red-500" />
          Database Snapshots
        </h1>
        <p className="text-red-400">Generate and manage point-in-time SQL dumps of the entire database.</p>
      </div>

      <BackupClient />
    </div>
  );
}

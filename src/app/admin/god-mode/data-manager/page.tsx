import { DataManagerClient } from './DataManagerClient';
import { Database } from 'lucide-react';

export const metadata = {
  title: 'Data Manager | God Mode',
};

export default function GodModeDataManager() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <Database className="text-red-500" />
          Dynamic Data Manager
        </h1>
        <p className="text-red-400">Directly view and edit raw records across the entire database. Operations bypass standard business logic.</p>
      </div>

      <DataManagerClient />
    </div>
  );
}

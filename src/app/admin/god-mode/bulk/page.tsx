import { FileSpreadsheet } from 'lucide-react';
import { BulkClient } from './BulkClient';

export const metadata = { title: 'Bulk Import/Export | God Mode' };

export default function BulkPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <FileSpreadsheet className="text-red-500" />
          Bulk Data Utilities
        </h1>
        <p className="text-red-400">Mass import or export records via CSV. Use with extreme caution as this bypasses standard validation.</p>
      </div>

      <BulkClient />
    </div>
  );
}

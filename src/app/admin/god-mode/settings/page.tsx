import prisma from '@/lib/prisma';
import { Settings, Plus } from 'lucide-react';
import { SettingsClient } from './SettingsClient';

export const metadata = { title: 'Global Settings | God Mode' };

export default async function SettingsPage() {
  const settings = await prisma.globalSetting.findMany({
    orderBy: { key: 'asc' }
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
            <Settings className="text-red-500" />
            Global Settings Store
          </h1>
          <p className="text-red-400">Low-level key-value configuration store for the ERP.</p>
        </div>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}

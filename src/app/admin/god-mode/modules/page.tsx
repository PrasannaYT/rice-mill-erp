import prisma from '@/lib/prisma';
import { Settings, Shield, Power } from 'lucide-react';
import { ModuleToggle } from './ModuleToggle';

export const dynamic = 'force-dynamic';

export default async function GodModeModules() {
  const settings = await prisma.globalSetting.findMany();
  
  const getSetting = (key: string, defaultVal: boolean) => {
    const s = settings.find(s => s.key === key);
    return s ? s.value === 'true' : defaultVal;
  };

  const modules = [
    { key: 'MODULE_MASTER_DATA', name: 'Master Data', description: 'Core ERP entity management', enabled: getSetting('MODULE_MASTER_DATA', true) },
    { key: 'MODULE_PROCUREMENT', name: 'Procurement', description: 'Inbound weighbridge & paddy purchase', enabled: getSetting('MODULE_PROCUREMENT', true) },
    { key: 'MODULE_INVENTORY', name: 'Inventory', description: 'Godowns, stock management & dispatch', enabled: getSetting('MODULE_INVENTORY', true) },
    { key: 'MODULE_SALES', name: 'Sales & Dispatch', description: 'Invoicing and outbound logistics', enabled: getSetting('MODULE_SALES', true) },
    { key: 'MODULE_CASHIER', name: 'Cashier', description: 'Accounting, ledgers, and transactions', enabled: getSetting('MODULE_CASHIER', true) },
    { key: 'MODULE_PAYROLL', name: 'Payroll', description: 'Labor wages & hamali management', enabled: getSetting('MODULE_PAYROLL', true) },
    { key: 'MODULE_VEHICLES', name: 'Vehicles & Fleet', description: 'Fleet maintenance and tracking', enabled: getSetting('MODULE_VEHICLES', true) },
    { key: 'MODULE_REPORTS', name: 'Reports & P&L', description: 'Financial analytics and reporting', enabled: getSetting('MODULE_REPORTS', true) },
    { key: 'MODULE_PERSONAL_DEBT', name: 'Personal Debt', description: 'Private loans and EMI management', enabled: getSetting('MODULE_PERSONAL_DEBT', true) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <Settings className="text-red-500" />
          Module Configuration
        </h1>
        <p className="text-red-400">Toggle core ERP modules on or off for the entire company.</p>
      </div>

      <div className="bg-[#1a1315] border border-red-900/40 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-red-900/30 bg-red-950/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-red-500 h-6 w-6" />
            <div>
              <h3 className="text-lg font-medium text-white">Feature Flags</h3>
              <p className="text-sm text-red-300/50">Disabling a module instantly hides it from the main dashboard for all users.</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-red-900/20">
          {modules.map((mod) => (
            <div key={mod.key} className="p-6 flex items-center justify-between hover:bg-red-950/10 transition-colors">
              <div>
                <h4 className="text-red-100 font-medium text-lg">{mod.name}</h4>
                <p className="text-red-300/60 text-sm">{mod.description}</p>
              </div>
              <div>
                <ModuleToggle settingKey={mod.key} initialEnabled={mod.enabled} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

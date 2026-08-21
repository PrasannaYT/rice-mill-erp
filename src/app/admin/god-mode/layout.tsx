import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import Link from 'next/link';
import { AlertTriangle, Database, Activity, Server, Settings, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { AppHeader } from '@/components/ui/AppHeader';

export default async function GodModeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const menuItems = [
    { name: 'Command Center', href: '/admin/god-mode', icon: Activity },
    { name: 'Data Manager', href: '/admin/god-mode/data-manager', icon: Database },
    { name: 'Module Config', href: '/admin/god-mode/modules', icon: Settings },
    { name: 'System Health', href: '/admin/god-mode/health', icon: Server },
    { name: 'Audit Reversal Engine', href: '/admin/god-mode/audit', icon: ShieldAlert },
    { name: 'Global Settings', href: '/admin/god-mode/settings', icon: Settings },
    { name: 'Backups (Snapshots)', href: '/admin/god-mode/backups', icon: Database },
    { name: 'Bulk Import/Export', href: '/admin/god-mode/bulk', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-red-50 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      <AppHeader title="SUPER ADMIN :: GOD MODE" showBack backHref="/dashboard" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#121212] border-r border-red-900/30 flex flex-col h-[calc(100vh-4rem)] shadow-[4px_0_24px_rgba(225,29,72,0.1)]">
          <div className="p-4 border-b border-red-900/30">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <span className="font-bold tracking-widest text-sm uppercase">Extreme Caution</span>
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-red-200/70 hover:text-red-400 hover:bg-red-950/40 transition-all border border-transparent hover:border-red-900/30 group"
                  >
                    <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

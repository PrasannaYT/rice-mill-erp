import prisma from '@/lib/prisma';
import { Activity, Users, Database, ShieldAlert, Cpu } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GodModeDashboard() {
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.userSession.count({ where: { isValid: true } });
  
  // Get database size (PostgreSQL specific)
  const dbSizeRaw = await prisma.$queryRaw<Array<{ size: string }>>`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size;
  `;
  const dbSize = dbSizeRaw[0]?.size || 'Unknown';

  const recentLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight">Command Center</h1>
        <p className="text-red-400">Super Admin Overview. You have absolute access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-red-500" />
          </div>
          <h3 className="text-red-300/70 text-sm font-medium uppercase tracking-wider mb-1">Total Users</h3>
          <p className="text-4xl font-bold text-white">{userCount}</p>
        </div>

        <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={64} className="text-red-500" />
          </div>
          <h3 className="text-red-300/70 text-sm font-medium uppercase tracking-wider mb-1">Database Size</h3>
          <p className="text-4xl font-bold text-white">{dbSize}</p>
        </div>

        <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} className="text-red-500" />
          </div>
          <h3 className="text-red-300/70 text-sm font-medium uppercase tracking-wider mb-1">Active Sessions</h3>
          <p className="text-4xl font-bold text-white">{sessionCount}</p>
        </div>
      </div>

      <div className="bg-[#1a1315] border border-red-900/40 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-red-900/30 flex items-center gap-2">
          <ShieldAlert className="text-red-500 h-5 w-5" />
          <h3 className="text-lg font-medium text-white">Recent Security Audit Logs</h3>
        </div>
        <div className="divide-y divide-red-900/20">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-red-300/50">No audit logs found.</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between hover:bg-red-950/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400 font-medium">{log.user.name}</span>
                    <span className="text-red-300/50 text-sm">({log.user.email})</span>
                  </div>
                  <p className="text-red-100/80 text-sm">
                    Performed <span className="font-mono text-red-300 bg-red-950 px-1 py-0.5 rounded">{log.action}</span> on <span className="font-mono text-red-300 bg-red-950 px-1 py-0.5 rounded">{log.entity}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-red-300/50">{new Date(log.createdAt).toLocaleString()}</span>
                  {log.isReverted && (
                    <div className="mt-1">
                      <span className="text-[10px] uppercase tracking-wider bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">Reverted</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

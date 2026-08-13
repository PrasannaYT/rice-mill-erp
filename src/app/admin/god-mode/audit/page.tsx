import prisma from '@/lib/prisma';
import { ShieldAlert } from 'lucide-react';
import { AuditClient } from './AuditClient';

export const metadata = { title: 'Audit Reversal Engine | God Mode' };

export default async function AuditPage() {
  // Fetch latest 500 audit logs
  const logs = await prisma.auditLog.findMany({
    take: 500,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-red-500" />
          Audit Reversal Engine
        </h1>
        <p className="text-red-400">View absolute system history. Revert any action, undelete records, and trace user activity.</p>
      </div>

      <AuditClient initialLogs={logs} />
    </div>
  );
}

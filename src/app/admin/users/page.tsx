import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { UserRepository } from "@/repositories/userRepository";
import { AppHeader } from "@/components/ui/AppHeader";
import UserTable from "@/components/UserTable";
import { Users, Shield, HardHat } from "lucide-react";

export const metadata = {
  title: 'User Management - Rice Mill ERP',
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const users = await UserRepository.list();

  // KPIs
  const totalUsers = users.length;
  const activeAdmins = users.filter(u => u.isActive && (u.role === 'ADMIN' || u.role === 'MILL_OWNER')).length;
  const activeOperators = users.filter(u => u.isActive && u.role !== 'ADMIN' && u.role !== 'MANAGER' && u.role !== 'MILL_OWNER').length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader title="User Management" subtitle="Manage system access and roles" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Users'}]} />
      
      <div className="page-wrapper pb-32 space-y-8">
        
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
          <div className="card-brutal p-5 bg-[var(--surface-2)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Total Users</p>
              <h2 className="text-3xl font-black tabular-nums">{totalUsers}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 text-blue-600 rounded flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="card-brutal p-5 bg-[var(--surface-2)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Admins / Owners</p>
              <h2 className="text-3xl font-black tabular-nums">{activeAdmins}</h2>
            </div>
            <div className="w-12 h-12 bg-red-500/20 text-red-600 rounded flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <div className="card-brutal p-5 bg-[var(--surface-2)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Active Operators</p>
              <h2 className="text-3xl font-black tabular-nums">{activeOperators}</h2>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 text-orange-600 rounded flex items-center justify-center">
              <HardHat className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* User Table Component handles Add Modal and List */}
        <UserTable users={users} currentUserId={session.user.id} currentUserRole={session.user.role} />

      </div>
    </div>
  );
}

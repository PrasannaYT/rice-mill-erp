import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { UserRepository } from "@/repositories/userRepository";
import { createUserAction } from "@/app/actions/userActions";
import Link from "next/link";
import { Users, Plus, ArrowLeft } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: 'User Management - Rice Mill ERP',
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await UserRepository.list();

  return (
    <div className="min-h-screen">
      <AppHeader title="User Management" subtitle="Manage system users and their access roles" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Users'}]} />
      
      <div className="page-wrapper pb-32">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Form */}
          <div className="lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--blue)]" /> Add New User
            </h2>
            <form action={createUserAction} className="space-y-6">
              <Input label="Full Name *" type="text" name="name" required placeholder="e.g. John Doe" />
              <Input label="Email Address *" type="email" name="email" required placeholder="e.g. john@mill.com" />
              <Input label="Password *" type="password" name="password" required placeholder="••••••••" />
              
              <Select label="Role / Access Level *" name="role" required>
                <option value="WEIGHBRIDGE_OPERATOR">Weighbridge Operator (Procurement, Sales)</option>
                <option value="FLOOR_MANAGER">Floor Manager (Inventory & Storage)</option>
                <option value="ACCOUNTANT">Accountant (Accounting, Payroll, Procurement, Sales)</option>
                <option value="MANAGER">Manager (All Modules except Users)</option>
                <option value="ADMIN">Super Admin (Full Access)</option>
              </Select>
              
              <Button type="submit" variant="primary" className="w-full bg-[var(--ink)] text-white mt-4">
                CREATE USER
              </Button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <UserTable users={users} currentUserId={session.user.id} />
          </div>
        </div>

      </div>
    </div>
  );
}

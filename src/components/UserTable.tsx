'use client';

import { useState } from 'react';
import { Trash2, Edit, KeySquare, Plus, Search } from 'lucide-react';
import { updateUserAction, resetPasswordAction, deleteUserAction, createUserAction } from '@/app/actions/userActions';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';
import { motion, AnimatePresence } from 'framer-motion';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

function getRoleColor(role: string) {
  switch(role) {
    case 'ADMIN': return 'bg-red-500/20 text-red-500 border-red-500';
    case 'MILL_OWNER': return 'bg-purple-500/20 text-purple-500 border-purple-500';
    case 'MANAGER': return 'bg-blue-500/20 text-blue-500 border-blue-500';
    case 'ACCOUNTANT': return 'bg-green-500/20 text-green-500 border-green-500';
    default: return 'bg-orange-500/20 text-orange-500 border-orange-500';
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function UserTable({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: User[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const addAction = useFormAction();
  const editAction = useFormAction();
  const resetAction = useFormAction();
  const deleteAction = useFormAction();

  // ── Add ───────────────────────────────────────────────────
  const handleAddSubmit = addAction.wrap(async (formData: FormData) => {
    await createUserAction(formData);
    setIsAddOpen(false);
  });

  // ── Edit ──────────────────────────────────────────────────
  const handleEditSubmit = editAction.wrap(async (formData: FormData) => {
    await updateUserAction(formData);
    setEditingUser(null);
  });

  // ── Reset password ────────────────────────────────────────
  const handleResetSubmit = resetAction.wrap(async (formData: FormData) => {
    await resetPasswordAction(formData);
    setResettingUser(null);
  });

  // ── Delete ────────────────────────────────────────────────
  const handleDeleteConfirm = deleteAction.wrap(async () => {
    if (!deletingUser) return;
    const formData = new FormData();
    formData.append('id', deletingUser.id);
    await deleteUserAction(formData);
    setDeletingUser(null);
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    if (currentUserRole === 'MILL_OWNER' && u.role === 'SUPER_ADMIN') return false;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="input-brutal w-full bg-[var(--surface-2)]"
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={() => { addAction.clearError(); setIsAddOpen(true); }} className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" /> ADD USER
        </Button>
      </div>

      <div className="card-brutal p-0 overflow-hidden bg-[var(--surface)] animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[var(--surface-2)] border-b-2 border-[var(--border)]">
              <tr>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)] w-1/3">User Profile</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">Role</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">Status</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-[var(--surface-2)] transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center font-black text-sm border-2 ${getRoleColor(user.role)}`}>
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-wider text-[var(--text)]">{user.name}</div>
                          <div className="text-xs font-bold text-[var(--muted)] mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={`font-black tracking-wider ${getRoleColor(user.role).replace('border-', 'border-').replace('text-', 'text-').split(' ')[1]}`}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? 'green' : 'outline'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 focus-within:!opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => { editAction.clearError(); setEditingUser(user); }}
                          className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Edit ${user.name}`}
                          disabled={currentUserRole === 'MILL_OWNER' && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')}
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { resetAction.clearError(); setResettingUser(user); }}
                          className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Reset password for ${user.name}`}
                          disabled={currentUserRole === 'MILL_OWNER' && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')}
                        >
                          <KeySquare className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {user.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => { deleteAction.clearError(); setDeletingUser(user); }}
                            className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Delete ${user.name}`}
                            disabled={currentUserRole === 'MILL_OWNER' && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center font-bold text-[var(--muted)] uppercase tracking-wider">
                    {users.length === 0 ? 'No users in system.' : 'No users match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Modal ─────────────────────────────────────── */}
      <Modal isOpen={isAddOpen} onClose={() => !addAction.pending && setIsAddOpen(false)} title="Create New User">
        <form action={handleAddSubmit} className="space-y-5">
          <FormErrorBanner message={addAction.error} onDismiss={addAction.clearError} />

          <Input label="Full Name *" type="text" name="name" required placeholder="e.g. John Doe" />
          <Input label="Email Address *" type="email" name="email" required placeholder="e.g. john@mill.com" />
          <Input label="Password *" type="password" name="password" required placeholder="••••••••" />
          
          <Select label="Role / Access Level *" name="role" required>
            <option value="WEIGHBRIDGE_OPERATOR">Weighbridge Operator</option>
            <option value="FLOOR_MANAGER">Floor Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="MANAGER">Manager</option>
            {['ADMIN', 'SUPER_ADMIN', 'MILL_OWNER'].includes(currentUserRole) && <option value="MILL_OWNER">Mill Owner</option>}
            {['ADMIN', 'SUPER_ADMIN'].includes(currentUserRole) && <option value="ADMIN">Admin</option>}
          </Select>
          
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={addAction.pending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────── */}
      <Modal isOpen={!!editingUser} onClose={() => !editAction.pending && setEditingUser(null)} title="Edit Profile">
        {editingUser && (
          <form action={handleEditSubmit} className="space-y-5">
            <FormErrorBanner message={editAction.error} onDismiss={editAction.clearError} />

            <input type="hidden" name="id" value={editingUser.id} />
            <Input label="Full Name *" type="text" name="name" required defaultValue={editingUser.name} />
            <Input label="Email Address *" type="email" name="email" required defaultValue={editingUser.email} />
            
            <Select label="Role *" name="role" required defaultValue={editingUser.role}>
              <option value="WEIGHBRIDGE_OPERATOR">Weighbridge Operator</option>
              <option value="FLOOR_MANAGER">Floor Manager</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MANAGER">Manager</option>
              {(['ADMIN', 'SUPER_ADMIN', 'MILL_OWNER'].includes(currentUserRole) || editingUser.role === 'MILL_OWNER') && <option value="MILL_OWNER">Mill Owner</option>}
              {(['ADMIN', 'SUPER_ADMIN'].includes(currentUserRole) || editingUser.role === 'ADMIN') && <option value="ADMIN">Admin</option>}
            </Select>

            <Select label="Status *" name="isActive" required defaultValue={editingUser.isActive ? 'true' : 'false'}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={editAction.pending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Reset Password Modal ────────────────────────────── */}
      <Modal isOpen={!!resettingUser} onClose={() => !resetAction.pending && setResettingUser(null)} title="Reset Password">
        {resettingUser && (
          <form action={handleResetSubmit} className="space-y-5">
            <FormErrorBanner message={resetAction.error} onDismiss={resetAction.clearError} />
            <input type="hidden" name="id" value={resettingUser.id} />
            
            <div>
              <p className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                User: {resettingUser.name}
              </p>
              <p className="text-xs text-[var(--muted)]">Provide a new password for this account.</p>
            </div>
            
            <Input label="New Password *" type="password" name="password" required />

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setResettingUser(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={resetAction.pending}>
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <Modal isOpen={!!deletingUser} onClose={() => !deleteAction.pending && setDeletingUser(null)} title="Delete User">
        {deletingUser && (
          <form action={handleDeleteConfirm} className="space-y-5">
            <FormErrorBanner message={deleteAction.error} onDismiss={deleteAction.clearError} />
            <input type="hidden" name="id" value={deletingUser.id} />
            <div className="p-4 bg-[var(--rust)]/10 border-2 border-[var(--rust)]/20 rounded">
              <p className="text-sm text-[var(--text)] font-bold">
                Are you sure you want to delete <span className="uppercase text-[var(--rust)]">{deletingUser.name}</span>?
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeletingUser(null)}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-[var(--rust)] text-white hover:bg-red-700" 
                loading={deleteAction.pending}
              >
                Delete Account
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

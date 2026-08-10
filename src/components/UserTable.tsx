'use client';

import { useState } from 'react';
import { Trash2, Edit, KeySquare, AlertTriangle } from 'lucide-react';
import { updateUserAction, resetPasswordAction, deleteUserAction } from '@/app/actions/userActions';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export default function UserTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const editAction = useFormAction();
  const resetAction = useFormAction();
  const deleteAction = useFormAction();

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
  function openDelete(user: User) {
    deleteAction.clearError();
    setDeletingUser(user);
  }

  const handleDeleteConfirm = deleteAction.wrap(async () => {
    if (!deletingUser) return;
    const formData = new FormData();
    formData.append('id', deletingUser.id);
    await deleteUserAction(formData);
    setDeletingUser(null);
  });

  return (
    <>
      <div className="card-brutal p-0 overflow-hidden bg-[var(--surface)] animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--surface-2)] border-b-2 border-[var(--border)]">
              <tr>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">User</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">Role</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">Status</th>
                <th scope="col" className="p-4 font-display font-black text-[10px] uppercase tracking-widest text-[var(--muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-dashed divide-[var(--dust)]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--surface-2)] transition-colors group">
                  <td className="p-4">
                    <div className="font-black uppercase tracking-wider text-[var(--text)]">{user.name}</div>
                    <div className="text-xs font-bold text-[var(--muted)] mt-1">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant={
                      user.role === 'ADMIN' ? 'red' :
                      user.role === 'MANAGER' ? 'blue' :
                      user.role === 'ACCOUNTANT' ? 'green' : 'orange'
                    }>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.isActive ? 'green' : 'outline'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    {/*
                      A11y: action buttons must always be visible and keyboard-reachable.
                      Removed opacity-0/group-hover pattern — replaced with sm:opacity-0 that
                      restores on focus-within so keyboard users can always reach the buttons.
                    */}
                    <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 focus-within:!opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { editAction.clearError(); setEditingUser(user); }}
                        className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[#0284c7] hover:text-white transition-colors"
                        aria-label={`Edit ${user.name}`}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { resetAction.clearError(); setResettingUser(user); }}
                        className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-orange-500 hover:text-white transition-colors"
                        aria-label={`Reset password for ${user.name}`}
                      >
                        <KeySquare className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {user.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => openDelete(user)}
                          className="w-8 h-8 min-w-[44px] min-h-[44px] bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--rust)] hover:text-white transition-colors"
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────── */}
      <Modal isOpen={!!editingUser} onClose={() => !editAction.pending && setEditingUser(null)} title="Edit Profile">
        {editingUser && (
          <form action={handleEditSubmit} className="space-y-5">
            <FormErrorBanner message={editAction.error} onDismiss={editAction.clearError} />

            <input type="hidden" name="id" value={editingUser.id} />
            <Input label="Full Name *" type="text" name="name" defaultValue={editingUser.name} required />
            <Input label="Email Address *" type="email" name="email" defaultValue={editingUser.email} required />

            <Select label="Role / Access Level *" name="role" defaultValue={editingUser.role} required>
              <option value="WEIGHBRIDGE_OPERATOR">Weighbridge Operator (Procurement, Sales)</option>
              <option value="FLOOR_MANAGER">Floor Manager (Inventory &amp; Storage)</option>
              <option value="ACCOUNTANT">Accountant (Accounting, Payroll, Procurement, Sales)</option>
              <option value="MANAGER">Manager (All Modules except Users)</option>
              <option value="ADMIN">Super Admin (Full Access)</option>
            </Select>

            <Select label="Account Status *" name="isActive" defaultValue={editingUser.isActive ? 'true' : 'false'} required>
              <option value="true">Active</option>
              <option value="false">Inactive / Suspended</option>
            </Select>

            <div className="bg-orange-500 text-white p-4 border-2 border-[var(--border)] shadow-[4px_4px_0px_#0D0D0B] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider">
                Changing roles takes effect immediately on next sign-in.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border)]">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} disabled={editAction.pending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={editAction.pending} className="bg-[#0284c7]">
                {editAction.pending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Reset Password Modal ───────────────────────────── */}
      <Modal isOpen={!!resettingUser} onClose={() => !resetAction.pending && setResettingUser(null)} title="Reset Password">
        {resettingUser && (
          <form action={handleResetSubmit} className="space-y-5">
            <p className="text-sm font-bold text-[var(--muted)]">
              You are resetting the password for{' '}
              <strong className="text-[var(--text)]">{resettingUser.name}</strong>{' '}
              ({resettingUser.email}).
            </p>

            <FormErrorBanner message={resetAction.error} onDismiss={resetAction.clearError} />

            <input type="hidden" name="id" value={resettingUser.id} />
            <Input label="New Password *" type="password" name="password" minLength={6} required placeholder="Enter new secure password" />

            <div className="bg-[var(--rust)] text-white p-4 border-2 border-[var(--border)] shadow-[4px_4px_0px_#0D0D0B] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider">
                This will instantly overwrite the user&apos;s current password.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border)]">
              <Button type="button" variant="ghost" onClick={() => setResettingUser(null)} disabled={resetAction.pending}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={resetAction.pending}>
                {resetAction.pending ? 'Resetting...' : 'Force Reset'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────── */}
      <Modal isOpen={!!deletingUser} onClose={() => !deleteAction.pending && setDeletingUser(null)} title="Delete User">
        {deletingUser && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Permanently delete{' '}
              <strong className="text-[var(--text)]">{deletingUser.name}</strong>?
              This action cannot be undone.
            </p>

            <FormErrorBanner message={deleteAction.error} onDismiss={deleteAction.clearError} />

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setDeletingUser(null)}
                disabled={deleteAction.pending}
                autoFocus
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                loading={deleteAction.pending}
                onClick={() => handleDeleteConfirm(new FormData())}
              >
                {deleteAction.pending ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

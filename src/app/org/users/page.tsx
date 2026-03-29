'use client';

import { useEffect, useState } from 'react';
import { UserPlus, RefreshCw, Trash2, Pencil, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InviteModal } from '@/components/org/InviteModal';
import { showErrorToast } from '@/utils/toast.utils';

interface InviteRow {
  _id: string;
  email: string;
  role: string;
  status: 'pending' | 'expired';
  expiresAt: string;
}

interface CollectionRef {
  id: string;
  name: string;
}

interface UserRow {
  _id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'active' | 'invited';
  createdAt: string;
  isSuperAdmin: boolean;
  collections: CollectionRef[];
}

export default function OrgUsersPage() {
  const { data: session } = useSession();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [collectionsTarget, setCollectionsTarget] = useState<UserRow | null>(null);
  const [allCollections, setAllCollections] = useState<CollectionRef[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [savingCollections, setSavingCollections] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchInvites(), fetchAllCollections()]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    const res = await fetch('/api/org/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  }

  async function fetchAllCollections() {
    const res = await fetch('/api/collections');
    if (res.ok) {
      const data = await res.json();
      setAllCollections((data.collections ?? []).map((c: { _id: string; name: string }) => ({ id: c._id, name: c.name })));
    }
  }

  async function fetchInvites() {
    const res = await fetch('/api/invites');
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => u._id === userId ? { ...u, role: newRole as UserRow['role'] } : u)
    );
    const res = await fetch(`/api/org/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      showErrorToast('Failed to update role');
      await fetchUsers(); // revert by re-fetching
    }
  }

  async function handleRemoveUser(userId: string) {
    const res = await fetch(`/api/org/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setRemoveTarget(null);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      showErrorToast(data.error ?? 'Failed to remove user');
      setRemoveTarget(null);
    }
  }

  function handleInviteSuccess(invite: Record<string, unknown>) {
    // Optimistically add the new row
    setInvites((prev) => [invite as unknown as InviteRow, ...prev]);
  }

  async function handleResend(id: string) {
    const res = await fetch(`/api/invites/${id}/resend`, { method: 'POST' });
    if (res.ok) {
      // Update row's expiresAt and status in-place
      const data = await res.json();
      setInvites((prev) =>
        prev.map((inv) => (inv._id === id ? { ...inv, ...data.invite, status: 'pending' } : inv))
      );
    }
  }

  function openCollectionsDialog(user: UserRow) {
    setCollectionsTarget(user);
    setSelectedCollectionIds(new Set(user.collections.map((c) => c.id)));
  }

  async function handleSaveCollections() {
    if (!collectionsTarget) return;
    setSavingCollections(true);
    const res = await fetch(`/api/org/users/${collectionsTarget._id}/collections`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionIds: Array.from(selectedCollectionIds) }),
    });
    setSavingCollections(false);
    if (res.ok) {
      const updated = allCollections.filter((c) => selectedCollectionIds.has(c.id));
      setUsers((prev) =>
        prev.map((u) => u._id === collectionsTarget._id ? { ...u, collections: updated } : u)
      );
      setCollectionsTarget(null);
    } else {
      showErrorToast('Failed to update collection access');
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvites((prev) => prev.filter((inv) => inv._id !== id));
    }
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage team members and pending invitations.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-0">Members</h2>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Collections</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            )}
            {!loading && users.length === 0 && invites.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No members yet. Click &quot;Invite User&quot; to get started.</td>
              </tr>
            )}
            {!loading && users.map((user) => {
              const isSelf = user._id === session?.user?.id;
              const canAct = !user.isSuperAdmin && !isSelf;
              return (
                <tr
                  key={user._id}
                  className="border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user._id, newRole)}
                      disabled={!canAct}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => canAct && openCollectionsDialog(user)}
                      className={`flex items-center gap-1.5 text-sm group ${canAct ? 'cursor-pointer hover:text-gray-900 dark:hover:text-gray-100' : 'cursor-default'} text-gray-600 dark:text-gray-300`}
                      title={canAct ? 'Edit collection access' : undefined}
                    >
                      {user.collections.length === 0
                        ? <span className="text-gray-400 dark:text-gray-500">All collections</span>
                        : <span>{user.collections.map((c) => c.name).join(', ')}</span>
                      }
                      {canAct && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
                      {user.status === 'active' ? 'Active' : 'Invited'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveTarget(user)}
                      disabled={!canAct}
                      title={!canAct ? (user.isSuperAdmin ? 'Cannot remove superadmin' : 'Cannot remove yourself') : 'Remove user'}
                      className="text-red-500 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!loading && invites.map((invite) => {
              const expired = isExpired(invite.expiresAt);
              return (
                <tr
                  key={invite._id}
                  className="border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500">—</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{invite.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{invite.role}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-sm">—</td>
                  <td className="px-4 py-3">
                    <Badge variant={expired ? 'destructive' : 'outline'}>
                      {expired ? 'Expired' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(invite._id)}
                        title="Resend invitation email"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invite._id)}
                        title="Revoke invitation"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InviteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleInviteSuccess}
      />

      {/* Collection access dialog */}
      <Dialog open={collectionsTarget !== null} onOpenChange={(open) => { if (!open) setCollectionsTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Collection access — {collectionsTarget?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {/* All collections option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selectedCollectionIds.size === 0}
                onCheckedChange={(checked) => { if (checked) setSelectedCollectionIds(new Set()); }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All collections</span>
            </label>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex flex-col gap-2">
              {allCollections.map((c) => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedCollectionIds.has(c.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCollectionIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(c.id); else next.delete(c.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCollectionsTarget(null)} disabled={savingCollections}>Cancel</Button>
            <Button onClick={handleSaveCollections} disabled={savingCollections}>
              {savingCollections ? 'Saving...' : <><Check className="mr-2 h-4 w-4" />Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {removeTarget?.email} from the org. They will lose access on their next request.
              This action can be undone by re-inviting the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && handleRemoveUser(removeTarget._id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

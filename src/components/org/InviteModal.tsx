'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface Collection {
  _id: string;
  name: string;
}

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (invite: Record<string, unknown>) => void;
}

export function InviteModal({ open, onOpenChange, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => setCollections(data.collections ?? []))
      .catch(() => {});
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEmail('');
      setRole('Editor');
      setSelectedIds(new Set());
      setError(null);
      setLoading(false);
    }
    onOpenChange(nextOpen);
  };

  const toggleCollection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        role,
        ...(selectedIds.size > 0 ? { collectionIds: Array.from(selectedIds) } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Failed to send invite. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess((data as { invite: Record<string, unknown> }).invite);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Editor">Editor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {collections.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Collection access
              </span>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectedIds.size === 0}
                  onCheckedChange={(checked) => { if (checked) setSelectedIds(new Set()); }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">All collections</span>
              </label>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex flex-col gap-2">
                {collections.map((c) => (
                  <label key={c._id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedIds.has(c._id)}
                      onCheckedChange={(checked) => toggleCollection(c._id, !!checked)}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

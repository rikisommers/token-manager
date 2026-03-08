import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveCollectionDialogProps {
  isOpen: boolean;
  initialName?: string;           // pre-filled when overwriting a loaded collection
  onSave: (name: string) => Promise<void>;   // called with final name; parent does the fetch
  onCancel: () => void;
  isSaving: boolean;              // disables buttons during fetch
}

export function SaveCollectionDialog({
  isOpen,
  initialName = '',
  onSave,
  onCancel,
  isSaving,
}: SaveCollectionDialogProps) {
  const [step, setStep] = useState<'name-entry' | 'confirm-overwrite'>('name-entry');
  const [name, setName] = useState(initialName);
  // Track whether dialog was open in previous render to detect re-open
  const prevIsOpen = useRef(false);

  // Reset to name-entry and sync name when dialog opens (transition false→true)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setStep('name-entry');
      setName(initialName);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim());
    // If dialog is still open after onSave resolves (parent kept it open due to 409),
    // advance from name-entry to confirm-overwrite so user can confirm the overwrite.
    // If parent closed the dialog (success/error), this state update is a no-op.
    setStep('confirm-overwrite');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'name-entry' ? 'Save to Database' : 'Overwrite Collection?'}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div>
          {step === 'name-entry' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Collection name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving && name.trim()) {
                    handleSave();
                  }
                  if (e.key === 'Escape') onCancel();
                }}
                placeholder="Enter a name for this collection"
                autoFocus
                disabled={isSaving}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              A collection named <strong>&ldquo;{name}&rdquo;</strong> already exists. Overwrite it?
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          {step === 'name-entry' ? (
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => onSave(name.trim())}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Overwrite'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

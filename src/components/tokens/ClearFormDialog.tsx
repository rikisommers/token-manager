'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClearFormDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearFormDialog({
  isOpen,
  onConfirm,
  onCancel,
}: ClearFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear form</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to clear all tokens and groups? This will reset the form to its initial state with a single empty color group.
        </p>
        <p className="text-sm text-amber-600 font-medium">
          ⚠️ This action cannot be undone.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
          >
            Clear Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface JsonPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: any;
  title?: string;
}

export function JsonPreviewDialog({
  isOpen,
  onClose,
  jsonData,
  title = "Generated JSON Preview"
}: JsonPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 max-h-[60vh]">
          <pre className="overflow-auto p-4 text-xs bg-gray-50 rounded-md border">
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface ExportToFigmaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSet: Record<string, unknown>;
  loadedCollectionId?: string | null;
}

interface FigmaCollection {
  id: string;
  name: string;
}

interface FigmaConfig {
  token: string;
  fileUrl: string;
  fileKey: string;
}

export function ExportToFigmaDialog({
  isOpen,
  onClose,
  tokenSet,
  loadedCollectionId,
}: ExportToFigmaDialogProps) {
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [collections, setCollections] = useState<FigmaCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const prevIsOpen = useRef(false);

  const fetchCollections = async (token: string, key: string) => {
    if (!token || !key) return;
    setLoading(true);
    setError(null);
    setCollections([]);
    setSelectedCollectionId('');
    try {
      const res = await fetch(
        `/api/figma/collections?token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections || []);
      } else {
        setError(data.error || 'Failed to load Figma collections');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Figma collections');
    } finally {
      setLoading(false);
    }
  };

  // Load credentials and fetch collections when dialog opens
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Reset state on open
      setError(null);
      setSuccessMessage(null);
      setCollections([]);
      setSelectedCollectionId('');

      const raw = localStorage.getItem('figma-config');
      if (!raw) {
        setHasCredentials(false);
        setFigmaToken('');
        setFileKey('');
      } else {
        try {
          const config: FigmaConfig = JSON.parse(raw);
          if (config.token && config.fileKey) {
            setHasCredentials(true);
            setFigmaToken(config.token);
            setFileKey(config.fileKey);
            fetchCollections(config.token, config.fileKey);
          } else {
            setHasCredentials(false);
          }
        } catch {
          setHasCredentials(false);
        }
      }
    }
    prevIsOpen.current = isOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleLoadCollections = () => {
    setCollections([]);
    setSelectedCollectionId('');
    setError(null);
    fetchCollections(figmaToken, fileKey);
  };

  const handleFileKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileKey(e.target.value);
    setCollections([]);
    setSelectedCollectionId('');
    setError(null);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/export/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSet,
          figmaToken,
          fileKey,
          collectionId: selectedCollectionId,
          mongoCollectionId: loadedCollectionId ?? null,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccessMessage('Successfully exported to Figma!');
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Figma</DialogTitle>
        </DialogHeader>

        {/* No credentials state */}
        {!hasCredentials ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                Configure Figma credentials first using the Figma config button in the app header.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : successMessage ? (
          /* Success state */
          <>
            <div className="space-y-4">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                {successMessage}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Main export form */
          <>
            <div className="space-y-4">
              {/* File key input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Figma File Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={fileKey}
                    onChange={handleFileKeyChange}
                    placeholder="Enter Figma file key"
                    className="flex-1"
                    disabled={exporting}
                  />
                  <Button
                    onClick={handleLoadCollections}
                    disabled={loading || !fileKey.trim() || exporting}
                    className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                  >
                    {loading ? 'Loading...' : 'Load collections'}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Pre-filled from your Figma config. Edit to export to a different file.
                </p>
              </div>

              {/* Collections dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target variable collection
                </label>
                <Select
                  value={selectedCollectionId}
                  onValueChange={(v) => setSelectedCollectionId(v)}
                  disabled={loading || collections.length === 0 || exporting}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select a collection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loading && (
                  <p className="mt-1 text-xs text-gray-500">Loading collections from Figma...</p>
                )}
                {!loading && collections.length === 0 && !error && hasCredentials && (
                  <p className="mt-1 text-xs text-gray-500">
                    Click &ldquo;Load collections&rdquo; to fetch available variable collections.
                  </p>
                )}
              </div>

              {/* Multi-brand info */}
              <p className="text-sm text-gray-500">
                Each brand in your collection will map to a corresponding mode in the target Figma collection.
              </p>

              {/* Error message */}
              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <p className="text-xs text-gray-500">
                Figma Variables API requires Enterprise plan.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={exporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!selectedCollectionId || exporting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

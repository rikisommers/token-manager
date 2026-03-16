import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface FigmaCollectionMode {
  modeId: string;
  name: string;
}

interface FigmaCollection {
  id: string;
  name: string;
  modes: FigmaCollectionMode[];
}

interface ImportFromFigmaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (collectionId: string, collectionName: string) => void;
}

export function ImportFromFigmaDialog({
  isOpen,
  onClose,
  onImported,
}: ImportFromFigmaDialogProps) {
  const [step, setStep] = useState<'pick' | 'name'>('pick');
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [collections, setCollections] = useState<FigmaCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedCollectionName, setSelectedCollectionName] = useState('');
  const [collectionNameInput, setCollectionNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCredentials, setNoCredentials] = useState(false);

  // Load credentials and fetch collections on open
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open
    setStep('pick');
    setCollections([]);
    setSelectedCollectionId('');
    setSelectedCollectionName('');
    setCollectionNameInput('');
    setError(null);
    setNoCredentials(false);

    const raw = localStorage.getItem('figma-config');
    if (!raw) {
      setNoCredentials(true);
      return;
    }

    let config: { token?: string; fileKey?: string };
    try {
      config = JSON.parse(raw);
    } catch {
      setNoCredentials(true);
      return;
    }

    if (!config.token || !config.fileKey) {
      setNoCredentials(true);
      return;
    }

    setFigmaToken(config.token);
    setFileKey(config.fileKey);
    fetchCollections(config.token, config.fileKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchCollections = async (token: string, key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/figma/collections?token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load Figma collections');
        return;
      }
      setCollections(data.collections ?? []);
    } catch {
      setError('Failed to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (figmaToken && fileKey) {
      fetchCollections(figmaToken, fileKey);
    }
  };


  const handleNext = () => {
    if (!selectedCollectionId) return;
    setStep('name');
  };

  const handleSave = async () => {
    if (!collectionNameInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: figmaToken,
          fileKey,
          collectionId: selectedCollectionId,
          collectionName: collectionNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 201) {
        onImported(data.collection._id, data.collection.name);
        onClose();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch {
      setError('Failed to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const modeCount = selectedCollection ? selectedCollection.modes.length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'pick' ? 'Import from Figma' : 'Name your collection'}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div>
          {/* No credentials state */}
          {noCredentials ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Configure Figma credentials first.
              </p>
              <p className="text-sm text-gray-500">
                Click the Figma button in the app header to add your Personal Access Token and file URL.
              </p>
            </div>
          ) : step === 'pick' ? (
            /* Step 1: Pick collection */
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    onClick={handleRetry}
                    size="sm"
                  >
                    Retry
                  </Button>
                </div>
              ) : collections.length === 0 ? (
                <p className="text-sm text-gray-500">No variable collections found in this Figma file.</p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Variable collection
                  </label>
                  <Select value={selectedCollectionId} onValueChange={(id) => {
                    setSelectedCollectionId(id);
                    const found = collections.find((c) => c.id === id);
                    if (found) {
                      setSelectedCollectionName(found.name);
                      setCollectionNameInput(found.name);
                    }
                  }}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select a collection..." />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCollectionId && (
                    <p className="text-xs text-gray-500">
                      {modeCount} {modeCount === 1 ? 'mode' : 'modes'} will be imported as brands
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Confirm name */
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Collection name
              </label>
              <Input
                type="text"
                value={collectionNameInput}
                onChange={(e) => setCollectionNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving && collectionNameInput.trim()) {
                    handleSave();
                  }
                  if (e.key === 'Escape') onClose();
                }}
                autoFocus
                disabled={saving}
              />
              <p className="text-xs text-gray-500">
                This name will be used in the Design Token Manager
              </p>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <p className="text-xs text-gray-400">
                Saving will create a new collection. The modes in this Figma collection will appear as brands.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          {!noCredentials && step === 'pick' && !loading && !error && collections.length > 0 && (
            <Button
              onClick={handleNext}
              disabled={!selectedCollectionId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Next
            </Button>
          )}

          {!noCredentials && step === 'name' && (
            <Button
              onClick={handleSave}
              disabled={saving || !collectionNameInput.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? 'Importing...' : 'Import & Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

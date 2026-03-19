'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Info, MoreHorizontal, Save } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ToastNotification } from '@/components/layout/ToastNotification';
import { SaveCollectionDialog } from '@/components/collections/SaveCollectionDialog';
import { TokenGeneratorForm } from '@/components/tokens/TokenGeneratorForm';
import { TokenGeneratorDocs } from '@/components/tokens/TokenGeneratorDocs';
import { SourceContextBar } from '@/components/layout/SourceContextBar';
import { ImportFromFigmaDialog } from '@/components/figma/ImportFromFigmaDialog';
import { CollectionActions } from '@/components/collections/CollectionActions';
import { TokenGroupTree } from '@/components/tokens/TokenGroupTree';
import { GroupBreadcrumb } from '@/components/tokens/GroupBreadcrumb';
import { TokenGraphPanel } from '@/components/graph/TokenGraphPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { ToastMessage, TokenGroup, GeneratedToken } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';
import type { CollectionGraphState, GraphGroupState } from '@/types/graph-state.types';
import type { FlatToken, FlatGroup } from '@/types/graph-nodes.types';
import type { ITheme } from '@/types/theme.types';

interface TokensPageProps {
  params: { id: string };
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);
  const [graphStateMap, setGraphStateMap] = useState<CollectionGraphState>({});

  // Keep refs so keyboard shortcut / auto-save always reads the latest state
  const graphStateMapRef        = useRef<CollectionGraphState>({});
  const generateTabTokensRef    = useRef<Record<string, unknown> | null>(null);
  const rawCollectionTokensRef  = useRef<Record<string, unknown> | null>(null);
  const graphAutoSaveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Token groups master panel state
  const [globalNamespace, setGlobalNamespace] = useState('token');
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);

  // Flat token list used by ConstantNode's source-token picker
  const allFlatTokens = useMemo<FlatToken[]>(() => {
    const result: FlatToken[] = [];
    const traverseTokens = (group: TokenGroup, prefix: string) => {
      const groupPath = prefix ? `${prefix}.${group.name}` : group.name;
      for (const token of group.tokens) {
        result.push({
          path: `${groupPath}.${token.path}`,
          value: String(token.value ?? ''),
          type: String(token.type ?? 'string'),
        });
      }
      if (group.children) {
        for (const child of group.children) traverseTokens(child, groupPath);
      }
    };
    for (const group of masterGroups) traverseTokens(group, '');
    return result;
  }, [masterGroups]);

  // Flat group list used by the destination-group picker in nodes
  const allFlatGroups = useMemo<FlatGroup[]>(() => {
    const result: FlatGroup[] = [];
    const traverseGroups = (group: TokenGroup, breadcrumb: string) => {
      const path = breadcrumb ? `${breadcrumb} / ${group.name}` : group.name;
      result.push({ id: group.id, name: group.name, path });
      if (group.children) {
        for (const child of group.children) traverseGroups(child, path);
      }
    };
    for (const group of masterGroups) traverseGroups(group, '');
    return result;
  }, [masterGroups]);
  // Filtered group tree based on active theme (Disabled groups hidden)
  const filteredGroups = useMemo(() => {
    if (!activeThemeId) return masterGroups;
    const activeTheme = themes.find(t => t.id === activeThemeId);
    if (!activeTheme) return masterGroups;
    function filterGroups(groups: TokenGroup[]): TokenGroup[] {
      return groups
        .filter(g => {
          const state = activeTheme!.groups[g.id] ?? 'disabled';
          return state !== 'disabled';
        })
        .map(g => ({
          ...g,
          children: g.children ? filterGroups(g.children) : undefined,
        }));
    }
    return filterGroups(masterGroups);
  }, [masterGroups, activeThemeId, themes]);

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedToken, setSelectedToken] = useState<{ token: GeneratedToken; groupPath: string } | null>(null);
  const [pendingNewGroup, setPendingNewGroup] = useState<string | null>(null);
  const [pendingBulkInsert, setPendingBulkInsert] = useState<{ groupId: string; tokens: GeneratedToken[]; subgroupName?: string } | null>(null);
  const [pendingGroupAction, setPendingGroupAction] = useState<{ type: 'delete' | 'addSub'; groupId: string } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    loadCollection();
    return () => {
      abortControllerRef.current?.abort();
      if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCollection = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed to load collection');
      const data = await res.json();
      const col = data.collection ?? data;
      const rawTokens = (col.tokens ?? {}) as Record<string, unknown>;
      setCollectionName(col.name ?? '');
      setRawCollectionTokens(rawTokens);
      rawCollectionTokensRef.current = rawTokens;
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
      // Load persisted graph state
      const gs = (col.graphState ?? {}) as CollectionGraphState;
      setGraphStateMap(gs);
      graphStateMapRef.current = gs;
      // Load themes for the theme selector
      const themesRes = await fetch(`/api/collections/${id}/themes`, {
        signal: abortControllerRef.current?.signal,
      });
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData.themes ?? []);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setToast({ message: 'Failed to load collection', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = () => router.push('/collections');

  const handleRenamed = (newName: string) => {
    setCollectionName(newName);
    setToast({ message: `Renamed to "${newName}"`, type: 'success' });
  };

  const handleDuplicated = (newId: string, newName: string) => {
    router.push(`/collections/${newId}/tokens`);
    setToast({ message: `Duplicated as "${newName}"`, type: 'success' });
  };

  const handleSaveAs = async (name: string) => {
    setIsSavingAs(true);
    try {
      const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tokens: tokensPayload }),
      });
      if (res.status === 201) {
        const { collection } = await res.json();
        setSaveAsDialogOpen(false);
        router.push(`/collections/${collection._id}/tokens`);
        setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
      } else if (res.status === 409) {
        const existingData = await res.json();
        const putRes = await fetch(`/api/collections/${existingData.existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tokens: tokensPayload }),
        });
        if (putRes.ok) {
          const { collection } = await putRes.json();
          setSaveAsDialogOpen(false);
          router.push(`/collections/${collection._id}/tokens`);
          setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
        } else {
          setToast({ message: 'Failed to save collection', type: 'error' });
        }
      } else {
        setToast({ message: 'Failed to save collection', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to save collection', type: 'error' });
    } finally {
      setIsSavingAs(false);
    }
  };

  // ── Keep refs in sync so keyboard shortcut reads fresh values ──────────
  const handleTokensChange = useCallback((tokens: Record<string, unknown> | null, _namespace: string, _collectionName: string) => {
    setGenerateTabTokens(tokens ?? {});
    generateTabTokensRef.current = tokens ?? {};
  }, []);

  const handleGraphStateChange = useCallback((groupId: string, state: GraphGroupState) => {
    setGraphStateMap(prev => {
      const next = { ...prev, [groupId]: state };
      graphStateMapRef.current = next;
      return next;
    });

    // Debounced auto-save — fires 1.5 s after the last change so that
    // graph nodes are persisted even if the user never clicks Save.
    if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
    graphAutoSaveTimerRef.current = setTimeout(() => {
      const tokens = generateTabTokensRef.current ?? rawCollectionTokensRef.current ?? {};
      fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, graphState: graphStateMapRef.current }),
      }).catch(() => {/* silent — user can still manually save */});
    }, 1500);
  }, [id]);

  // ── Primary save: persist tokens + graph state to current collection ────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const tokensPayload = generateTabTokensRef.current ?? rawCollectionTokens ?? {};
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: tokensPayload,
          graphState: graphStateMapRef.current,
        }),
      });
      if (res.ok) {
        setToast({ message: 'Saved', type: 'success' });
      } else {
        setToast({ message: 'Save failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Save failed', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [id, rawCollectionTokens]);

  // ── Ctrl / Cmd + S keyboard shortcut ───────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const handleGroupsChange = useCallback(
    (groups: TokenGroup[]) => {
      setMasterGroups(groups);
      setSelectedGroupId(prev => {
        if (prev && groups.some(g => g.id === prev)) return prev;
        return prev; // keep empty — show default overview when nothing selected
      });
    },
    []
  );

  const handleGroupAdded = useCallback((group: { id: string; name: string }) => {
    setPendingNewGroup(null);
    setSelectedGroupId(group.id);
  }, []);

  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setPendingNewGroup(name);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Actions bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3 flex-shrink-0">
        {/* Namespace — left */}
        <label className="text-sm text-gray-600 whitespace-nowrap">Namespace:</label>
        <Input
          value={globalNamespace}
          onChange={(e) => setGlobalNamespace(e.target.value)}
          className="w-32 h-8 text-sm"
          placeholder="e.g. token"
        />

        {/* Theme selector */}
        {themes.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Theme:</label>
            <Select
              value={activeThemeId ?? '__all__'}
              onValueChange={(v) => handleThemeChange(v === '__all__' ? null : v)}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Default</SelectItem>
                {themes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="px-2">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSaveAsDialogOpen(true)}>
              Save As
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportFigmaOpen(true)}>
              Import from Figma
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              Delete
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setGuideOpen(true)}>
              <Info size={14} className="mr-2" />
              Generator Guide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary action */}
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          <Save size={14} />
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Dialogs driven by the dropdown */}
      <CollectionActions
        selectedId={id}
        selectedName={collectionName}
        collections={[{ _id: id, name: collectionName }]}
        onDeleted={handleDeleted}
        onRenamed={handleRenamed}
        onDuplicated={handleDuplicated}
        onError={(msg) => setToast({ message: msg, type: 'error' })}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
      />

      <SourceContextBar sourceMetadata={selectedSourceMetadata} />

      {/* Master-detail layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master: token groups sidebar — collapsible */}
        <aside
          className={`border-r border-gray-200 bg-gray-50 flex-shrink-0 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-56'}`}
          onClick={() => { if (!sidebarCollapsed) { setSelectedGroupId(''); setSelectedToken(null); } }}
        >
          {sidebarCollapsed ? (
            /* Collapsed icon strip */
            <div className="flex flex-col items-center py-3 gap-3">
              <button
                className="text-gray-400 hover:text-gray-700 p-1 rounded"
                onClick={e => { e.stopPropagation(); setSidebarCollapsed(false); }}
                title="Expand sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="5" height="10" rx="1"/>
                  <path d="M10 6l3 2-3 2"/>
                </svg>
              </button>
              <span className="text-[9px] text-gray-400 uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Groups</span>
            </div>
          ) : (
            /* Expanded full tree */
            <div className="flex flex-col h-full" onClick={e => e.stopPropagation()}>
              <TokenGroupTree
                groups={filteredGroups}
                selectedGroupId={selectedGroupId}
                onGroupSelect={(id) => { setSelectedGroupId(id); setSelectedToken(null); }}
                onAddGroup={() => setIsAddingGroup(true)}
                onDeleteGroup={(groupId) => setPendingGroupAction({ type: 'delete', groupId })}
                onAddSubGroup={(groupId) => setPendingGroupAction({ type: 'addSub', groupId })}
              />
              {/* Collapse toggle at bottom */}
              <div className="mt-auto p-2 border-t border-gray-200">
                <button
                  className="w-full flex items-center justify-center text-gray-400 hover:text-gray-700 py-1 text-xs gap-1"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 6l-3 2 3 2"/>
                    <rect x="9" y="3" width="5" height="10" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Detail: breadcrumb + split pane */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <GroupBreadcrumb
            groups={masterGroups}
            selectedGroupId={selectedGroupId}
            onSelect={(id) => { setSelectedGroupId(id); setSelectedToken(null); }}
          />
          <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
            {/* Form panel */}
            <ResizablePanel defaultSize="60%" minSize="25%">
              <main className="h-full overflow-y-auto p-6">
                <TokenGeneratorForm
                  key={id}
                  githubConfig={null}
                  onTokensChange={handleTokensChange}
                  collectionToLoad={rawCollectionTokens && Object.keys(rawCollectionTokens).length > 0
                    ? { id, name: collectionName, tokens: rawCollectionTokens } : null}
                  namespace={globalNamespace}
                  onNamespaceChange={setGlobalNamespace}
                  onGroupsChange={handleGroupsChange}
                  onGroupSelect={(gid) => { setSelectedGroupId(gid); setSelectedToken(null); }}
                  selectedGroupId={selectedGroupId}
                  pendingNewGroup={pendingNewGroup}
                  onGroupAdded={handleGroupAdded}
                  hideNamespaceAndActions={true}
                  hideAddGroupButton={true}
                  selectedTokenId={selectedToken?.token.id ?? null}
                  onTokenSelect={(token, groupPath) =>
                    setSelectedToken(token ? { token, groupPath } : null)
                  }
                  pendingBulkInsert={pendingBulkInsert}
                  onBulkInsertProcessed={() => setPendingBulkInsert(null)}
                  pendingGroupAction={pendingGroupAction}
                  onGroupActionProcessed={() => setPendingGroupAction(null)}
                />
              </main>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Graph panel */}
            <ResizablePanel defaultSize="40%" minSize="20%">
              <div className="h-full border-l border-gray-200 bg-gray-50">
                <TokenGraphPanel
                  allGroups={masterGroups}
                  selectedGroupId={selectedGroupId}
                  selectedToken={selectedToken}
                  onBulkAddTokens={(groupId, tokens, subgroupName) => setPendingBulkInsert({ groupId, tokens, subgroupName })}
                  graphStateMap={graphStateMap}
                  graphStateLoaded={!loading}
                  onGraphStateChange={handleGraphStateChange}
                  namespace={globalNamespace}
                  allTokens={allFlatTokens}
                  flatGroups={allFlatGroups}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <SaveCollectionDialog
        isOpen={saveAsDialogOpen}
        onSave={handleSaveAs}
        onCancel={() => setSaveAsDialogOpen(false)}
        isSaving={isSavingAs}
      />

      <ImportFromFigmaDialog
        isOpen={importFigmaOpen}
        onClose={() => setImportFigmaOpen(false)}
        onImported={async (collectionId, name) => {
          router.push(`/collections/${collectionId}/tokens`);
          setImportFigmaOpen(false);
          setToast({ message: `Imported "${name}" from Figma`, type: 'success' });
        }}
      />

      <Dialog open={isAddingGroup} onOpenChange={(open) => { if (!open) { setIsAddingGroup(false); setNewGroupName(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Token Group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); }
              }}
              placeholder="Group name (e.g. color / brand)"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}>Cancel</Button>
              <Button onClick={confirmAddGroup}>Add Group</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>W3C Design Token Generator Guide</DialogTitle>
          </DialogHeader>
          <TokenGeneratorDocs />
        </DialogContent>
      </Dialog>
    </div>
  );
}

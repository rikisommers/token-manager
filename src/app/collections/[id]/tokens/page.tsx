'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Info, MoreHorizontal, RotateCcw, Save, Sun, Moon, Eye, Download, EllipsisVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';
import type { CollectionGraphState, GraphGroupState } from '@/types/graph-state.types';
import type { FlatToken, FlatGroup } from '@/types/graph-nodes.types';
import type { ITheme, ColorMode } from '@/types/theme.types';
import { getAllGroups, findGroupById, generateId } from '@/utils';
import { applyGroupMove, applyGroupRename, type DropMode } from '@/utils/groupMove';
import {
  getTokenPathsFromGraphState,
  compareTokenPaths,
  type TokenPathMismatch,
} from '@/utils/graphTokenPaths';
import { tokenService, githubService, fileService } from '@/services';
import { GitHubDirectoryPicker } from '@/components/github/GitHubDirectoryPicker';
import { ExportToFigmaDialog } from '@/components/figma/ExportToFigmaDialog';
import { LoadCollectionDialog } from '@/components/collections/LoadCollectionDialog';
import { ClearFormDialog } from '@/components/tokens/ClearFormDialog';
import { JsonPreviewDialog } from '@/components/dev/JsonPreviewDialog';
import type { GitHubConfig } from '@/types';
import { usePermissions } from '@/context/PermissionsContext';


/** Pure helper: update a single token value within a recursive group tree */
function updateGroupToken(group: TokenGroup, targetGroupId: string, tokenId: string, value: string): TokenGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      tokens: group.tokens.map(t => t.id === tokenId ? { ...t, value } : t),
    };
  }
  return {
    ...group,
    children: group.children?.map(child => updateGroupToken(child, targetGroupId, tokenId, value)),
  };
}

interface TokensPageProps {
  params: { id: string };
}

function ColorModeBadge({ colorMode }: { colorMode: ColorMode }) {
  if (colorMode === 'dark') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 flex-shrink-0">
        <Moon size={9} />
        Dark
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 flex-shrink-0">
      <Sun size={9} />
      Light
    </span>
  );
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { canEdit, canGitHub, canFigma } = usePermissions();

  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);
  
  // GitHub and export/import state
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showExportFigmaDialog, setShowExportFigmaDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [githubConfig] = useState<GitHubConfig | null>(null); // TODO: Get from user settings/config
  const [collectionGraphState, setCollectionGraphState] = useState<CollectionGraphState>({});
  const [graphStateMap, setGraphStateMap] = useState<CollectionGraphState>({});

  // Keep refs so keyboard shortcut / auto-save always reads the latest state
  const graphStateMapRef        = useRef<CollectionGraphState>({});
  const generateTabTokensRef    = useRef<Record<string, unknown> | null>(null);
  const rawCollectionTokensRef  = useRef<Record<string, unknown> | null>(null);
  const graphAutoSaveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeThemeIdRef        = useRef<string | null>(null);

  // Token groups master panel state
  const [globalNamespace, setGlobalNamespace] = useState('token');
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);

  // Theme-mode editable token copy and auto-save timer
  const [activeThemeTokens, setActiveThemeTokens] = useState<TokenGroup[]>([]);
  const themeTokenSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group reorder undo stack (max 20 steps) and debounced persist timer
  const undoStackRef = useRef<TokenGroup[][]>([]);
  const MAX_UNDO = 20;
  const groupReorderSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/42ab2957-6639-4a7b-8f90-226fafaea52f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6eabf0'},body:JSON.stringify({sessionId:'6eabf0',location:'page.tsx:filteredGroups',message:'filter computed',data:{activeThemeId,themeGroupsKeys:Object.keys(activeTheme.groups??{}),themeGroupsSample:Object.entries(activeTheme.groups??{}).slice(0,5),masterGroupIds:masterGroups.map(g=>g.id)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

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
  const [pendingGroupCreation, setPendingGroupCreation] = useState<{ parentGroupId: string | null; groupData: { name: string; tokens: GeneratedToken[] } } | null>(null);
  const [pendingGroupAction, setPendingGroupAction] = useState<{ type: 'delete' | 'addSub'; groupId: string; name?: string } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addSubGroupParentId, setAddSubGroupParentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadCollection();
    return () => {
      abortControllerRef.current?.abort();
      if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
      if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
      if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
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

      // #region agent log
      fetch('http://127.0.0.1:7904/ingest/42ab2957-6639-4a7b-8f90-226fafaea52f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6eabf0'},body:JSON.stringify({sessionId:'6eabf0',location:'page.tsx:loadCollection',message:'raw collection data',data:{collectionName:col.name,rawTokensKeys:Object.keys(rawTokens),rawTokensEmpty:Object.keys(rawTokens).length===0,rawTokensSample:Object.entries(rawTokens).slice(0,3)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      setCollectionName(col.name ?? '');
      if (col.namespace) setGlobalNamespace(col.namespace);
      setRawCollectionTokens(rawTokens);
      rawCollectionTokensRef.current = rawTokens;
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
      // Load persisted graph state
      const gs = (col.graphState ?? {}) as CollectionGraphState;
      setCollectionGraphState(gs);
      setGraphStateMap(gs);
      graphStateMapRef.current = gs;
      // Always parse collection tokens into masterGroups
      const { groups: defaultGroups } = tokenService.processImportedTokens(rawTokens, col.namespace ?? '');
      setMasterGroups(defaultGroups);

      // #region agent log
      fetch('http://127.0.0.1:7904/ingest/42ab2957-6639-4a7b-8f90-226fafaea52f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6eabf0'},body:JSON.stringify({sessionId:'6eabf0',location:'page.tsx:loadCollection',message:'masterGroups set',data:{groupCount:defaultGroups.length,groupIds:defaultGroups.map((g: TokenGroup)=>g.id)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      // Load custom themes for the theme selector
      const themesRes = await fetch(`/api/collections/${id}/themes`, {
        signal: abortControllerRef.current?.signal,
      });
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        const apiThemes: ITheme[] = themesData.themes ?? [];

        // #region agent log
        fetch('http://127.0.0.1:7904/ingest/42ab2957-6639-4a7b-8f90-226fafaea52f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6eabf0'},body:JSON.stringify({sessionId:'6eabf0',location:'page.tsx:loadCollection',message:'themes loaded',data:{themeCount:apiThemes.length,themes:apiThemes.map((t: ITheme)=>({id:t.id,name:t.name,groupsKeys:Object.keys(t.groups??{}),tokenCount:t.tokens?.length??0}))},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion

        setThemes(apiThemes);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showErrorToast('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = () => router.push('/collections');

  const handleRenamed = (newName: string) => {
    setCollectionName(newName);
    showSuccessToast(`Renamed to "${newName}"`);
  };

  const handleEdited = (newName: string, newNamespace: string) => {
    setCollectionName(newName);
    setGlobalNamespace(newNamespace);
    showSuccessToast('Updated collection settings');
  };

  const handleDuplicated = (newId: string, newName: string) => {
    router.push(`/collections/${newId}/tokens`);
    showSuccessToast(`Duplicated as "${newName}"`);
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
        showSuccessToast(`Saved as "${collection.name}"`);
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
          showSuccessToast(`Saved as "${collection.name}"`);
        } else {
          showErrorToast('Failed to save collection');
        }
      } else {
        showErrorToast('Failed to save collection');
      }
    } catch {
      showErrorToast('Failed to save collection');
    } finally {
      setIsSavingAs(false);
    }
  };

  // ── Keep refs in sync so keyboard shortcut reads fresh values ──────────
  const handleTokensChange = useCallback((tokens: Record<string, unknown> | null, namespace: string, _collectionName: string) => {
    setGenerateTabTokens(tokens ?? {});
    generateTabTokensRef.current = tokens;
    if (namespace) setGlobalNamespace(namespace);
  }, []);

  // ── Group drag-and-drop reorder handler ────────────────────────────────
  const handleGroupsReordered = useCallback(async (
    _newGroupsFromTree: TokenGroup[],
    activeId: string,
    overId: string,
    dropMode: DropMode = 'before',
  ) => {
    // Push current state to undo stack before mutating
    undoStackRef.current = [
      masterGroups,
      ...undoStackRef.current.slice(0, MAX_UNDO - 1),
    ];

    // Re-run applyGroupMove with themes so reparenting correctly rewrites
    // theme group IDs and alias paths. A match-by-ID sync would silently
    // drop any reparented group (its ID changes on reparent; the old ID
    // no longer exists in masterGroups after the move).
    const { groups: newGroups, themes: updatedThemes } = applyGroupMove(
      masterGroups,
      activeId,
      overId,
      themes,
      dropMode,
    );

    // Update React state
    setMasterGroups(newGroups);
    setThemes(updatedThemes);

    // Persist to MongoDB (debounced 300ms)
    if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
    groupReorderSaveTimerRef.current = setTimeout(async () => {
      try {
        const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
        await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: rawTokens, namespace: globalNamespace, themes: updatedThemes }),
        });
        rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
        setRawCollectionTokens(rawTokens as Record<string, unknown>);
      } catch {
        // Silent — mirrors existing auto-save error handling pattern
      }
    }, 300);
  }, [masterGroups, themes, id, globalNamespace]);

  // ── Group rename handler ────────────────────────────────────────────────
  const handleRenameGroup = useCallback(async (groupId: string, newLabel: string) => {
    const { groups: newGroups, themes: updatedThemes } = applyGroupRename(
      masterGroups,
      groupId,
      newLabel,
      themes,
    );

    setMasterGroups(newGroups);
    setThemes(updatedThemes);

    try {
      const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
      await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: rawTokens, namespace: globalNamespace, themes: updatedThemes }),
      });
      rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
      setRawCollectionTokens(rawTokens as Record<string, unknown>);
    } catch {
      showErrorToast('Failed to save rename');
    }
  }, [masterGroups, themes, id, globalNamespace]);

  // Persist graph state to the correct theme (per theme > group)
  const persistGraphState = useCallback((gs: CollectionGraphState) => {
    const themeId = activeThemeIdRef.current;
    if (themeId) {
      return fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphState: gs }),
      }).then((res) => {
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === themeId ? { ...t, graphState: gs } : t));
        }
      }).catch((error) => {
        console.error('Failed to persist graph state:', error);
        showErrorToast('Failed to save graph state');
      });
    }
    // Guard: if neither source is ready (page still loading), skip to avoid wiping DB with {}
    if (generateTabTokensRef.current === null && rawCollectionTokensRef.current === null) return;
    // Fix: Only use generateTabTokensRef if it has actual content, otherwise fall back to rawCollectionTokensRef
    const tokens = (generateTabTokensRef.current && Object.keys(generateTabTokensRef.current).length > 0)
      ? generateTabTokensRef.current
      : (rawCollectionTokensRef.current ?? {});
    return fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, graphState: gs }),
    }).then((res) => {
      if (res.ok) {
        setCollectionGraphState(gs);
      }
    }).catch((error) => {
      console.error('Failed to persist collection graph state:', error);
      showErrorToast('Failed to save collection graph state');
    });
  }, [id]);

  const handleGraphStateChange = useCallback((groupId: string, state: GraphGroupState, flushImmediate?: boolean) => {
    const next = { ...graphStateMapRef.current, [groupId]: state };
    graphStateMapRef.current = next;
    setGraphStateMap(next);

    if (flushImmediate) {
      if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
      graphAutoSaveTimerRef.current = null;
      persistGraphState(next);
      return;
    }

    // Debounced auto-save — fires 1.5 s after the last change
    if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
    graphAutoSaveTimerRef.current = setTimeout(() => {
      persistGraphState(graphStateMapRef.current);
    }, 1500);
  }, [persistGraphState]);

  // ── Primary save: persist tokens + graph state ───────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const gs = graphStateMapRef.current;
      if (activeThemeId) {
        const res = await fetch(`/api/collections/${id}/themes/${activeThemeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphState: gs }),
        });
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === activeThemeId ? { ...t, graphState: gs } : t));
          showSuccessToast('Saved');
        } else {
          showErrorToast('Save failed');
        }
      } else {
        const tokensPayload = generateTabTokensRef.current ?? rawCollectionTokens ?? {};
        const res = await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: tokensPayload,
            namespace: globalNamespace,
            graphState: gs,
          }),
        });
        if (res.ok) {
          setCollectionGraphState(gs);
          showSuccessToast('Saved');
        } else {
          showErrorToast('Save failed');
        }
      }
    } catch {
      showErrorToast('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [id, rawCollectionTokens, activeThemeId, globalNamespace]);

  // ── Ctrl / Cmd + S and Ctrl / Cmd + Z keyboard shortcuts ──────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (canEdit) handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const previous = undoStackRef.current.shift();
        if (previous) {
          setMasterGroups(previous);
          if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
          groupReorderSaveTimerRef.current = setTimeout(async () => {
            try {
              const rawTokens = tokenService.generateStyleDictionaryOutput(previous, globalNamespace);
              await fetch(`/api/collections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens: rawTokens }),
              });
              rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
              setRawCollectionTokens(rawTokens as Record<string, unknown>);
            } catch {
              // Silent
            }
          }, 300);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, id, globalNamespace]);

  const handleGroupsChange = useCallback(
    (groups: TokenGroup[]) => {
      setMasterGroups(groups);

      // Sync theme groups maps: register any newly added group IDs so they
      // are not hidden by the filteredGroups filter (which defaults to 'disabled').
      // Custom themes: new groups default to 'source' (read-only mirror of collection).
      setThemes(prevThemes => {
        if (prevThemes.length === 0) return prevThemes;

        function flattenGroupIds(g: TokenGroup): string[] {
          const ids = [g.id];
          if (g.children?.length) g.children.forEach(c => ids.push(...flattenGroupIds(c)));
          return ids;
        }
        const allGroupIds = groups.flatMap(flattenGroupIds);

        return prevThemes.map(theme => {
          const newEntries: Record<string, 'source'> = {};
          for (const gid of allGroupIds) {
            if (!(gid in theme.groups)) {
              newEntries[gid] = 'source';
            }
          }
          if (Object.keys(newEntries).length === 0) return theme;
          return { ...theme, groups: { ...theme.groups, ...newEntries } };
        });
      });
    },
    []
  );

  const handleGroupAdded = useCallback((group: { id: string; name: string }) => {
    setPendingNewGroup(null);
    setSelectedGroupId(group.id);
  }, []);

  // ── Keep activeThemeIdRef in sync for debounced save ─────────────────────
  useEffect(() => {
    activeThemeIdRef.current = activeThemeId;
  }, [activeThemeId]);

  // ── Sync graphStateMap when activeThemeId changes (per theme > group) ───
  // Each theme has its own graph state per group; never mix themes (like tokens table).
  useEffect(() => {
    if (!activeThemeId) {
      setGraphStateMap(collectionGraphState);
      graphStateMapRef.current = collectionGraphState;
      return;
    }
    const theme = themes.find(t => t.id === activeThemeId);
    const gs = (theme?.graphState ?? {}) as CollectionGraphState;
    setGraphStateMap(gs);
    graphStateMapRef.current = gs;
  }, [activeThemeId, themes, collectionGraphState]);

  // ── Sync activeThemeTokens when activeThemeId or themes changes ─────────
  useEffect(() => {
    if (!activeThemeId) {
      setActiveThemeTokens([]);
      return;
    }
    const theme = themes.find(t => t.id === activeThemeId);
    setActiveThemeTokens(theme ? JSON.parse(JSON.stringify(theme.tokens)) : []);
  }, [activeThemeId, themes]);

  // ── Theme selector change with group fallback ───────────────────────────
  const handleThemeChange = useCallback((newThemeId: string | null) => {
    // Sync graphStateMap BEFORE setActiveThemeId so the next render passes correct initialGraphState
    // to GroupStructureGraph. The sync effect runs after render; without this, the new graph would
    // mount with the previous theme's graph.
    const newTheme = newThemeId ? themes.find(t => t.id === newThemeId) : null;

    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/42ab2957-6639-4a7b-8f90-226fafaea52f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6eabf0'},body:JSON.stringify({sessionId:'6eabf0',location:'page.tsx:handleThemeChange',message:'theme change',data:{newThemeId,themeFound:!!newTheme,themeGroupsKeys:Object.keys(newTheme?.groups??{}),themeTokenCount:newTheme?.tokens?.length??0,masterGroupIds:masterGroups.map(g=>g.id)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const gs = newThemeId
      ? ((newTheme?.graphState ?? {}) as CollectionGraphState)
      : collectionGraphState;
    setGraphStateMap(gs);
    graphStateMapRef.current = gs;
    setActiveThemeId(newThemeId);
    setSelectedToken(null);

    if (!newThemeId) {
      // Returning to Default — restore the first available group if current is missing
      if (!selectedGroupId || !masterGroups.some(g => g.id === selectedGroupId)) {
        setSelectedGroupId(masterGroups[0]?.id ?? '');
      }
      return;
    }

    if (!newTheme) return;
    const currentState = selectedGroupId
      ? (newTheme.groups[selectedGroupId] ?? 'disabled')
      : 'disabled';
    if (currentState === 'disabled' || !selectedGroupId) {
      const allGroupsList = getAllGroups(masterGroups);
      // Prefer 'enabled' groups; fall back to any non-disabled group
      const firstEnabled = allGroupsList.find(g => newTheme.groups[g.id] === 'enabled')
        ?? allGroupsList.find(g => (newTheme.groups[g.id] ?? 'disabled') !== 'disabled');
      setSelectedGroupId(firstEnabled?.id ?? masterGroups[0]?.id ?? '');
    }
  }, [themes, selectedGroupId, masterGroups, collectionGraphState]);

  // ── Theme token change with debounced PATCH auto-save ───────────────────
  const handleThemeTokenChange = useCallback((updatedTokens: TokenGroup[]) => {
    if (!activeThemeId) return; // Default mode: mutations go through handleGroupsChange
    setActiveThemeTokens(updatedTokens);
    setThemes(prev => prev.map(t => t.id === activeThemeId ? { ...t, tokens: updatedTokens } : t));
    if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
    themeTokenSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/collections/${id}/themes/${activeThemeId}/tokens`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: updatedTokens }),
        });
      } catch {
        // Silent — existing toast pattern; no disruptive error for auto-save
      }
    }, 400);
  }, [id, activeThemeId]);

  // ── Derive active group state (enabled / source / disabled) ────────────
  // Token name mismatch when theme graph differs from default (for selected group)
  const tokenNameMismatch = useMemo<TokenPathMismatch | null>(() => {
    if (!activeThemeId || !selectedGroupId) return null;
    const defaultState = collectionGraphState[selectedGroupId];
    const themeState = graphStateMap[selectedGroupId] ?? defaultState;
    const defaultPaths = getTokenPathsFromGraphState(
      defaultState ?? { nodes: {}, edges: [], generators: [] },
      selectedGroupId,
      globalNamespace || undefined,
    );
    const themePaths = getTokenPathsFromGraphState(
      themeState ?? { nodes: {}, edges: [], generators: [] },
      selectedGroupId,
      globalNamespace || undefined,
    );
    const mismatch = compareTokenPaths(defaultPaths, themePaths);
    if (mismatch.inThemeNotDefault.length === 0 && mismatch.inDefaultNotTheme.length === 0) {
      return null;
    }
    return mismatch;
  }, [activeThemeId, selectedGroupId, collectionGraphState, graphStateMap, globalNamespace]);

  const activeGroupState = useMemo<'enabled' | 'source' | 'disabled' | null>(() => {
    if (!activeThemeId || !selectedGroupId) return null;
    const theme = themes.find(t => t.id === activeThemeId);
    if (!theme) return null;
    return (theme.groups[selectedGroupId] ?? 'disabled') as 'enabled' | 'source' | 'disabled';
  }, [activeThemeId, selectedGroupId, themes]);

  const isThemeReadOnly = activeGroupState === 'source';

  // ── Find master collection value for a token by groupId + tokenPath ─────
  const findMasterValue = useCallback((groupId: string, tokenPath: string): string | undefined => {
    const group = findGroupById(masterGroups, groupId);
    const token = group?.tokens.find(t => t.path === tokenPath);
    return token !== undefined ? String(token.value ?? '') : undefined;
  }, [masterGroups]);

  // ── Reset a theme token to its collection-default value ─────────────────
  const handleResetToDefault = useCallback((groupId: string, tokenId: string, masterValue: string) => {
    if (!activeThemeId) return;
    const updatedTokens = activeThemeTokens.map(g =>
      updateGroupToken(g, groupId, tokenId, masterValue)
    );
    handleThemeTokenChange(updatedTokens);
  }, [activeThemeId, activeThemeTokens, handleThemeTokenChange]);

  // ── Reset a group to source: delete tokens not in source, reset values ───
  const handleResetGroupToSource = useCallback((groupId: string) => {
    if (!activeThemeId) return;
    const sourceGroup = findGroupById(masterGroups, groupId);
    if (!sourceGroup) return;
    const resetGroupInTree = (groups: TokenGroup[]): TokenGroup[] =>
      groups.map(g => {
        if (g.id === groupId) {
          const updatedTokens = sourceGroup.tokens.map(st => {
            const existing = g.tokens.find(t => t.path === st.path);
            return existing
              ? { ...existing, value: st.value, type: st.type, description: st.description ?? existing.description }
              : { ...st, id: generateId() };
          });
          return { ...g, tokens: updatedTokens };
        }
        if (g.children?.length) {
          return { ...g, children: resetGroupInTree(g.children) };
        }
        return g;
      });
    handleThemeTokenChange(resetGroupInTree(activeThemeTokens));
  }, [activeThemeId, activeThemeTokens, masterGroups, handleThemeTokenChange]);

  const isGroupSource = useCallback((groupId: string) => {
    if (!activeThemeId) return false;
    const theme = themes.find(t => t.id === activeThemeId);
    return (theme?.groups[groupId] ?? 'disabled') === 'source';
  }, [activeThemeId, themes]);

  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (addSubGroupParentId) {
      setPendingGroupAction({ type: 'addSub', groupId: addSubGroupParentId, name });
      setAddSubGroupParentId(null);
    } else {
      setPendingNewGroup(name);
    }
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  // ── GitHub and Export/Import Functions ─────────────────────────────────────

  const generateTokenSet = () => {
    const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
    return tokensPayload;
  };

  const loadBranches = async () => {
    if (!githubConfig) {
      console.warn('No GitHub config available for loading branches');
      return;
    }

    try {
      console.log('Loading branches for repository:', githubConfig.repository);
      const branches = await githubService.getBranches(
        githubConfig.token,
        githubConfig.repository,
      );
      const branchNames = branches.map((branch) => branch.name);
      setAvailableBranches(branchNames);
    } catch (error) {
      console.error('Failed to load branches:', error);
      throw error;
    }
  };

  const exportToGitHub = async () => {
    console.log('GitHub config check:', githubConfig);
    if (!githubConfig) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      // Continue anyway - the directory picker can work with the configured branch
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  };

  const importFromGitHub = async () => {
    console.log('GitHub config check:', githubConfig);
    if (!githubConfig) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      // Continue anyway - the directory picker can work with the configured branch
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  };

  const exportToFigma = () => {
    setShowExportFigmaDialog(true);
  };

  const handleDownloadJSON = () => {
    const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
    const content = JSON.stringify(tokensPayload, null, 2);
    
    // Create and trigger download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessToast('JSON downloaded successfully');
  };

  const handleClearForm = () => {
    // Reset to initial state with single color group
    const initialTokens = {};
    setGenerateTabTokens(initialTokens);
    generateTabTokensRef.current = initialTokens;
    setGlobalNamespace('');
    setShowClearDialog(false);
    showSuccessToast('Form cleared successfully!');
  };

  const handlePreviewJSON = () => {
    setShowJsonDialog(true);
  };

  const handleDownloadJSONFromHeader = () => {
    const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
    const content = JSON.stringify(tokensPayload, null, 2);
    
    // Create and trigger download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessToast('JSON downloaded successfully');
  };

  const handleDirectorySelect = async (selectedPath: string, selectedBranch: string) => {
    setShowDirectoryPicker(false);

    if (!githubConfig) return;

    const isImportMode = directoryPickerMode === 'import';

    try {
      if (directoryPickerMode === 'export') {
        // Export mode
        const tokenSet = generateTokenSet();
        const response = await fetch('/api/export/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenSet,
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          showSuccessToast('Successfully exported to GitHub!');
        } else {
          const error = await response.text();
          showErrorToast(`Export failed: ${error}`);
        }
      } else {
        // Import mode
        const response = await fetch('/api/import/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          const { tokenSet } = await response.json();
          
          // Update the form with imported tokens
          setGenerateTabTokens(tokenSet);
          generateTabTokensRef.current = tokenSet;
          
          showSuccessToast('Successfully imported from GitHub!');
        } else {
          const error = await response.text();
          showErrorToast(`Import failed: ${error}`);
        }
      }
    } catch (error) {
      showErrorToast(`${isImportMode ? 'Import' : 'Export'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <header className="px-6 py-3 flex justify-between items-center border border-b border-gray-200">
       <div className="flex items-center gap-2">  
        <h1 className="text-xl">
          {collectionName}
       
        </h1>
        <Badge variant="secondary">Prefix:{globalNamespace}</Badge>
        </div> 
        <div className="flex gap-2 items-center">
          {/* Info/Generator Guide button */}
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => setGuideOpen(true)}
            title="Generator Guide"
          >
            <Info size={16} />
          </Button>

          {/* Preview JSON button */}
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={handlePreviewJSON}
            title="Preview JSON"
          >
            <Eye size={16} />
          </Button>

          {/* Download JSON button */}
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={handleDownloadJSONFromHeader}
            title="Download JSON"
          >
            <Download size={16} />
          </Button>

          {/* Save button — hidden for read-only roles */}
          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              size="sm"
            >
              <Save size={14} />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <EllipsisVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setSaveAsDialogOpen(true)}>
                  Save As
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setShowLoadDialog(true)}>
                  Load from Database
                </DropdownMenuItem>
              )}
              {(canFigma || canGitHub) && <DropdownMenuSeparator />}
              {canFigma && (
                <DropdownMenuItem onClick={() => setImportFigmaOpen(true)}>
                  Import from Figma
                </DropdownMenuItem>
              )}
              {canGitHub && (
                <DropdownMenuItem onClick={importFromGitHub}>
                  Import from GitHub
                </DropdownMenuItem>
              )}
              {canGitHub && (
                <DropdownMenuItem onClick={exportToGitHub}>
                  Push to GitHub
                </DropdownMenuItem>
              )}
              {canFigma && (
                <DropdownMenuItem onClick={exportToFigma}>
                  Export to Figma
                </DropdownMenuItem>
              )}
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                    Clear Form
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>



      {/* Dialogs driven by the dropdown */}
      <CollectionActions
        selectedId={id}
        selectedName={collectionName}
        selectedNamespace={globalNamespace}
        collections={[{ _id: id, name: collectionName }]}
        onDeleted={handleDeleted}
        onRenamed={handleRenamed}
        onEdited={handleEdited}
        onDuplicated={handleDuplicated}
        onError={(msg) => showErrorToast(msg)}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
      />

      <SourceContextBar sourceMetadata={selectedSourceMetadata} />



      {/* Master-detail layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master: token groups sidebar — collapsible */}
        <aside
          className={`border-r border-gray-200 bg-gray-50 flex-shrink-0 flex flex-col transition-all duration-200 w-56`}
    
        >
         
         {themes.length > 0 && (
         <div className="flex flex-col gap-1 py-4">
          <div className="px-4 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Themes</span>
          </div>


          <div className="flex flex-col px-3">
              {/* <label className="text-xs text-black whitespace-nowrap">Theme:</label> */}
            <Select
              key={activeThemeId ?? '__default__'}
              value={activeThemeId ?? '__default__'}
              onValueChange={(v) => handleThemeChange(v === '__default__' ? null : v)}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Default</SelectItem>
                {themes.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-1.5">
                      {t.name}
                      <ColorModeBadge colorMode={(t.colorMode ?? 'light') as ColorMode} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        )}
            <div className="flex flex-col h-full" onClick={e => e.stopPropagation()}>


              <TokenGroupTree
                groups={filteredGroups}
                selectedGroupId={selectedGroupId}
                onGroupSelect={(id) => { setSelectedGroupId(id); setSelectedToken(null); }}
                onAddGroup={canEdit ? () => setIsAddingGroup(true) : undefined}
                onDeleteGroup={canEdit ? (groupId) => setPendingGroupAction({ type: 'delete', groupId }) : undefined}
                onAddSubGroup={canEdit ? (groupId) => { setAddSubGroupParentId(groupId); setIsAddingGroup(true); } : undefined}
                onGroupsReordered={canEdit ? handleGroupsReordered : undefined}
                onRenameGroup={canEdit ? handleRenameGroup : undefined}
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
     
        </aside>

        {/* Detail: breadcrumb + split pane */}
        <div className="flex flex-col flex-1 overflow-hidden">

          <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
            {/* Form panel */}
            <ResizablePanel defaultSize="60%" minSize="25%">
              <main className="h-full overflow-y-auto p-6 flex flex-col gap-4">

              <GroupBreadcrumb
            groups={masterGroups}
            selectedGroupId={selectedGroupId}
            onSelect={(id) => { setSelectedGroupId(id); setSelectedToken(null); }}
          />
                <TokenGeneratorForm
                  key={`${id}-${activeThemeId ?? 'default'}`}
                  githubConfig={null}
                  collectionToLoad={!activeThemeId && rawCollectionTokens ? { 
                    id, 
                    name: collectionName, 
                    tokens: rawCollectionTokens 
                  } : null}
                  onTokensChange={handleTokensChange}
                  namespace={globalNamespace}
                  onNamespaceChange={setGlobalNamespace}
                  onGroupsChange={activeThemeId ? undefined : handleGroupsChange}
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
                  pendingGroupCreation={pendingGroupCreation}
                  onGroupCreationProcessed={() => setPendingGroupCreation(null)}
                  pendingGroupAction={pendingGroupAction}
                  onGroupActionProcessed={() => setPendingGroupAction(null)}
                  themeTokens={activeThemeId ? activeThemeTokens : undefined}
                  onThemeTokensChange={activeThemeId ? handleThemeTokenChange : undefined}
                  isReadOnly={isThemeReadOnly || !canEdit}
                  findMasterValue={activeThemeId ? findMasterValue : undefined}
                  onResetToDefault={activeThemeId && !isThemeReadOnly ? handleResetToDefault : undefined}
                  onResetGroupToSource={activeThemeId ? handleResetGroupToSource : undefined}
                  isGroupSource={activeThemeId ? isGroupSource : undefined}
                  tokenNameMismatch={tokenNameMismatch}
                  onPreviewJSON={handlePreviewJSON}
                  onDownloadJSON={handleDownloadJSONFromHeader}
                  onUndoSnapshot={(snapshot) => {
                    undoStackRef.current = [snapshot, ...undoStackRef.current.slice(0, MAX_UNDO - 1)];
                  }}
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
                  onBulkCreateGroups={(parentGroupId, groupData) => setPendingGroupCreation({ parentGroupId, groupData })}
                  graphStateMap={graphStateMap}
                  onGraphStateChange={handleGraphStateChange}
                  namespace={globalNamespace}
                  allTokens={allFlatTokens}
                  flatGroups={allFlatGroups}
                  activeThemeId={activeThemeId}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>


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
          showSuccessToast(`Imported "${name}" from Figma`);
        }}
      />

      {showDirectoryPicker && githubConfig && (
        <GitHubDirectoryPicker
          githubToken={githubConfig.token}
          repository={githubConfig.repository}
          branch={githubConfig.branch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          mode={directoryPickerMode}
          availableBranches={availableBranches}
        />
      )}

      <ExportToFigmaDialog
        isOpen={showExportFigmaDialog}
        onClose={() => setShowExportFigmaDialog(false)}
        tokenSet={generateTokenSet()}
      />

      <LoadCollectionDialog
        isOpen={showLoadDialog}
        onLoad={async (collectionId: string) => {
          try {
            const response = await fetch(`/api/collections/${collectionId}`);
            if (response.ok) {
              const { collection } = await response.json();
              // Update form with loaded collection data
              setGenerateTabTokens(collection.tokens);
              generateTabTokensRef.current = collection.tokens;
              setShowLoadDialog(false);
              showSuccessToast(`Loaded "${collection.name}"`);
            } else {
              showErrorToast('Failed to load collection');
            }
          } catch (error) {
            showErrorToast('Failed to load collection');
          }
        }}
        onCancel={() => setShowLoadDialog(false)}
      />

      <ClearFormDialog
        isOpen={showClearDialog}
        onConfirm={handleClearForm}
        onCancel={() => setShowClearDialog(false)}
      />

      <JsonPreviewDialog
        isOpen={showJsonDialog}
        onClose={() => setShowJsonDialog(false)}
        jsonData={generateTabTokens ?? rawCollectionTokens ?? {}}
      />

      <Dialog open={isAddingGroup} onOpenChange={(open) => { if (!open) { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{addSubGroupParentId ? 'Add Sub-group' : 'Add Token Group'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); }
              }}
              placeholder="Group name (e.g. color / brand)"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); }}>Cancel</Button>
              <Button onClick={confirmAddGroup}>{addSubGroupParentId ? 'Add Sub-group' : 'Add Group'}</Button>
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

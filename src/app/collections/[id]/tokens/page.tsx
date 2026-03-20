'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Info, MoreHorizontal, RotateCcw, Save } from 'lucide-react';
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
import { getAllGroups, findGroupById, generateId } from '@/utils';
import { applyGroupMove } from '@/utils/groupMove';
import {
  getTokenPathsFromGraphState,
  compareTokenPaths,
  type TokenPathMismatch,
} from '@/utils/graphTokenPaths';
import { tokenService } from '@/services/token.service';

/** Default theme id — treat default as a theme for consistent isolation */
const DEFAULT_THEME_ID = '__default__';

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
      setCollectionName(col.name ?? '');
      setRawCollectionTokens(rawTokens);
      rawCollectionTokensRef.current = rawTokens;
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
      // Load persisted graph state
      const gs = (col.graphState ?? {}) as CollectionGraphState;
      setCollectionGraphState(gs);
      setGraphStateMap(gs);
      graphStateMapRef.current = gs;
      // Load themes for the theme selector — treat default as a theme for isolation
      const themesRes = await fetch(`/api/collections/${id}/themes`, {
        signal: abortControllerRef.current?.signal,
      });
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        const apiThemes: ITheme[] = themesData.themes ?? [];
        if (apiThemes.length > 0) {
          const { groups: defaultGroups } = tokenService.processImportedTokens(rawTokens, '');
          function flattenGroupIds(g: TokenGroup): string[] {
            const ids = [g.id];
            if (g.children?.length) g.children.forEach(c => ids.push(...flattenGroupIds(c)));
            return ids;
          }
          const defaultTheme: ITheme = {
            id: DEFAULT_THEME_ID,
            name: 'Default',
            groups: Object.fromEntries(defaultGroups.flatMap(g => flattenGroupIds(g)).map(gid => [gid, 'enabled' as const])),
            tokens: defaultGroups,
            graphState: gs,
          };
          setThemes([defaultTheme, ...apiThemes]);
          setActiveThemeId(DEFAULT_THEME_ID);
        } else {
          setThemes([]);
        }
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

  // ── Group drag-and-drop reorder handler ────────────────────────────────
  const handleGroupsReordered = useCallback(async (
    _newGroupsFromTree: TokenGroup[],
    activeId: string,
    overId: string,
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
    const nonDefaultThemes = themes.filter(t => t.id !== DEFAULT_THEME_ID);
    const { groups: newGroups, themes: updatedThemes } = applyGroupMove(
      masterGroups,
      activeId,
      overId,
      nonDefaultThemes,
    );

    // Update React state
    setMasterGroups(newGroups);
    setThemes(prev => prev.map(t =>
      t.id === DEFAULT_THEME_ID ? t : (updatedThemes.find(u => u.id === t.id) ?? t)
    ));

    // Persist to MongoDB (debounced 300ms)
    if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
    groupReorderSaveTimerRef.current = setTimeout(async () => {
      try {
        const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
        await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: rawTokens, themes: updatedThemes }),
        });
        rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
        setRawCollectionTokens(rawTokens as Record<string, unknown>);
      } catch {
        // Silent — mirrors existing auto-save error handling pattern
      }
    }, 300);
  }, [masterGroups, themes, id, globalNamespace]);

  // Persist graph state to the correct theme (per theme > group)
  const persistGraphState = useCallback((gs: CollectionGraphState) => {
    const themeId = activeThemeIdRef.current;
    if (themeId && themeId !== DEFAULT_THEME_ID) {
      return fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphState: gs }),
      }).then((res) => {
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === themeId ? { ...t, graphState: gs } : t));
        }
      }).catch(() => {/* silent */});
    }
    const tokens = generateTabTokensRef.current ?? rawCollectionTokensRef.current ?? {};
    return fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, graphState: gs }),
    }).then((res) => {
      if (res.ok) {
        setCollectionGraphState(gs);
        setThemes(prev => prev.map(t => t.id === DEFAULT_THEME_ID ? { ...t, graphState: gs } : t));
      }
    }).catch(() => {/* silent */});
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
      if (activeThemeId && activeThemeId !== DEFAULT_THEME_ID) {
        const res = await fetch(`/api/collections/${id}/themes/${activeThemeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphState: gs }),
        });
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === activeThemeId ? { ...t, graphState: gs } : t));
          setToast({ message: 'Saved', type: 'success' });
        } else {
          setToast({ message: 'Save failed', type: 'error' });
        }
      } else {
        const tokensPayload = generateTabTokensRef.current ?? rawCollectionTokens ?? {};
        const res = await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: tokensPayload,
            graphState: gs,
          }),
        });
        if (res.ok) {
          setCollectionGraphState(gs);
          setThemes(prev => prev.map(t => t.id === DEFAULT_THEME_ID ? { ...t, graphState: gs } : t));
          setToast({ message: 'Saved', type: 'success' });
        } else {
          setToast({ message: 'Save failed', type: 'error' });
        }
      }
    } catch {
      setToast({ message: 'Save failed', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [id, rawCollectionTokens, activeThemeId]);

  // ── Ctrl / Cmd + S and Ctrl / Cmd + Z keyboard shortcuts ──────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
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
      setSelectedGroupId(prev => {
        if (prev && groups.some(g => g.id === prev)) return prev;
        return prev; // keep empty — show default overview when nothing selected
      });

      // Sync theme groups maps: register any newly added group IDs so they
      // are not hidden by the filteredGroups filter (which defaults to 'disabled').
      // Default theme: new groups are 'enabled'; custom themes: 'source' (read-only).
      setThemes(prevThemes => {
        if (prevThemes.length === 0) return prevThemes;

        function flattenGroupIds(g: TokenGroup): string[] {
          const ids = [g.id];
          if (g.children?.length) g.children.forEach(c => ids.push(...flattenGroupIds(c)));
          return ids;
        }
        const allGroupIds = groups.flatMap(flattenGroupIds);

        return prevThemes.map(theme => {
          const newEntries: Record<string, 'enabled' | 'source'> = {};
          for (const gid of allGroupIds) {
            if (!(gid in theme.groups)) {
              newEntries[gid] = theme.id === DEFAULT_THEME_ID ? 'enabled' : 'source';
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
      const gs = collectionGraphState;
      setGraphStateMap(gs);
      graphStateMapRef.current = gs;
      return;
    }
    const theme = themes.find(t => t.id === activeThemeId);
    // Default: use collection. Custom themes: use theme.graphState only (never fall back to collection).
    const gs = (activeThemeId === DEFAULT_THEME_ID
      ? collectionGraphState
      : (theme?.graphState ?? {})) as CollectionGraphState;
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
  const handleThemeChange = useCallback((newThemeId: string) => {
    setActiveThemeId(newThemeId);
    const newTheme = themes.find(t => t.id === newThemeId);
    if (!newTheme) return;
    const currentState = selectedGroupId
      ? (newTheme.groups[selectedGroupId] ?? 'disabled')
      : 'disabled';
    if (currentState === 'disabled' || !selectedGroupId) {
      const allGroupsList = getAllGroups(masterGroups);
      const firstEnabled = allGroupsList.find(g => newTheme.groups[g.id] === 'enabled');
      setSelectedGroupId(firstEnabled?.id ?? '');
    }
  }, [themes, selectedGroupId, masterGroups]);

  // ── Theme token change with debounced PATCH auto-save ───────────────────
  const handleThemeTokenChange = useCallback((updatedTokens: TokenGroup[]) => {
    setActiveThemeTokens(updatedTokens);
    if (!activeThemeId) return;
    setThemes(prev => prev.map(t => t.id === activeThemeId ? { ...t, tokens: updatedTokens } : t));
    if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
    themeTokenSaveTimerRef.current = setTimeout(async () => {
      try {
        if (activeThemeId === DEFAULT_THEME_ID) {
          const raw = tokenService.generateStyleDictionaryOutput(updatedTokens, globalNamespace);
          setRawCollectionTokens(raw as Record<string, unknown>);
          rawCollectionTokensRef.current = raw as Record<string, unknown>;
          setGenerateTabTokens(raw as Record<string, unknown>);
          generateTabTokensRef.current = raw as Record<string, unknown>;
          setMasterGroups(updatedTokens);
          await fetch(`/api/collections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: raw }),
          });
        } else {
          await fetch(`/api/collections/${id}/themes/${activeThemeId}/tokens`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: updatedTokens }),
          });
        }
      } catch {
        // Silent — existing toast pattern; no disruptive error for auto-save
      }
    }, 400);
  }, [id, activeThemeId, globalNamespace]);

  // ── Derive active group state (enabled / source / disabled) ────────────
  // Token name mismatch when theme graph differs from default (for selected group)
  const tokenNameMismatch = useMemo<TokenPathMismatch | null>(() => {
    if (!activeThemeId || !selectedGroupId || activeThemeId === DEFAULT_THEME_ID) return null;
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
    if (!activeThemeId || activeThemeId === DEFAULT_THEME_ID) return;
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
    if (!activeThemeId || activeThemeId === DEFAULT_THEME_ID) return false;
    const theme = themes.find(t => t.id === activeThemeId);
    return (theme?.groups[groupId] ?? 'disabled') === 'source';
  }, [activeThemeId, themes]);

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

        {/* Theme selector — default is a theme for isolation */}
        {themes.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Theme:</label>
            <Select
              value={activeThemeId ?? DEFAULT_THEME_ID}
              onValueChange={(v) => handleThemeChange(v)}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
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
                onGroupsReordered={handleGroupsReordered}
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
                  themeTokens={activeThemeId ? activeThemeTokens : undefined}
                  onThemeTokensChange={activeThemeId ? handleThemeTokenChange : undefined}
                  isReadOnly={isThemeReadOnly}
                  findMasterValue={activeThemeId && activeThemeId !== DEFAULT_THEME_ID ? findMasterValue : undefined}
                  onResetToDefault={activeThemeId && activeThemeId !== DEFAULT_THEME_ID && !isThemeReadOnly ? handleResetToDefault : undefined}
                  onResetGroupToSource={activeThemeId && activeThemeId !== DEFAULT_THEME_ID ? handleResetGroupToSource : undefined}
                  isGroupSource={activeThemeId && activeThemeId !== DEFAULT_THEME_ID ? isGroupSource : undefined}
                  tokenNameMismatch={tokenNameMismatch}
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

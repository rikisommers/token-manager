'use client';

import React, { useState, useEffect } from 'react';
import { GitHubDirectoryPicker } from './GitHubDirectoryPicker';
import { LoadingIndicator } from './LoadingIndicator';
import { ToastNotification } from './ToastNotification';
import { JsonPreviewDialog } from './JsonPreviewDialog';
import { SaveCollectionDialog } from './SaveCollectionDialog';
import { LoadCollectionDialog } from './LoadCollectionDialog';
import { ExportToFigmaDialog } from './ExportToFigmaDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

// Import services and types
import { githubService, tokenService, fileService } from '../services';
import {
  GeneratedToken,
  TokenGroup,
  GitHubConfig,
  TokenType,
  TOKEN_TYPES,
  ToastMessage,
  LoadingState
} from '../types';
import {
  generateId,
  buildFullPath,
  getPathPrefix,
  findGroupById,
  getAllGroups,
  getValuePlaceholder,
  validateTokenPath,
  validateTokenValue
} from '../utils';
import { createToast, createLoadingState } from '../utils';

interface TokenGeneratorFormNewProps {
  githubConfig?: GitHubConfig | null;
  onTokensChange?: (
    tokens: Record<string, unknown> | null,
    namespace: string,
    collectionName: string
  ) => void;
  collectionToLoad?: { id: string; name: string; tokens: Record<string, unknown> } | null;
}

export function TokenGeneratorFormNew({ githubConfig, onTokensChange, collectionToLoad }: TokenGeneratorFormNewProps) {
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([
    { id: '1', name: 'colors', tokens: [], level: 0, expanded: true }
  ]);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [globalNamespace, setGlobalNamespace] = useState('');
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(createLoadingState(false));
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Collection persistence state
  const [loadedCollection, setLoadedCollection] = useState<{ id: string; name: string } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogDuplicateName, setSaveDialogDuplicateName] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExportFigmaDialog, setShowExportFigmaDialog] = useState(false);

  // Expose live token state to parent via onTokensChange
  useEffect(() => {
    if (!onTokensChange) return;
    const collectionName = loadedCollection?.name ?? '';
    if (tokenGroups.length === 0) {
      onTokensChange(null, globalNamespace, collectionName);
      return;
    }
    // Count tokens recursively — loaded collections may have all tokens in nested child
    // groups (e.g. { colors: { brand: { primary: {$value} } } } → root group has 0 direct
    // tokens but child groups have tokens). Without recursion, allTokens would always be 0
    // for nested structures and the button would stay disabled after loading a collection.
    const countTokensRecursive = (groups: typeof tokenGroups): number =>
      groups.reduce((sum, g) => {
        const childCount = g.children ? countTokensRecursive(g.children) : 0;
        return sum + g.tokens.length + childCount;
      }, 0);
    const allTokens = countTokensRecursive(tokenGroups);
    if (allTokens === 0) {
      onTokensChange(null, globalNamespace, collectionName);
      return;
    }
    const rawJson = tokenService.generateStyleDictionaryOutput(tokenGroups, globalNamespace);
    onTokensChange(rawJson as Record<string, unknown>, globalNamespace, collectionName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenGroups, globalNamespace, loadedCollection]);

  // Auto-load a collection when the parent passes a new one (e.g. user selects from shared header)
  useEffect(() => {
    if (!collectionToLoad) return;
    const { groups, detectedGlobalNamespace } = tokenService.processImportedTokens(
      collectionToLoad.tokens,
      ''
    );
    setTokenGroups(groups);
    setGlobalNamespace(detectedGlobalNamespace);
    setLoadedCollection({ id: collectionToLoad.id, name: collectionToLoad.name });
    setIsDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionToLoad?.id]);

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(createToast(message, type));
    setTimeout(() => setToast(null), 5000); // Auto-dismiss after 5 seconds
  };

  const hideToast = () => setToast(null);

  // Loading helper functions
  const setLoading = (isLoading: boolean, message?: string) => {
    setLoadingState(createLoadingState(isLoading, message));
  };

  // Save collection to MongoDB
  const handleSaveCollection = async (name: string) => {
    setIsSaving(true);
    try {
      const tokenSet = generateTokenSet();
      const sourceMetadata = githubConfig
        ? { repo: githubConfig.repository, branch: githubConfig.branch, path: null }
        : null;

      // If user confirmed overwrite (saveDialogDuplicateName is set), attempt PUT directly
      if (loadedCollection && saveDialogDuplicateName === name) {
        const res = await fetch(`/api/collections/${loadedCollection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tokens: tokenSet, sourceMetadata }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(`Failed to save: ${data.error}`, 'error');
          return;
        }
        setLoadedCollection({ id: data.collection._id, name: data.collection.name });
        setSaveDialogDuplicateName(null);
        setIsDirty(false);
        setShowSaveDialog(false);
        showToast(`Saved to database: ${data.collection.name}`, 'success');
        return;
      }

      // Otherwise POST (new name)
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tokens: tokenSet, sourceMetadata }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // Duplicate name — surface confirm-overwrite step in dialog
        setSaveDialogDuplicateName(name);
        // Store the existingId so the overwrite PUT uses it
        setLoadedCollection({ id: data.existingId, name });
        return; // dialog stays open, advances to confirm-overwrite step
      }

      if (!res.ok) {
        showToast(`Failed to save: ${data.error}`, 'error');
        return;
      }

      setLoadedCollection({ id: data.collection._id, name: data.collection.name });
      setSaveDialogDuplicateName(null);
      setIsDirty(false);
      setShowSaveDialog(false);
      showToast(`Saved to database: ${data.collection.name}`, 'success');
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a collection by id from MongoDB
  const handleLoadCollection = async (collectionId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(`Failed to load collection: ${data.error}`, 'error');
        return;
      }
      const { collection } = data;
      const { groups, detectedGlobalNamespace } = convertToTokenGroups(collection.tokens);
      // Programmatic state update — do NOT set dirty
      setTokenGroups(groups);
      setGlobalNamespace(detectedGlobalNamespace);
      setLoadedCollection({ id: collection._id, name: collection.name });
      setIsDirty(false);
      setShowLoadDialog(false);
      showToast(`Loaded: ${collection.name}`, 'success');
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Unsaved-changes guard before loading a collection
  const handleLoadRequest = async (collectionId: string) => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Loading a collection will replace them. Continue?');
      if (!confirmed) return;
    }
    await handleLoadCollection(collectionId);
  };

  // Use utility functions from utils module

  // Helper function to toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, expanded: !group.expanded };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };
    setTokenGroups(updateGroup(tokenGroups));
  };

  // Create a wrapper for buildFullPath that includes global namespace
  const buildTokenPath = (group: TokenGroup, tokenPath: string): string => {
    const parts = [];
    if (globalNamespace.trim()) parts.push(globalNamespace.trim());

    // Use utility function to get the path prefix for the group
    const groupPrefix = getPathPrefix(group, getAllGroups(tokenGroups), globalNamespace);
    if (groupPrefix) {
      // Remove the global namespace from the prefix since we're adding it separately
      const prefixWithoutNamespace = groupPrefix.replace(new RegExp(`^${globalNamespace}\\.`), '');
      if (prefixWithoutNamespace) parts.push(prefixWithoutNamespace.replace(/\.$/, ''));
    } else {
      parts.push(group.name);
    }

    if (tokenPath.trim()) parts.push(tokenPath.trim());
    return parts.join('.');
  };

  const addTokenGroup = () => {
    const groupName = newGroupName.trim() || `group-${tokenGroups.length + 1}`;
    const newGroup: TokenGroup = {
      id: generateId(),
      name: groupName,
      tokens: [],
      level: 0,
      expanded: true
    };
    setTokenGroups([...tokenGroups, newGroup]);
    setIsDirty(true);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const deleteTokenGroup = (groupId: string) => {
    const allGroups = getAllGroups(tokenGroups);
    if (allGroups.length === 1) {
      showToast('Cannot delete the last group', 'error');
      return;
    }

    const removeGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups
        .filter(group => group.id !== groupId)
        .map(group => ({
          ...group,
          children: group.children ? removeGroup(group.children) : undefined
        }));
    };

    setTokenGroups(removeGroup(tokenGroups));
    setIsDirty(true);
  };

  const updateGroupName = (groupId: string, newName: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, name: newName };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };
    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const addToken = (groupId: string) => {
    const newToken: GeneratedToken = {
      id: generateId(),
      path: '',
      value: '',
      type: 'color',
      description: '',
      attributes: {}
    };

    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, tokens: [...group.tokens, newToken] };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const updateToken = (groupId: string, tokenId: string, field: keyof GeneratedToken, value: any) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId ? { ...token, [field]: value } : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const toggleTokenExpansion = (tokenId: string) => {
    const newExpanded = new Set(expandedTokens);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    setExpandedTokens(newExpanded);
  };

  const updateTokenAttribute = (groupId: string, tokenId: string, key: string, value: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: { ...token.attributes, [key]: value }
                  }
                : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const removeTokenAttribute = (groupId: string, tokenId: string, key: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: Object.fromEntries(
                      Object.entries(token.attributes || {}).filter(([k]) => k !== key)
                    )
                  }
                : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const deleteToken = (groupId: string, tokenId: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, tokens: group.tokens.filter(token => token.id !== tokenId) };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  };

  const parseTokenValue = (value: string, type: string): any => {
    if (!value) return '';

    switch (type) {
      case 'color':
        return value;
      case 'dimension':
        return value;
      case 'fontWeight':
        return isNaN(Number(value)) ? value : Number(value);
      case 'duration':
        return value;
      case 'number':
        return Number(value);
      case 'cubicBezier':
      case 'fontFamily':
      case 'shadow':
      case 'border':
      case 'gradient':
      case 'typography':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const generateTokenSet = () => {
    return tokenService.generateStyleDictionaryOutput(tokenGroups, globalNamespace);
  };

  const exportToJSON = () => {
    const content = fileService.exportTokens(tokenGroups, globalNamespace, {
      format: 'json',
      fileName: 'design-tokens.json'
    });
    fileService.downloadFile(content, 'design-tokens.json', 'application/json');
  };

  const loadBranches = async () => {
    if (!githubConfig) {
      console.warn('No GitHub config available for loading branches');
      return;
    }

    setLoading(true, 'Loading repository branches...');

    try {
      console.log('Loading branches for repository:', githubConfig.repository);
      const branches = await githubService.getBranches(githubConfig.token, githubConfig.repository);
      const branchNames = branches.map(branch => branch.name);
      setAvailableBranches(branchNames);
      console.log('Successfully loaded branches:', branchNames);
    } catch (error) {
      console.error('Failed to load branches:', error);
      if (githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
      showToast('Error loading branches, using default branch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToGitHub = async () => {
    console.log('GitHub config check:', githubConfig); // Debug log
    if (!githubConfig) {
      showToast('Please configure GitHub connection first', 'error');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      // Continue anyway - the directory picker can work with the configured branch
      // Ensure we have at least the configured branch available
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  };

  const handleDirectorySelect = async (selectedPath: string, selectedBranch: string) => {
    setShowDirectoryPicker(false);

    if (!githubConfig) return;

    const isImportMode = directoryPickerMode === 'import';

    setLoading(true, isImportMode ? 'Importing tokens from GitHub...' : 'Exporting tokens to GitHub...');

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
            path: selectedPath
          }),
        });

        const result = await response.json();
        if (response.ok) {
          showToast(`Successfully pushed to GitHub! View at: ${result.url}`, 'success');
        } else {
          showToast(`Failed to push to GitHub: ${result.error}`, 'error');
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
            path: selectedPath
          }),
        });

        const result = await response.json();
        if (response.ok) {
          console.log('Import result:', result);
          console.log('Token set:', result.tokenSet);

          // Convert imported tokens to our format
          const { groups: importedTokens, detectedGlobalNamespace } = convertToTokenGroups(result.tokenSet);
          console.log('Converted token groups:', importedTokens);
          console.log('Detected global namespace:', detectedGlobalNamespace);

          setTokenGroups(importedTokens);
          setGlobalNamespace(detectedGlobalNamespace);
          const tokenCount = importedTokens.reduce((total, group) => total + group.tokens.length, 0);
          showToast(`Successfully imported ${tokenCount} tokens across ${importedTokens.length} groups from GitHub!`, 'success');
        } else {
          showToast(`Failed to import from GitHub: ${result.error}`, 'error');
        }
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const importFromGitHub = async () => {
    console.log('GitHub config check:', githubConfig); // Debug log
    if (!githubConfig) {
      showToast('Please configure GitHub connection first', 'error');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      // Continue anyway - the directory picker can work with the configured branch
      // Ensure we have at least the configured branch available
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  };

  const clearForm = () => {
    if (confirm('Are you sure you want to clear all tokens and groups? This cannot be undone.')) {
      setTokenGroups([{ id: generateId(), name: 'colors', tokens: [], level: 0, expanded: true }]);
      setGlobalNamespace('');
      setExpandedTokens(new Set());
      setLoadedCollection(null);
      setIsDirty(false);
      showToast('Form cleared successfully!', 'success');
    }
  };

  // Use token service to convert tokens to groups
  const convertToTokenGroups = (tokenSet: any): { groups: TokenGroup[]; detectedGlobalNamespace: string } => {
    return tokenService.processImportedTokens(tokenSet, globalNamespace);
  };

  const exportToFigma = () => {
    setShowExportFigmaDialog(true);
  };

  // Use token service for resolving token references
  const resolveTokenReference = (value: string): string => {
    return tokenService.resolveTokenReference(value, tokenGroups);
  };

  // Use imported getValuePlaceholder utility function

  // Recursive function to render nested groups
  const renderGroup = (group: TokenGroup) => {
    const hasChildren = group.children && group.children.length > 0;
    const hasTokens = group.tokens.length > 0;
    const indentLevel = group.level * 24;

    return (
      <div key={group.id}  className="mb-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="text-gray-500 hover:text-gray-700 h-auto p-0"
                  >
                    {group.expanded ? '▼' : '▶'}
                  </Button>
                )}
                <span className="font-mono text-sm text-gray-500">
                  Level {group.level}
                </span>
                <Input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="px-2 py-1 text-lg font-medium bg-transparent rounded border-none outline-none focus:bg-gray-50 h-auto"
                  placeholder="Group name"
                />
                {hasChildren && (
                  <span className="px-2 py-1 text-xs text-blue-600 bg-blue-100 rounded">
                    {group.children!.length} {group.children!.length === 1 ? 'child' : 'children'}
                  </span>
                )}
                {hasTokens && (
                  <span className="px-2 py-1 text-xs text-green-600 bg-green-100 rounded">
                    {group.tokens.length} {group.tokens.length === 1 ? 'token' : 'tokens'}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTokenGroup(group.id)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete Group
              </Button>
            </div>
          </div>

          {hasTokens && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Token Name</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.tokens.map((token) => (
                    <React.Fragment key={token.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="mr-2 font-mono text-sm text-gray-600">
                              {buildTokenPath(group, token.path).replace(/\./g, '-')}
                            </div>
                            <Input
                              type="text"
                              value={token.path}
                              onChange={(e) => updateToken(group.id, token.id, 'path', e.target.value)}
                              placeholder="token.name"
                              className="px-2 py-1 font-mono text-xs rounded border border-gray-300 bg-gray-50 text-gray-600 h-auto"
                              style={{ minWidth: '100px', maxWidth: '150px' }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={token.type}
                            onValueChange={(v) => updateToken(group.id, token.id, 'type', v)}
                          >
                            <SelectTrigger className="h-8 text-sm px-2 w-auto min-w-[100px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {TOKEN_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {token.type === 'color' && (
                              <div
                                className="w-6 h-6 border border-gray-300 rounded cursor-pointer flex-shrink-0"
                                style={{ backgroundColor: (() => {
                                  const resolvedValue = resolveTokenReference(token.value.toString());
                                  return typeof resolvedValue === 'string' && resolvedValue.startsWith('#')
                                    ? resolvedValue
                                    : typeof resolvedValue === 'string' && resolvedValue.startsWith('{')
                                      ? '#cccccc'
                                      : resolvedValue;
                                })() }}
                                title={`Color preview: ${token.value} ${token.value !== resolveTokenReference(token.value.toString()) ? `→ ${resolveTokenReference(token.value.toString())}` : ''}`}
                              />
                            )}
                            <Input
                              type="text"
                              value={token.value}
                              onChange={(e) => updateToken(group.id, token.id, 'value', parseTokenValue(e.target.value, token.type))}
                              placeholder={getValuePlaceholder(token.type)}
                              className="flex-1 px-2 py-1 font-mono text-sm rounded border border-gray-300 h-auto"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={token.description || ''}
                            onChange={(e) => updateToken(group.id, token.id, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 h-auto"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTokenExpansion(token.id)}
                              className="text-sm text-blue-600 hover:text-blue-800 h-auto p-0"
                            >
                              {expandedTokens.has(token.id) ? '↑' : '↓'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteToken(group.id, token.id)}
                              className="text-sm text-red-600 hover:text-red-800 h-auto p-0"
                            >
                              ✕
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedTokens.has(token.id) && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="space-y-2">
                              <h5 className="mb-2 text-sm font-medium text-gray-700">Custom Attributes</h5>
                              {Object.entries(token.attributes || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                      const newKey = e.target.value;
                                      removeTokenAttribute(group.id, token.id, key);
                                      updateTokenAttribute(group.id, token.id, newKey, value as string);
                                    }}
                                    placeholder="Attribute name"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 h-auto"
                                  />
                                  <span className="text-gray-500">:</span>
                                  <Input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => updateTokenAttribute(group.id, token.id, key, e.target.value)}
                                    placeholder="Attribute value"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 h-auto"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTokenAttribute(group.id, token.id, key)}
                                    className="text-sm text-red-600 hover:text-red-800 h-auto p-0"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateTokenAttribute(group.id, token.id, 'newAttribute', '')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 h-auto p-0"
                              >
                                + Add Attribute
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Always show — even when group is empty */}
          <div className="border-t border-gray-200 px-4 py-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addToken(group.id)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 h-auto p-0"
            >
              + Add Token
            </Button>
          </div>
        </div>
        {hasChildren && group.expanded && (
          <div className="mt-2">
            {group.children!.map(childGroup => renderGroup(childGroup))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Export Actions</h3>
            {loadedCollection && (
              <p className="text-xs text-emerald-700 font-medium">
                Editing: {loadedCollection.name}
              </p>
            )}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Global Namespace:</label>
              <Input
                type="text"
                value={globalNamespace}
                onChange={(e) => { setGlobalNamespace(e.target.value); setIsDirty(true); }}
                placeholder="Optional namespace (e.g., 'design', 'token')"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              size="sm"
              onClick={() => setShowJsonDialog(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Preview JSON
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save to Database
            </Button>
            <Button
              size="sm"
              onClick={() => setShowLoadDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Load Collection
            </Button>
            <Button
              size="sm"
              onClick={exportToJSON}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Download JSON
            </Button>
            <Button
              size="sm"
              onClick={exportToGitHub}
              className="bg-gray-800 hover:bg-gray-900 text-white"
            >
              Push to GitHub
            </Button>
            <Button
              size="sm"
              onClick={importFromGitHub}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Import from GitHub
            </Button>
            <Button
              size="sm"
              onClick={exportToFigma}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Export to Figma
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearForm}
            >
              Clear Form
            </Button>
          </div>
        </div>
        {globalNamespace && (
          <div className="text-sm text-gray-600">
            <strong>Preview:</strong> Tokens will be prefixed with "{globalNamespace}."
          </div>
        )}
      </div>

      {/* Token Groups */}
      {tokenGroups.map(group => renderGroup(group))}
      {/* Add Group */}
      <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
        {!isAddingGroup ? (
          <Button
            variant="ghost"
            onClick={() => setIsAddingGroup(true)}
            className="font-medium text-gray-600 hover:text-gray-800"
          >
            + Add Token Group
          </Button>
        ) : (
          <div className="flex justify-center items-center space-x-3">
            <Input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTokenGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); }
              }}
              placeholder="Group name (optional)..."
              autoFocus
            />
            <Button
              onClick={addTokenGroup}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              ✓
            </Button>
            <Button
              variant="outline"
              onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      {/* Directory Picker */}
      {showDirectoryPicker && githubConfig && (
        <GitHubDirectoryPicker
          githubToken={githubConfig.token}
          repository={githubConfig.repository}
          branch={githubConfig.branch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          defaultFilename={directoryPickerMode === 'import' ? '' : 'tokens.json'}
          mode={directoryPickerMode}
          availableBranches={availableBranches}
        />
      )}

      {/* JSON Preview Dialog */}
      <JsonPreviewDialog
        isOpen={showJsonDialog}
        onClose={() => setShowJsonDialog(false)}
        jsonData={generateTokenSet()}
      />

      {/* Save Collection Dialog */}
      <SaveCollectionDialog
        isOpen={showSaveDialog}
        initialName={loadedCollection?.name ?? ''}
        onSave={handleSaveCollection}
        onCancel={() => { setShowSaveDialog(false); setSaveDialogDuplicateName(null); }}
        isSaving={isSaving}
      />

      {/* Load Collection Dialog */}
      <LoadCollectionDialog
        isOpen={showLoadDialog}
        onLoad={handleLoadRequest}
        onCancel={() => setShowLoadDialog(false)}
      />

      {/* Export to Figma Dialog */}
      <ExportToFigmaDialog
        isOpen={showExportFigmaDialog}
        onClose={() => setShowExportFigmaDialog(false)}
        tokenSet={generateTokenSet() as Record<string, unknown>}
        loadedCollectionId={loadedCollection?.id ?? null}
      />

      {/* Loading Indicator */}
      <LoadingIndicator loadingState={loadingState} />

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
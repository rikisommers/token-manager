'use client';

import React, { useState, useEffect } from 'react';
import { GitHubDirectoryPicker } from './GitHubDirectoryPicker';
import { LoadingIndicator } from './LoadingIndicator';
import { ToastNotification } from './ToastNotification';
import { JsonPreviewDialog } from './JsonPreviewDialog';
import { SaveCollectionDialog } from './SaveCollectionDialog';

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
}

export function TokenGeneratorFormNew({ githubConfig }: TokenGeneratorFormNewProps) {
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

      // If name matches an already-loaded collection, attempt PUT (overwrite) directly
      if (loadedCollection && loadedCollection.name === name) {
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
      setShowSaveDialog(false);
      showToast(`Saved to database: ${data.collection.name}`, 'success');
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
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
      showToast('Form cleared successfully!', 'success');
    }
  };

  // Use token service to convert tokens to groups
  const convertToTokenGroups = (tokenSet: any): { groups: TokenGroup[]; detectedGlobalNamespace: string } => {
    return tokenService.processImportedTokens(tokenSet, globalNamespace);
  };

  const exportToFigma = async () => {
    const figmaToken = prompt('Enter Figma Personal Access Token:');
    const fileKey = prompt('Enter Figma File Key:');

    if (!figmaToken || !fileKey) {
      showToast('Figma token and file key are required', 'error');
      return;
    }

    try {
      const tokenSet = generateTokenSet();
      const response = await fetch('/api/export/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenSet, figmaToken, fileKey }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Successfully exported to Figma!', 'success');
      } else {
        showToast(`Failed to export to Figma: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
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
                  <button
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {group.expanded ? '▼' : '▶'}
                  </button>
                )}
                <span className="font-mono text-sm text-gray-500">
                  Level {group.level}
                </span>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="px-2 py-1 text-lg font-medium bg-transparent rounded border-none outline-none focus:bg-gray-50"
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
              <button
                onClick={() => deleteTokenGroup(group.id)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete Group
              </button>
            </div>
          </div>

          {hasTokens && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Path</th>
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
                              {buildTokenPath(group, token.path)}
                            </div>
                            <input
                              type="text"
                              value={token.path}
                              onChange={(e) => updateToken(group.id, token.id, 'path', e.target.value)}
                              placeholder="token.name"
                              className="px-2 py-1 font-mono text-xs rounded border border-gray-300 bg-gray-50 text-gray-600"
                              style={{ minWidth: '100px', maxWidth: '150px' }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={token.type}
                            onChange={(e) => updateToken(group.id, token.id, 'type', e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-gray-300"
                          >
                            {TOKEN_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
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
                            <input
                              type="text"
                              value={token.value}
                              onChange={(e) => updateToken(group.id, token.id, 'value', parseTokenValue(e.target.value, token.type))}
                              placeholder={getValuePlaceholder(token.type)}
                              className="flex-1 px-2 py-1 font-mono text-sm rounded border border-gray-300"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={token.description || ''}
                            onChange={(e) => updateToken(group.id, token.id, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="flex-1 px-2 py-1 text-sm rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleTokenExpansion(token.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {expandedTokens.has(token.id) ? '↑' : '↓'}
                            </button>
                            <button
                              onClick={() => deleteToken(group.id, token.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
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
                                  <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                      const newKey = e.target.value;
                                      removeTokenAttribute(group.id, token.id, key);
                                      updateTokenAttribute(group.id, token.id, newKey, value as string);
                                    }}
                                    placeholder="Attribute name"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300"
                                  />
                                  <span className="text-gray-500">:</span>
                                  <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => updateTokenAttribute(group.id, token.id, key, e.target.value)}
                                    placeholder="Attribute value"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300"
                                  />
                                  <button
                                    onClick={() => removeTokenAttribute(group.id, token.id, key)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => updateTokenAttribute(group.id, token.id, 'newAttribute', '')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                + Add Attribute
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  <tr className="bg-blue-50">
                    <td colSpan={5} className="px-4 py-3 text-center">
                      <button
                        onClick={() => addToken(group.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        + Add Token
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
              <input
                type="text"
                value={globalNamespace}
                onChange={(e) => setGlobalNamespace(e.target.value)}
                placeholder="Optional namespace (e.g., 'design', 'token')"
                className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowJsonDialog(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Preview JSON
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              Save to Database
            </button>
            <button
              onClick={exportToJSON}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Download JSON
            </button>
            <button
              onClick={exportToGitHub}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900"
            >
              Push to GitHub
            </button>
            <button
              onClick={importFromGitHub}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Import from GitHub
            </button>
            <button
              onClick={exportToFigma}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              Export to Figma
            </button>
            <button
              onClick={clearForm}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Clear Form
            </button>
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
          <button
            onClick={() => setIsAddingGroup(true)}
            className="font-medium text-gray-600 hover:text-gray-800"
          >
            + Add Token Group
          </button>
        ) : (
          <div className="flex justify-center items-center space-x-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTokenGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); }
              }}
              placeholder="Group name (optional)..."
              className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={addTokenGroup}
              className="px-3 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              ✓
            </button>
            <button
              onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}
              className="px-3 py-2 font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
            >
              ✕
            </button>
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

      {/* Loading Indicator */}
      <LoadingIndicator loadingState={loadingState} />

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
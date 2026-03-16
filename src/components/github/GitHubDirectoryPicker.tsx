'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: DirectoryItem[];
}

interface GitHubDirectoryPickerProps {
  githubToken: string;
  repository: string;
  branch: string;
  onSelect: (path: string, branch: string) => void;
  onCancel: () => void;
  defaultFilename?: string;
  mode?: 'export' | 'import';
  availableBranches?: string[];
}

export function GitHubDirectoryPicker({
  githubToken,
  repository,
  branch,
  onSelect,
  onCancel,
  defaultFilename = 'tokens.json',
  mode = 'export',
  availableBranches = []
}: GitHubDirectoryPickerProps) {
  const [directoryTree, setDirectoryTree] = useState<DirectoryItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [filename, setFilename] = useState(defaultFilename);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(branch);
  const [selectionType, setSelectionType] = useState<'file' | 'directory' | ''>('');

  // Load directory tree
  useEffect(() => {
    setDirectoryTree([]);
    setExpandedDirs(new Set());
    setSelectedPath('');
    setSelectedFile('');
    setSelectionType('');
    setLoading(true);
    loadDirectoryContents('');
  }, [githubToken, repository, selectedBranch]);

  const loadDirectoryContents = async (path: string = '') => {
    try {
      const apiUrl = `https://api.github.com/repos/${repository}/contents/${path}?ref=${selectedBranch}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load directory contents');
      }

      const contents = await response.json();

      if (path === '') {
        // Root level
        const items = contents
          .filter((item: any) => item.type === 'dir' || item.name.endsWith('.json'))
          .map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'dir' as const : 'file' as const,
            children: item.type === 'dir' ? [] : undefined
          }));

        setDirectoryTree(items);
        setLoading(false);
      } else {
        // Nested directory - update tree
        const items = contents
          .filter((item: any) => item.type === 'dir' || item.name.endsWith('.json'))
          .map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'dir' as const : 'file' as const,
            children: item.type === 'dir' ? [] : undefined
          }));

        setDirectoryTree(prev => updateTreeWithContents(prev, path, items));
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      alert('Failed to load directory contents');
    }
  };

  const updateTreeWithContents = (tree: DirectoryItem[], targetPath: string, newItems: DirectoryItem[]): DirectoryItem[] => {
    return tree.map(item => {
      if (item.path === targetPath && item.type === 'dir') {
        return { ...item, children: newItems };
      } else if (item.children && item.path !== targetPath) {
        return { ...item, children: updateTreeWithContents(item.children, targetPath, newItems) };
      }
      return item;
    });
  };

  const toggleDirectory = async (item: DirectoryItem) => {
    if (item.type !== 'dir') return;

    const newExpanded = new Set(expandedDirs);

    if (expandedDirs.has(item.path)) {
      newExpanded.delete(item.path);
    } else {
      newExpanded.add(item.path);
      // Load contents if not already loaded
      if (!item.children || item.children.length === 0) {
        await loadDirectoryContents(item.path);
      }
    }

    setExpandedDirs(newExpanded);
  };

  const handleSelect = () => {
    if (mode === 'import') {
      // For import, we can select either a file or directory
      if (selectionType === 'file' && selectedFile) {
        onSelect(selectedFile, selectedBranch);
      } else if (selectionType === 'directory') {
        onSelect(selectedPath, selectedBranch);
      } else {
        alert('Please select a JSON file or directory containing tokens');
        return;
      }
    } else {
      // For export, we need a filename
      if (!filename.trim()) {
        alert('Please enter a filename');
        return;
      }

      if (!filename.endsWith('.json')) {
        alert('Filename must end with .json');
        return;
      }

      const fullPath = selectedPath ? `${selectedPath}/${filename}` : filename;
      onSelect(fullPath, selectedBranch);
    }
  };

  const renderTree = (items: DirectoryItem[], level = 0) => {
    return items.map(item => (
      <div key={item.path} style={{ marginLeft: `${level * 20}px` }}>
        {item.type === 'dir' ? (
          <div
            className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
              selectedPath === item.path && selectionType === 'directory' ? 'bg-blue-100' : ''
            }`}
            onClick={() => {
              if (mode === 'import') {
                // For import mode, clicking a directory selects it
                setSelectedPath(item.path);
                setSelectedFile('');
                setSelectionType('directory');
              } else {
                // For export mode, clicking a directory just sets it as the parent directory
                setSelectedPath(item.path);
              }
              toggleDirectory(item);
            }}
          >
            <span className="mr-2 text-gray-500">
              {expandedDirs.has(item.path) ? '📁' : '📁'}
            </span>
            <span className="text-sm">{item.name}</span>
            {mode === 'import' && selectedPath === item.path && selectionType === 'directory' && (
              <span className="ml-auto text-xs text-blue-600">Selected</span>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
              selectedFile === item.path ? 'bg-green-100' : 'text-gray-600'
            }`}
            onClick={() => {
              if (mode === 'import') {
                setSelectedFile(item.path);
                setSelectedPath('');
                setSelectionType('file');
              }
            }}
          >
            <span className="mr-2">📄</span>
            <span className="text-sm">{item.name}</span>
            {mode === 'import' && selectedFile === item.path && (
              <span className="ml-auto text-xs text-green-600">Selected</span>
            )}
          </div>
        )}

        {item.children && expandedDirs.has(item.path) && (
          <div>
            {renderTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <div className="text-center">Loading directory tree...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">
            {mode === 'import' ? 'Select File to Import' : 'Choose Export Destination'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">Repository Directory Structure:</div>
              {availableBranches.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700">Branch:</label>
                  <Select
                    value={selectedBranch}
                    onValueChange={(v) => setSelectedBranch(v)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 py-1 w-auto min-w-[120px]">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBranches.map(branchName => (
                        <SelectItem key={branchName} value={branchName}>{branchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="border rounded-md p-3 bg-gray-50 max-h-64 overflow-auto">
              <div
                className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
                  selectedPath === '' && selectionType === 'directory' ? 'bg-blue-100' : ''
                }`}
                onClick={() => {
                  if (mode === 'import') {
                    setSelectedPath('');
                    setSelectedFile('');
                    setSelectionType('directory');
                  } else {
                    setSelectedPath('');
                  }
                }}
              >
                <span className="mr-2">📁</span>
                <span className="text-sm font-medium">/ (root)</span>
                {mode === 'import' && selectedPath === '' && selectionType === 'directory' && (
                  <span className="ml-auto text-xs text-blue-600">Selected</span>
                )}
              </div>
              {renderTree(directoryTree)}
            </div>
          </div>

          {mode === 'import' ? (
            <div className="space-y-3">
              {selectionType === 'file' && selectedFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected File:
                  </label>
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm font-mono text-green-800">
                    {selectedFile}
                  </div>
                </div>
              )}
              {selectionType === 'directory' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected Directory:
                  </label>
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-blue-800">
                    /{selectedPath || '(root)'}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Will import all JSON files from this directory and all subdirectories
                  </p>
                </div>
              )}
              <div className="text-sm text-gray-600">
                {selectionType ? (
                  <span>✅ Selection ready for import</span>
                ) : (
                  <span>Click on a JSON file or directory above to select it for import</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Directory:
                </label>
                <div className="px-3 py-2 bg-gray-50 border rounded text-sm font-mono">
                  /{selectedPath || '(root)'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filename:
                </label>
                <Input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="tokens.json"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Path:
                </label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-blue-800">
                  {selectedPath ? `${selectedPath}/${filename}` : filename}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
          >
            Select Path
          </Button>
        </div>
      </div>
    </div>
  );
}

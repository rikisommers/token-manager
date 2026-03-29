"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { ChevronDown, ChevronUp, Trash2, RotateCcw, Lock, EllipsisVertical } from "lucide-react";
import { LoadingIndicator } from "@/components/layout/LoadingIndicator";
import { showSuccessToast, showErrorToast } from "@/utils/toast.utils";
import { JsonPreviewDialog } from "@/components/dev/JsonPreviewDialog";
import { LoadCollectionDialog } from "@/components/collections/LoadCollectionDialog";
import { TokenReferencePicker } from "@/components/tokens/TokenReferencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import services and types
import { tokenService, fileService } from "../../services";
import {
  GeneratedToken,
  TokenGroup,
  GitHubConfig,
  TokenType,
  TOKEN_TYPES,
  LoadingState,
} from "../../types";
import {
  generateId,
  buildFullPath,
  getPathPrefix,
  findGroupById,
  getAllGroups,
  getValuePlaceholder,
  validateTokenPath,
  validateTokenValue,
  parseTokenValue,
  countTokensRecursive,
  bulkDeleteTokens,
  bulkMoveTokens,
  bulkChangeType,
  bulkAddPrefix,
  bulkRemovePrefix,
  detectCommonPrefix,
} from "../../utils";
import { createLoadingState } from "../../utils";
import { BulkActionBar } from "./BulkActionBar";

// ─── TokenTableRow ─────────────────────────────────────────────────────────────

interface TokenTableRowProps {
  token: GeneratedToken;
  group: TokenGroup;
  tokenGroups: TokenGroup[];
  selectedTokenId?: string | null;
  isExpanded: boolean;
  onTokenSelect?: (token: GeneratedToken | null, groupPath: string) => void;
  onUpdateToken: (
    groupId: string,
    tokenId: string,
    field: keyof GeneratedToken,
    value: unknown,
  ) => void;
  onDeleteToken: (groupId: string, tokenId: string) => void;
  onToggleExpansion: (tokenId: string) => void;
  onUpdateAttribute: (
    groupId: string,
    tokenId: string,
    key: string,
    value: string,
  ) => void;
  onRemoveAttribute: (groupId: string, tokenId: string, key: string) => void;
  resolveRef: (value: string) => string;
  getFullPath: (group: TokenGroup, tokenPath: string) => string;
  parseValue: (raw: string, type: TokenType) => unknown;
  isReadOnly?: boolean;
  isPathLocked?: boolean;
  masterValue?: string;
  onResetToDefault?: (
    groupId: string,
    tokenId: string,
    masterValue: string,
  ) => void;
  /** Whether this row is in the multi-select set */
  isMultiSelected?: boolean;
  /** Index of this token in the active token array (for shift-range select) */
  tokenIndex?: number;
  /** Called when the row checkbox is clicked */
  onMultiSelectClick?: (shiftKey: boolean, tokenIndex: number) => void;
}

/** Upsert incoming tokens into an existing list, matching by path. Updates value/type of
 *  existing tokens and appends any that are new. */
function upsertTokensByPath(
  existing: GeneratedToken[],
  incoming: GeneratedToken[],
): GeneratedToken[] {
  const result = existing.map((t) => {
    const match = incoming.find((n) => n.path === t.path);
    return match
      ? {
          ...t,
          value: match.value,
          type: match.type,
          description: match.description ?? t.description,
        }
      : t;
  });
  const existingPaths = new Set(existing.map((t) => t.path));
  for (const token of incoming) {
    if (!existingPaths.has(token.path)) result.push(token);
  }
  return result;
}

function TokenTableRow({
  token,
  group,
  tokenGroups,
  selectedTokenId,
  isExpanded,
  onTokenSelect,
  onUpdateToken,
  onDeleteToken,
  onToggleExpansion,
  onUpdateAttribute,
  onRemoveAttribute,
  resolveRef,
  getFullPath,
  parseValue,
  isReadOnly,
  isPathLocked,
  masterValue,
  onResetToDefault,
  isMultiSelected,
  tokenIndex,
  onMultiSelectClick,
}: TokenTableRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const trRef = useRef<HTMLTableRowElement>(null);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!trRef.current?.contains(e.relatedTarget as Node)) {
      setEditingField(null);
    }
  }, []);

  const enterEdit = useCallback(
    (field: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingField(field);
    },
    [],
  );

  const resolvedValue = resolveRef(token.value?.toString() ?? "");
  const swatchBg = resolvedValue.startsWith("#")
    ? resolvedValue
    : resolvedValue.startsWith("{")
      ? "#cccccc"
      : resolvedValue || "#cccccc";

  const isSelected = selectedTokenId === token.id;

  return (
    <>
      <tr
        ref={trRef}
        className={`transition-colors group/row ${isMultiSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-gray-50/60"}`}
        style={{ height: 36 }}
        onFocusCapture={() =>
          onTokenSelect?.(isSelected ? null : token, group.path ?? group.name)
        }
      >
        {/* Multi-select checkbox */}
        {!isReadOnly ? (
          <td className="w-10 px-2 py-0 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isMultiSelected ?? false}
              onChange={() => { /* controlled via onClick to capture shiftKey */ }}
              onClick={(e) => {
                e.stopPropagation();
                onMultiSelectClick?.(e.shiftKey, tokenIndex ?? 0);
              }}
              className="accent-blue-500 w-4 h-4 cursor-pointer"
              aria-label={`Select token ${token.path}`}
            />
          </td>
        ) : (
          <td className="w-10 border-r border-gray-100" />
        )}
        {/* Name */}
        <td className="px-0 py-0 border-r border-gray-100 w-[180px]">
          {!isPathLocked && editingField === "path" ? (
            <Input
              autoFocus
              value={token.path}
              onChange={(e) =>
                onUpdateToken(group.id, token.id, "path", e.target.value)
              }
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
              placeholder="token-name"
              className="h-9 w-full border-0 rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400 font-mono text-xs bg-white"
            />
          ) : (
            <div
              className={`h-9 flex items-center px-4 font-mono text-sm text-gray-700 ${isReadOnly || isPathLocked ? "cursor-default" : "cursor-text"}`}
              onClick={
                isReadOnly || isPathLocked ? undefined : enterEdit("path")
              }
            >
              <span className="truncate">
                {token.path || <span className="text-gray-300">—</span>}
              </span>
            </div>
          )}
        </td>

        {/* Type */}
        <td className="px-0 py-0 border-r border-gray-100 w-[180px]">
          {editingField === "type" ? (
            <Select
              value={token.type}
              onValueChange={(v) => {
                onUpdateToken(group.id, token.id, "type", v);
                setEditingField(null);
              }}
              open
              onOpenChange={(o) => {
                if (!o) setEditingField(null);
              }}
            >
              <SelectTrigger
                className="h-9 w-full border-0 rounded-none shadow-none focus:ring-0 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div
              className={`h-9 flex items-center px-3 ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
              onClick={isReadOnly ? undefined : enterEdit("type")}
            >
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                {token.type}
              </span>
            </div>
          )}
        </td>

        {/* Value */}
        <td className="px-0 py-0 border-r border-gray-100 w-[180px]">
          <div className="h-9 flex items-center gap-1.5 px-2">
            {/* Color swatch / picker */}
            {token.type === "color" && (
              <Popover open={isReadOnly ? false : colorPickerOpen} onOpenChange={isReadOnly ? undefined : setColorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-5 h-5 rounded border border-gray-300 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition-shadow"
                    style={{ backgroundColor: swatchBg }}
                    onClick={(e) => e.stopPropagation()}
                    title="Pick color"
                  />
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-3 flex flex-col gap-2"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HexColorPicker
                    color={swatchBg.startsWith("#") ? swatchBg : "#000000"}
                    onChange={(hex) =>
                      onUpdateToken(group.id, token.id, "value", hex)
                    }
                  />
                  <HexColorInput
                    color={swatchBg.startsWith("#") ? swatchBg : "#000000"}
                    onChange={(hex) =>
                      onUpdateToken(group.id, token.id, "value", hex)
                    }
                    prefixed
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Value input / display */}
            {editingField === "value" ? (
              <Input
                autoFocus
                value={token.value?.toString() ?? ""}
                onChange={(e) =>
                  onUpdateToken(
                    group.id,
                    token.id,
                    "value",
                    parseValue(e.target.value, token.type),
                  )
                }
                onBlur={handleBlur}
                onClick={(e) => e.stopPropagation()}
                placeholder={getValuePlaceholder(token.type)}
                className="flex-1 h-7 border border-gray-300 rounded px-2 text-sm font-mono shadow-none focus-visible:ring-1 focus-visible:ring-blue-400"
              />
            ) : (
              <div
                className={`flex-1 text-sm font-mono text-gray-700 truncate ${isReadOnly ? "cursor-default" : "cursor-text"}`}
                onClick={isReadOnly ? undefined : enterEdit("value")}
              >
                {token.value?.toString() || (
                  <span className="text-gray-300">
                    {getValuePlaceholder(token.type)}
                  </span>
                )}
              </div>
            )}

            {/* Reset to collection default button */}
            {!isReadOnly &&
              masterValue !== undefined &&
              onResetToDefault &&
              String(token.value ?? "") !== masterValue && (
                <button
                  type="button"
                  title="Reset to collection default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetToDefault(group.id, token.id, masterValue);
                  }}
                  className="text-gray-400 hover:text-indigo-600 flex-shrink-0 focus:outline-none"
                >
                  <RotateCcw size={12} />
                </button>
              )}

            {/* Reference picker — hidden for read-only roles */}
            {!isReadOnly && (
              <div onClick={(e) => e.stopPropagation()}>
                <TokenReferencePicker
                  allGroups={tokenGroups}
                  onSelect={(alias) =>
                    onUpdateToken(group.id, token.id, "value", alias)
                  }
                />
              </div>
            )}
          </div>
        </td>

        {/* Description */}
        <td className="px-0 py-0 border-r border-gray-100 w-[180px]">
          {editingField === "description" ? (
            <Input
              autoFocus
              value={token.description || ""}
              onChange={(e) =>
                onUpdateToken(group.id, token.id, "description", e.target.value)
              }
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
              placeholder="Optional description"
              className="h-9 w-full border-0 rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400 text-sm bg-white"
            />
          ) : (
            <div
              className={`h-9 flex items-center px-4 text-sm text-gray-500 truncate ${isReadOnly ? "cursor-default" : "cursor-text"}`}
              onClick={isReadOnly ? undefined : enterEdit("description")}
            >
              {token.description || <span className="text-gray-300">—</span>}
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="px-2 py-0 w-[72px]">
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpansion(token.id);
              }}
              title="Toggle attributes"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>
            {isReadOnly ? (
              <span
                title="Source group — read only"
                className="h-6 w-6 flex items-center justify-center text-gray-300"
              >
                <Lock size={12} />
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:pointer-events-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteToken(group.id, token.id);
                }}
                disabled={isReadOnly}
                title={isReadOnly ? "Source group — read only" : "Delete token"}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded: custom attributes */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="space-y-2">
              <h5 className="mb-2 text-sm font-medium text-gray-700">
                Custom Attributes
              </h5>
              {Object.entries(token.attributes || {}).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={key}
                    readOnly={isReadOnly}
                    onChange={isReadOnly ? undefined : (e) => {
                      const newKey = e.target.value;
                      onRemoveAttribute(group.id, token.id, key);
                      onUpdateAttribute(group.id, token.id, newKey, value as string);
                    }}
                    placeholder="Attribute name"
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 h-auto"
                  />
                  <span className="text-gray-500">:</span>
                  <Input
                    type="text"
                    value={value as string}
                    readOnly={isReadOnly}
                    onChange={isReadOnly ? undefined : (e) =>
                      onUpdateAttribute(group.id, token.id, key, e.target.value)
                    }
                    placeholder="Attribute value"
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 h-auto"
                  />
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAttribute(group.id, token.id, key)}
                      className="text-sm text-red-600 hover:text-red-800 h-auto p-0"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onUpdateAttribute(group.id, token.id, "newAttribute", "")
                  }
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 h-auto p-0"
                >
                  + Add Attribute
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface TokenGeneratorFormProps {
  githubConfig?: GitHubConfig | null;
  onTokensChange?: (
    tokens: Record<string, unknown> | null,
    namespace: string,
    collectionName: string,
  ) => void;
  collectionToLoad?: {
    id: string;
    name: string;
    tokens: Record<string, unknown>;
  } | null;
  namespace?: string;
  onNamespaceChange?: (ns: string) => void;
  onGroupsChange?: (groups: TokenGroup[]) => void;
  onGroupSelect?: (groupId: string) => void;
  selectedGroupId?: string;
  pendingNewGroup?: string | null;
  onGroupAdded?: (group: { id: string; name: string }) => void;
  hideNamespaceAndActions?: boolean;
  hideAddGroupButton?: boolean;
  onTokenSelect?: (token: GeneratedToken | null, groupPath: string) => void;
  selectedTokenId?: string | null;
  pendingBulkInsert?: {
    groupId: string;
    tokens: GeneratedToken[];
    subgroupName?: string;
  } | null;
  onBulkInsertProcessed?: () => void;
  pendingGroupCreation?: {
    parentGroupId: string | null;
    groupData: { name: string; tokens: GeneratedToken[] };
  } | null;
  onGroupCreationProcessed?: () => void;
  pendingGroupAction?: { type: "delete" | "addSub"; groupId: string; name?: string } | null;
  onGroupActionProcessed?: () => void;
  themeTokens?: TokenGroup[];
  onThemeTokensChange?: (tokens: TokenGroup[]) => void;
  isReadOnly?: boolean;
  findMasterValue?: (groupId: string, tokenPath: string) => string | undefined;
  onResetToDefault?: (
    groupId: string,
    tokenId: string,
    masterValue: string,
  ) => void;
  /** Reset entire group to source: delete tokens not in source, reset values */
  onResetGroupToSource?: (groupId: string) => void;
  /** Whether a group is in source mode (read-only, no reset) */
  isGroupSource?: (groupId: string) => boolean;
  /** When theme is active and graph token names differ from default */
  tokenNameMismatch?: {
    inThemeNotDefault: string[];
    inDefaultNotTheme: string[];
  } | null;
  /** Callback for Preview JSON action */
  onPreviewJSON?: () => void;
  /** Callback for Download JSON action */
  onDownloadJSON?: () => void;
  /** Called before a bulk mutation in non-theme mode; parent pushes snapshot to its undo stack */
  onUndoSnapshot?: (groups: TokenGroup[]) => void;
}

export function TokenGeneratorForm({
  githubConfig,
  onTokensChange,
  collectionToLoad,
  namespace,
  onNamespaceChange,
  onGroupsChange,
  onGroupSelect,
  selectedGroupId,
  pendingNewGroup,
  onGroupAdded,
  hideNamespaceAndActions,
  hideAddGroupButton,
  onTokenSelect,
  selectedTokenId,
  pendingBulkInsert,
  onBulkInsertProcessed,
  pendingGroupCreation,
  onGroupCreationProcessed,
  pendingGroupAction,
  onGroupActionProcessed,
  themeTokens,
  onThemeTokensChange,
  isReadOnly,
  findMasterValue,
  onResetToDefault,
  onResetGroupToSource,
  isGroupSource,
  tokenNameMismatch,
  onPreviewJSON,
  onDownloadJSON,
  onUndoSnapshot,
}: TokenGeneratorFormProps) {
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([
    { id: "1", name: "colors", tokens: [], level: 0, expanded: true },
  ]);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [globalNamespace, setGlobalNamespace] = useState("");

  // Multi-row selection state
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number>(-1);
  const tokenUndoStackRef = useRef<TokenGroup[][]>([]);
  const MAX_BULK_UNDO = 20;

  // Prefix live-edit state
  const [prefixInputValue, setPrefixInputValue] = useState('');
  const isPrefixEditingRef = useRef(false);
  const prefixBaseSnapshotRef = useRef<TokenGroup[] | null>(null);
  const prefixOriginalRef = useRef<string>('');
  const [loadingState, setLoadingState] = useState<LoadingState>(
    createLoadingState(false),
  );
  // Collection persistence state
  const [loadedCollection, setLoadedCollection] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Expose live token state to parent via onTokensChange
  useEffect(() => {
    if (!onTokensChange) return;
    if (themeTokens && themeTokens.length > 0) return; // Theme mode: don't push tokenGroups to parent
    const collectionName = loadedCollection?.name ?? "";
    if (tokenGroups.length === 0) {
      onTokensChange(null, globalNamespace, collectionName);
      return;
    }
    // Count tokens recursively — loaded collections may have all tokens in nested child
    // groups (e.g. { colors: { brand: { primary: {$value} } } } → root group has 0 direct
    // tokens but child groups have tokens). Without recursion, allTokens would always be 0
    // for nested structures and the button would stay disabled after loading a collection.
    const allTokens = countTokensRecursive(tokenGroups);
    if (allTokens === 0) {
      onTokensChange(null, globalNamespace, collectionName);
      return;
    }
    const rawJson = tokenService.generateStyleDictionaryOutput(
      tokenGroups,
      globalNamespace,
    );
    onTokensChange(
      rawJson as Record<string, unknown>,
      globalNamespace,
      collectionName,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenGroups, globalNamespace, loadedCollection, themeTokens]);

  // Auto-load a collection when the parent passes a new one (e.g. user selects from shared header)
  useEffect(() => {
    if (!collectionToLoad) return;
    const { groups, detectedGlobalNamespace } =
      tokenService.processImportedTokens(collectionToLoad.tokens, "");
    setTokenGroups(groups);
    setGlobalNamespace(detectedGlobalNamespace);
    setLoadedCollection({
      id: collectionToLoad.id,
      name: collectionToLoad.name,
    });
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionToLoad?.id]);

  // Sync controlled namespace prop into internal state
  useEffect(() => {
    if (namespace !== undefined && namespace !== globalNamespace)
      setGlobalNamespace(namespace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  // Clear multi-row selection when the user navigates to a different group
  useEffect(() => {
    setSelectedTokenIds(new Set());
    lastSelectedIndexRef.current = -1;
    isPrefixEditingRef.current = false;
    prefixBaseSnapshotRef.current = null;
    setPrefixInputValue('');
  }, [selectedGroupId]);

  // Sync prefix input when selection membership changes (not while actively editing)
  const selectionKey = [...selectedTokenIds].sort().join(',');
  useEffect(() => {
    if (isPrefixEditingRef.current) return;
    const currentGroups = (themeTokens && themeTokens.length > 0) ? themeTokens : tokenGroups;
    const group = findGroupById(currentGroups, selectedGroupId ?? '')
      ?? currentGroups.find(g => g.id === selectedGroupId);
    const paths = [...selectedTokenIds]
      .map(id => group?.tokens.find(t => t.id === id)?.path ?? '')
      .filter(Boolean);
    setPrefixInputValue(detectCommonPrefix(paths));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  // Loading helper functions
  const setLoading = (isLoading: boolean, message?: string) => {
    setLoadingState(createLoadingState(isLoading, message));
  };


  // Load a collection by id from MongoDB
  const handleLoadCollection = async (collectionId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const data = await res.json();
      if (!res.ok) {
        showErrorToast(`Failed to load collection: ${data.error}`);
        return;
      }
      const { collection } = data;
      const { groups, detectedGlobalNamespace } = convertToTokenGroups(
        collection.tokens,
      );
      // Programmatic state update — do NOT set dirty
      setTokenGroups(groups);
      setGlobalNamespace(detectedGlobalNamespace);
      setLoadedCollection({ id: collection._id, name: collection.name });
      setIsDirty(false);
      setShowLoadDialog(false);
      showSuccessToast(`Loaded: ${collection.name}`);
    } catch (err) {
      showErrorToast(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  // Unsaved-changes guard before loading a collection
  const handleLoadRequest = async (collectionId: string) => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Loading a collection will replace them. Continue?",
      );
      if (!confirmed) return;
    }
    await handleLoadCollection(collectionId);
  };

  // Use utility functions from utils module

  // Helper function to toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
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
    const groupPrefix = getPathPrefix(
      group,
      getAllGroups(tokenGroups),
      globalNamespace,
    );
    if (groupPrefix) {
      // Remove the global namespace from the prefix since we're adding it separately
      const prefixWithoutNamespace = groupPrefix.replace(
        new RegExp(`^${globalNamespace}\\.`),
        "",
      );
      if (prefixWithoutNamespace)
        parts.push(prefixWithoutNamespace.replace(/\.$/, ""));
    } else {
      parts.push(group.name);
    }

    if (tokenPath.trim()) parts.push(tokenPath.trim());
    return parts.join(".");
  };

  const addTokenGroup = (externalName?: string): TokenGroup => {
    const groupName =
      (externalName ?? newGroupName).trim() ||
      `group-${tokenGroups.length + 1}`;
    const newGroup: TokenGroup = {
      id: generateId(),
      name: groupName,
      tokens: [],
      level: 0,
      expanded: true,
    };
    setTokenGroups((prev) => [...prev, newGroup]);
    setIsDirty(true);
    setNewGroupName("");
    setIsAddingGroup(false);
    return newGroup;
  };

  // Notify parent when token groups change (emits full TokenGroup[] tree with children)
  const prevGroupsRef = useRef<string>("");
  useEffect(() => {
    if (!onGroupsChange) return;
    const serialized = JSON.stringify(tokenGroups);
    if (serialized === prevGroupsRef.current) return;
    prevGroupsRef.current = serialized;
    onGroupsChange(tokenGroups);
  }, [tokenGroups, onGroupsChange]);

  // Handle external pending new group
  const prevPendingGroupRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingNewGroup) return;
    if (pendingNewGroup === prevPendingGroupRef.current) return;
    prevPendingGroupRef.current = pendingNewGroup;
    const newGroup = addTokenGroup(pendingNewGroup);
    onGroupAdded?.({ id: newGroup.id, name: newGroup.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNewGroup]);

  useEffect(() => {
    if (!pendingBulkInsert) return;
    const { groupId, tokens, subgroupName } = pendingBulkInsert;

    if (subgroupName) {
      // Upsert: update existing child group with same name, or create new one
      const upsertSubgroup = (groups: TokenGroup[]): TokenGroup[] =>
        groups.map((g) => {
          if (g.id === groupId) {
            const existingChild = g.children?.find(
              (c) => c.name === subgroupName,
            );
            if (existingChild) {
              const upsertedTokens = upsertTokensByPath(
                existingChild.tokens,
                tokens,
              );
              return {
                ...g,
                children: (g.children ?? []).map((c) =>
                  c.name === subgroupName
                    ? { ...c, tokens: upsertedTokens }
                    : c,
                ),
                expanded: true,
              };
            }
            const newChild: TokenGroup = {
              id: generateId(),
              name: subgroupName,
              tokens,
              level: g.level + 1,
              parent: groupId,
              children: [],
              expanded: true,
            };
            return {
              ...g,
              children: [...(g.children ?? []), newChild],
              expanded: true,
            };
          }
          if (g.children?.length)
            return { ...g, children: upsertSubgroup(g.children) };
          return g;
        });
      setTokenGroups((prev) => upsertSubgroup(prev));
    } else {
      const upsertIntoGroup = (groups: TokenGroup[]): TokenGroup[] =>
        groups.map((group) => {
          if (group.id === groupId)
            return {
              ...group,
              tokens: upsertTokensByPath(group.tokens, tokens),
            };
          if (group.children?.length)
            return { ...group, children: upsertIntoGroup(group.children) };
          return group;
        });
      setTokenGroups((prev) => upsertIntoGroup(prev));
    }

    setIsDirty(true);
    onBulkInsertProcessed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBulkInsert]);

  useEffect(() => {
    if (!pendingGroupCreation) return;
    const { parentGroupId, groupData } = pendingGroupCreation;

    if (parentGroupId) {
      // Create as subgroup
      addSubGroup(parentGroupId, groupData.name);
      // Find the newly created group and add tokens to it
      setTokenGroups(prev => {
        const findAndAddTokens = (groups: TokenGroup[]): TokenGroup[] =>
          groups.map(g => {
            if (g.id === parentGroupId && g.children) {
              const newChild = g.children.find(child => child.name === groupData.name);
              if (newChild) {
                return {
                  ...g,
                  children: g.children.map(child =>
                    child.name === groupData.name
                      ? { ...child, tokens: [...child.tokens, ...groupData.tokens] }
                      : child
                  ),
                };
              }
            }
            if (g.children) {
              return { ...g, children: findAndAddTokens(g.children) };
            }
            return g;
          });
        return findAndAddTokens(prev);
      });
    } else {
      // Create as root level group
      addTokenGroup(groupData.name);
      // Find the newly created group and add tokens to it
      setTokenGroups(prev => {
        const newGroup = prev.find(g => g.name === groupData.name);
        if (newGroup) {
          return prev.map(g =>
            g.name === groupData.name
              ? { ...g, tokens: [...g.tokens, ...groupData.tokens] }
              : g
          );
        }
        return prev;
      });
    }

    setIsDirty(true);
    onGroupCreationProcessed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGroupCreation]);

  useEffect(() => {
    if (!pendingGroupAction) return;
    if (pendingGroupAction.type === "delete") {
      deleteTokenGroup(pendingGroupAction.groupId);
    } else if (pendingGroupAction.type === "addSub") {
      addSubGroup(pendingGroupAction.groupId, pendingGroupAction.name);
    }
    onGroupActionProcessed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGroupAction]);

  const deleteTokenGroup = (groupId: string) => {
    const allGroups = getAllGroups(tokenGroups);
    if (allGroups.length === 1) {
      showErrorToast("Cannot delete the last group");
      return;
    }

    const removeGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups
        .filter((group) => group.id !== groupId)
        .map((group) => ({
          ...group,
          children: group.children ? removeGroup(group.children) : undefined,
        }));
    };

    setTokenGroups(removeGroup(tokenGroups));
    setIsDirty(true);
  };

  const updateGroupName = (groupId: string, newName: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
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
    if (isReadOnly) return; // Source group: read-only
    const newToken: GeneratedToken = {
      id: generateId(),
      path: "",
      value: "",
      type: "color",
      description: "",
      attributes: {},
    };

    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
        if (group.id === groupId) {
          return { ...group, tokens: [...group.tokens, newToken] };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    const groupInTheme =
      themeTokens &&
      onThemeTokensChange &&
      (themeTokens.some((g) => g.id === groupId) ||
        !!findGroupById(themeTokens, groupId));
    if (groupInTheme) {
      onThemeTokensChange!(updateGroup(themeTokens!));
    } else {
      setTokenGroups(updateGroup(tokenGroups));
      setIsDirty(true);
    }
  };

  const updateToken = (
    groupId: string,
    tokenId: string,
    field: keyof GeneratedToken,
    value: any,
  ) => {
    const groupInTheme =
      themeTokens &&
      onThemeTokensChange &&
      (themeTokens.some((g) => g.id === groupId) ||
        !!findGroupById(themeTokens, groupId));
    if (groupInTheme && field === "path") return; // Theme mode: token names locked

    const applyUpdate = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map((token) =>
              token.id === tokenId ? { ...token, [field]: value } : token,
            ),
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: applyUpdate(group.children) };
        }
        return group;
      });
    };

    if (groupInTheme) {
      onThemeTokensChange!(applyUpdate(themeTokens!));
    } else {
      setTokenGroups(applyUpdate(tokenGroups));
      setIsDirty(true);
    }
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

  const updateTokenAttribute = (
    groupId: string,
    tokenId: string,
    key: string,
    value: string,
  ) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map((token) =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: { ...token.attributes, [key]: value },
                  }
                : token,
            ),
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    const groupInTheme =
      themeTokens &&
      onThemeTokensChange &&
      (themeTokens.some((g) => g.id === groupId) ||
        !!findGroupById(themeTokens, groupId));
    if (groupInTheme) {
      onThemeTokensChange!(updateGroup(themeTokens!));
    } else {
      setTokenGroups(updateGroup(tokenGroups));
      setIsDirty(true);
    }
  };

  const removeTokenAttribute = (
    groupId: string,
    tokenId: string,
    key: string,
  ) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map((token) =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: Object.fromEntries(
                      Object.entries(token.attributes || {}).filter(
                        ([k]) => k !== key,
                      ),
                    ),
                  }
                : token,
            ),
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    const groupInTheme =
      themeTokens &&
      onThemeTokensChange &&
      (themeTokens.some((g) => g.id === groupId) ||
        !!findGroupById(themeTokens, groupId));
    if (groupInTheme) {
      onThemeTokensChange!(updateGroup(themeTokens!));
    } else {
      setTokenGroups(updateGroup(tokenGroups));
      setIsDirty(true);
    }
  };

  const deleteToken = (groupId: string, tokenId: string) => {
    if (isReadOnly) return; // Source group: read-only
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.filter((token) => token.id !== tokenId),
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    const groupInTheme =
      themeTokens &&
      onThemeTokensChange &&
      (themeTokens.some((g) => g.id === groupId) ||
        !!findGroupById(themeTokens, groupId));
    if (groupInTheme) {
      onThemeTokensChange!(updateGroup(themeTokens!));
    } else {
      setTokenGroups(updateGroup(tokenGroups));
      setIsDirty(true);
    }
  };

  const generateTokenSet = () => {
    return tokenService.generateStyleDictionaryOutput(
      tokenGroups,
      globalNamespace,
    );
  };

  const exportToJSON = () => {
    const content = fileService.exportTokens(tokenGroups, globalNamespace, {
      format: "json",
      fileName: "design-tokens.json",
    });
    fileService.downloadFile(content, "design-tokens.json", "application/json");
  };






  // Use token service to convert tokens to groups
  const convertToTokenGroups = (
    tokenSet: any,
  ): { groups: TokenGroup[]; detectedGlobalNamespace: string } => {
    return tokenService.processImportedTokens(tokenSet, globalNamespace);
  };


  // Use token service for resolving token references
  const resolveTokenReference = (value: string): string => {
    return tokenService.resolveTokenReference(value, tokenGroups);
  };

  // Use imported getValuePlaceholder utility function

  // Add a child group under an existing group
  const addSubGroup = (parentGroupId: string, name?: string) => {
    const insertChild = (groups: TokenGroup[]): TokenGroup[] =>
      groups.map((g) => {
        if (g.id === parentGroupId) {
          const newChild: TokenGroup = {
            id: generateId(),
            name: name?.trim() || "new-group",
            tokens: [],
            level: g.level + 1,
            parent: parentGroupId,
            children: [],
            expanded: true,
          };
          return {
            ...g,
            children: [...(g.children ?? []), newChild],
            expanded: true,
          };
        }
        if (g.children?.length)
          return { ...g, children: insertChild(g.children) };
        return g;
      });
    setTokenGroups(insertChild(tokenGroups));
    setIsDirty(true);
  };

  // ─── Bulk action handler factory ───────────────────────────────────────────
  const applyBulkMutation = useCallback(
    (mutate: (groups: TokenGroup[]) => TokenGroup[]) => {
      const isThemeMode = !!(themeTokens && onThemeTokensChange);
      const currentGroups = isThemeMode ? themeTokens! : tokenGroups;

      // Push snapshot BEFORE mutation so undo restores pre-mutation state
      const snapshot = currentGroups;
      if (isThemeMode) {
        tokenUndoStackRef.current = [snapshot, ...tokenUndoStackRef.current.slice(0, MAX_BULK_UNDO - 1)];
      } else {
        tokenUndoStackRef.current = [snapshot, ...tokenUndoStackRef.current.slice(0, MAX_BULK_UNDO - 1)];
        onUndoSnapshot?.(snapshot);
      }

      const updated = mutate(currentGroups);
      if (isThemeMode) {
        onThemeTokensChange!(updated);
      } else {
        setTokenGroups(updated);
        setIsDirty(true);
      }
      setSelectedTokenIds(new Set());
      lastSelectedIndexRef.current = -1;
    },
    [themeTokens, onThemeTokensChange, tokenGroups, onUndoSnapshot]
  );

  const handleBulkDelete = useCallback(() => {
    if (!selectedGroupId) return;
    applyBulkMutation(groups => bulkDeleteTokens(groups, selectedGroupId, selectedTokenIds));
  }, [applyBulkMutation, selectedGroupId, selectedTokenIds]);

  const handleBulkMove = useCallback((destGroupId: string) => {
    if (!selectedGroupId) return;
    applyBulkMutation(groups => bulkMoveTokens(groups, selectedGroupId, destGroupId, selectedTokenIds));
  }, [applyBulkMutation, selectedGroupId, selectedTokenIds]);

  const handleBulkChangeType = useCallback((newType: TokenType) => {
    if (!selectedGroupId) return;
    applyBulkMutation(groups => bulkChangeType(groups, selectedGroupId, selectedTokenIds, newType));
  }, [applyBulkMutation, selectedGroupId, selectedTokenIds]);

  // ─── Live prefix edit handlers ───────────────────────────────────────────────
  const handlePrefixFocus = useCallback(() => {
    isPrefixEditingRef.current = true;
    const isThemeMode = !!(themeTokens && onThemeTokensChange);
    const currentGroups = isThemeMode ? themeTokens! : tokenGroups;
    prefixBaseSnapshotRef.current = currentGroups;
    prefixOriginalRef.current = prefixInputValue;
    // Take undo snapshot once at edit start
    tokenUndoStackRef.current = [[...currentGroups], ...tokenUndoStackRef.current.slice(0, MAX_BULK_UNDO - 1)];
    if (!isThemeMode) onUndoSnapshot?.(currentGroups);
  }, [themeTokens, onThemeTokensChange, tokenGroups, prefixInputValue, onUndoSnapshot]);

  const handlePrefixChange = useCallback((newValue: string) => {
    if (!selectedGroupId || !prefixBaseSnapshotRef.current) return;
    setPrefixInputValue(newValue);
    const base = prefixBaseSnapshotRef.current;
    const original = prefixOriginalRef.current;
    // Apply to base: remove original prefix then add new value
    let mutated: TokenGroup[] = original
      ? bulkRemovePrefix(base, selectedGroupId, selectedTokenIds, original)
      : base;
    if (newValue) {
      mutated = bulkAddPrefix(mutated, selectedGroupId, selectedTokenIds, newValue);
    }
    const isThemeMode = !!(themeTokens && onThemeTokensChange);
    if (isThemeMode) {
      onThemeTokensChange!(mutated);
    } else {
      setTokenGroups(mutated);
      setIsDirty(true);
    }
  }, [selectedGroupId, selectedTokenIds, themeTokens, onThemeTokensChange]);

  const handlePrefixBlur = useCallback(() => {
    isPrefixEditingRef.current = false;
    prefixBaseSnapshotRef.current = null;
  }, []);

  // ─── Token range select handler ─────────────────────────────────────────────
  const handleTokenMultiSelect = useCallback(
    (tokenId: string, shiftKey: boolean, tokenIndex: number) => {
      setSelectedTokenIds(prev => {
        const next = new Set(prev);
        if (shiftKey && lastSelectedIndexRef.current >= 0) {
          const isThemeMode = !!(themeTokens && themeTokens.length > 0);
          const activeGroups = isThemeMode ? themeTokens! : tokenGroups;
          const activeGroup = findGroupById(activeGroups, selectedGroupId ?? '');
          if (activeGroup) {
            const start = Math.min(lastSelectedIndexRef.current, tokenIndex);
            const end = Math.max(lastSelectedIndexRef.current, tokenIndex);
            const shouldSelect = !prev.has(tokenId);
            activeGroup.tokens.slice(start, end + 1).forEach(t => {
              if (shouldSelect) next.add(t.id);
              else next.delete(t.id);
            });
          }
        } else {
          if (next.has(tokenId)) next.delete(tokenId);
          else next.add(tokenId);
        }
        lastSelectedIndexRef.current = tokenIndex;
        return next;
      });
    },
    [themeTokens, tokenGroups, selectedGroupId]
  );

  // ─── Ctrl+Z theme-mode bulk undo ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z';
      if (!isUndo) return;
      if (tokenUndoStackRef.current.length === 0) return;
      const isThemeMode = !!(themeTokens && onThemeTokensChange);
      if (!isThemeMode) return; // non-theme undo is handled by page.tsx
      e.preventDefault();
      e.stopPropagation();
      const [prev, ...rest] = tokenUndoStackRef.current;
      tokenUndoStackRef.current = rest;
      onThemeTokensChange!(prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [themeTokens, onThemeTokensChange]);

  // Recursive function to render nested groups
  const renderGroup = (group: TokenGroup) => {
    const hasChildren = group.children && group.children.length > 0;
    const hasTokens = group.tokens.length > 0;
    // Prefer themeTokens when available — keeps render and write source in sync
    const activeSourceGroups = themeTokens && themeTokens.length > 0 ? themeTokens : tokenGroups;
    const activeGroup = findGroupById(activeSourceGroups, group.id) ?? group;
    const activeGroupTokens = activeGroup.tokens;

    return (
      <div key={group.id} className="mb-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Card header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={group.name}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : (e) => updateGroupName(group.id, e.target.value)}
                className="px-2 py-1 text-base font-semibold bg-transparent rounded border-none outline-none focus:bg-gray-50 h-auto flex-1"
                placeholder="Group name"
              />
              {hasChildren && (
                <span className="px-2 py-0.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full">
                  {group.children!.length} sub
                </span>
              )}
              {hasTokens && (
                <span className="px-2 py-0.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full">
                  {group.tokens.length} tokens
                </span>
              )}
              {(!isReadOnly || (onResetGroupToSource && !isGroupSource?.(group.id))) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                    >
                      ···
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {onResetGroupToSource && !isGroupSource?.(group.id) && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onResetGroupToSource(group.id)}
                          className="text-amber-700 focus:text-amber-800"
                        >
                          <RotateCcw size={14} className="mr-2" />
                          Reset to source
                        </DropdownMenuItem>
                        {!isReadOnly && <DropdownMenuSeparator />}
                      </>
                    )}
                    {!isReadOnly && (
                      <>
                        <DropdownMenuItem onClick={() => addSubGroup(group.id)}>
                          + Add Sub-group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-700"
                          onClick={() => deleteTokenGroup(group.id)}
                        >
                          Delete Group
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {hasTokens && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse table-auto">
                <thead className="border-b border-gray-200">
                  <tr>
                    {/* Checkbox column header */}
                    {!isReadOnly ? (
                      <th className="w-10 px-2 py-2 border-r border-gray-100">
                        <input
                          type="checkbox"
                          checked={activeGroupTokens.length > 0 && activeGroupTokens.every(t => selectedTokenIds.has(t.id))}
                          onChange={e => {
                            if (e.target.checked) setSelectedTokenIds(new Set(activeGroupTokens.map(t => t.id)));
                            else setSelectedTokenIds(new Set());
                          }}
                          className="accent-blue-500 w-4 h-4 cursor-pointer"
                          aria-label="Select all tokens"
                        />
                      </th>
                    ) : (
                      <th className="w-10 border-r border-gray-100" />
                    )}
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Value
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Description
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeGroupTokens.map((token, tokenIndex) => (
                    <TokenTableRow
                      key={token.id}
                      token={token}
                      group={group}
                      tokenGroups={tokenGroups}
                      selectedTokenId={selectedTokenId}
                      isExpanded={expandedTokens.has(token.id)}
                      onTokenSelect={onTokenSelect}
                      onUpdateToken={updateToken}
                      onDeleteToken={deleteToken}
                      onToggleExpansion={toggleTokenExpansion}
                      onUpdateAttribute={updateTokenAttribute}
                      onRemoveAttribute={removeTokenAttribute}
                      resolveRef={resolveTokenReference}
                      getFullPath={buildTokenPath}
                      parseValue={parseTokenValue}
                      isReadOnly={isReadOnly}
                      isPathLocked={Boolean(themeTokens)}
                      masterValue={findMasterValue?.(group.id, token.path)}
                      onResetToDefault={onResetToDefault}
                      isMultiSelected={selectedTokenIds.has(token.id)}
                      tokenIndex={tokenIndex}
                      onMultiSelectClick={(shiftKey, idx) => handleTokenMultiSelect(token.id, shiftKey, idx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Token */}
          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addToken(group.id)}
              disabled={isReadOnly}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 h-auto p-0 disabled:opacity-50 disabled:pointer-events-none"
              title={isReadOnly ? "Source group — read only" : undefined}
            >
              + Add Token
            </Button>
          </div>
        </div>
        {hasChildren && group.expanded && (
          <div className="mt-2">
            {group.children!.map((childGroup) => renderGroup(childGroup))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="">
      {/* Fixed floating BulkActionBar — rendered outside the group card, above all other UI */}
      {selectedGroupId && (
        <BulkActionBar
          selectedCount={selectedTokenIds.size}
          groups={tokenGroups}
          sourceGroupId={selectedGroupId}
          isReadOnly={!!isReadOnly}
          prefixValue={prefixInputValue}
          onDelete={handleBulkDelete}
          onMoveToGroup={handleBulkMove}
          onChangeType={handleBulkChangeType}
          onPrefixFocus={handlePrefixFocus}
          onPrefixChange={handlePrefixChange}
          onPrefixBlur={handlePrefixBlur}
          onClearSelection={() => { setSelectedTokenIds(new Set()); lastSelectedIndexRef.current = -1; }}
        />
      )}

        {!hideNamespaceAndActions && (
          <div className="flex items-center space-x-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Export Actions
            </h3>
            {loadedCollection && (
              <p className="text-xs text-emerald-700 font-medium">
                Editing: {loadedCollection.name}
              </p>
            )}

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Global Namespace:
              </label>
              <Input
                type="text"
                value={globalNamespace}
                onChange={(e) => {
                  setGlobalNamespace(e.target.value);
                  onNamespaceChange?.(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Optional namespace (e.g., 'design', 'token')"
                className="text-sm"
              />
            </div>
          </div>
        )}



        {!hideNamespaceAndActions && globalNamespace && (
          <div className="text-sm text-gray-600 mt-4">
            <strong>Preview:</strong> Tokens will be prefixed with "
            {globalNamespace}."
          </div>
        )}
    

      {/* Token Groups */}
      {!selectedGroupId || selectedGroupId === '__all_groups__' ? (
        /* Default view: overview table of all top-level groups */
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">All Groups</h3>
          </div>
          {(() => {
            const overviewGroups =
              themeTokens && themeTokens.length > 0 ? themeTokens : tokenGroups;
            return overviewGroups.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">
                No groups yet. Add a group below.
              </p>
            ) : (
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Group
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Tokens
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-left text-gray-400 uppercase tracking-wide">
                      Sub-groups
                    </th>
                    <th className="px-4 py-2 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overviewGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onGroupSelect?.(group.id)}
                    >
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-gray-800">
                          {group.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {group.tokens.length}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {group.children?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-gray-300 text-sm">→</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Token name mismatch warning when theme graph differs from default */}
          {tokenNameMismatch &&
            (tokenNameMismatch.inThemeNotDefault.length > 0 ||
              tokenNameMismatch.inDefaultNotTheme.length > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="font-medium">
                  Token names differ from default.
                </span>
                <span className="ml-1">
                  Theme graph produces different token paths than the default
                  collection.
                </span>
                {tokenNameMismatch.inThemeNotDefault.length > 0 && (
                  <p className="mt-1 text-xs">
                    In theme only:{" "}
                    {tokenNameMismatch.inThemeNotDefault.slice(0, 5).join(", ")}
                    {tokenNameMismatch.inThemeNotDefault.length > 5 &&
                      ` +${tokenNameMismatch.inThemeNotDefault.length - 5} more`}
                  </p>
                )}
                {tokenNameMismatch.inDefaultNotTheme.length > 0 && (
                  <p className="mt-1 text-xs">
                    In default only:{" "}
                    {tokenNameMismatch.inDefaultNotTheme.slice(0, 5).join(", ")}
                    {tokenNameMismatch.inDefaultNotTheme.length > 5 &&
                      ` +${tokenNameMismatch.inDefaultNotTheme.length - 5} more`}
                  </p>
                )}
              </div>
            )}
          {/* Render selected group — prefer themeTokens when group exists (keeps render+write in sync); fall back to tokenGroups */}
          {(() => {
            const sourceGroups =
              themeTokens && themeTokens.length > 0 ? themeTokens : tokenGroups;
            const topLevel =
              sourceGroups.find((g) => g.id === selectedGroupId) ??
              tokenGroups.find((g) => g.id === selectedGroupId);
            if (topLevel) return renderGroup(topLevel);
            const found =
              findGroupById(sourceGroups, selectedGroupId) ??
              findGroupById(tokenGroups, selectedGroupId);
            return found ? renderGroup(found) : null;
          })()}
          {/* No tokens empty state */}
          {(() => {
            const sourceGroups =
              themeTokens && themeTokens.length > 0 ? themeTokens : tokenGroups;
            const found =
              findGroupById(sourceGroups, selectedGroupId) ??
              sourceGroups.find((g) => g.id === selectedGroupId) ??
              findGroupById(tokenGroups, selectedGroupId) ??
              tokenGroups.find((g) => g.id === selectedGroupId);
            if (found && found.tokens.length === 0) {
              return (
                <p className="p-6 text-sm text-gray-400 text-center">
                  No tokens in this group
                </p>
              );
            }
            return null;
          })()}
        </>
      )}
      {/* Add Group */}
      {!hideAddGroupButton && !isReadOnly && (
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
                  if (e.key === "Enter") addTokenGroup();
                  if (e.key === "Escape") {
                    setIsAddingGroup(false);
                    setNewGroupName("");
                  }
                }}
                placeholder="Group name (optional)..."
                autoFocus
              />
              <Button
                onClick={() => addTokenGroup()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ✓
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingGroup(false);
                  setNewGroupName("");
                }}
              >
                ✕
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Directory Picker */}

      {/* JSON Preview Dialog */}
      <JsonPreviewDialog
        isOpen={showJsonDialog}
        onClose={() => setShowJsonDialog(false)}
        jsonData={generateTokenSet()}
      />


      {/* Load Collection Dialog */}
      <LoadCollectionDialog
        isOpen={showLoadDialog}
        onLoad={handleLoadRequest}
        onCancel={() => setShowLoadDialog(false)}
      />


      {/* Loading Indicator */}
      <LoadingIndicator loadingState={loadingState} />

    </div>
  );
}

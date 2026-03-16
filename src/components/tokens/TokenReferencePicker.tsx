'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { TokenGroup, GeneratedToken } from '@/types';

interface FlatToken {
  token: GeneratedToken;
  groupPath: string;
  aliasPath: string;
}

function flattenAllTokens(groups: TokenGroup[], prefix = ''): FlatToken[] {
  const results: FlatToken[] = [];
  for (const group of groups) {
    const groupPath = prefix ? `${prefix}.${group.name}` : group.name;
    for (const token of group.tokens) {
      results.push({
        token,
        groupPath,
        aliasPath: `${groupPath}.${token.path}`,
      });
    }
    if (group.children?.length) {
      results.push(...flattenAllTokens(group.children, groupPath));
    }
  }
  return results;
}

function matchesQuery(flat: FlatToken, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return flat.aliasPath.toLowerCase().includes(lower) ||
    flat.token.path.toLowerCase().includes(lower);
}

interface TokenReferencePickerProps {
  allGroups: TokenGroup[];
  onSelect: (aliasValue: string) => void;
}

export function TokenReferencePicker({ allGroups, onSelect }: TokenReferencePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const allTokens = useMemo(() => flattenAllTokens(allGroups), [allGroups]);
  const filtered = useMemo(
    () => allTokens.filter(f => matchesQuery(f, query)),
    [allTokens, query]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (flat: FlatToken) => {
    onSelect(`{${flat.aliasPath}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-indigo-600 flex-shrink-0"
          title="Select source token"
          type="button"
        >
          <Link2 size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 p-0"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="border-b border-gray-100 px-3 py-2">
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tokens…"
            className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-center text-gray-400">
              {query ? 'No matching tokens' : 'No tokens available'}
            </p>
          )}
          {filtered.map(flat => (
            <button
              key={flat.token.id}
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex flex-col gap-0.5"
              onClick={() => handleSelect(flat)}
            >
              <span className="text-xs font-mono text-gray-800">{flat.token.path}</span>
              <span className="text-[10px] text-gray-400 truncate">{flat.aliasPath}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

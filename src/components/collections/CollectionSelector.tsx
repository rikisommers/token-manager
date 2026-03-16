'use client';

import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';

interface CollectionOption {
  _id: string;
  name: string;
}

interface CollectionSelectorProps {
  collections: CollectionOption[];
  selectedId: string;
  loading: boolean;
  onChange: (id: string) => void;
}

export function CollectionSelector({
  collections,
  selectedId,
  onChange,
}: CollectionSelectorProps) {
  return (
    <div className="flex items-center">
      <label className="text-sm font-medium text-gray-700 mr-3">Collection:</label>
      <Select value={selectedId} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="w-auto min-w-[160px] text-sm">
          <SelectValue placeholder="Select collection" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Local</SelectLabel>
            <SelectItem value="local">Local Files</SelectItem>
          </SelectGroup>
          {collections.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Database</SelectLabel>
                {collections.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

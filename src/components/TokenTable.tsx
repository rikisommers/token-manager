'use client';

import { useState, useCallback } from 'react';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, any>;
  resolvedValue?: string;
}

interface TokenGroup {
  path: string;
  token: Token;
  filePath: string;
  section: string;
}

interface TokenTableProps {
  section: string;
  tokens: TokenGroup[];
  onSave: (filePath: string, tokenData: any) => Promise<boolean>;
}

interface ColorSwatchProps {
  value: string;
  resolvedValue?: string;
  onColorChange: (newColor: string) => void;
}

function ColorSwatch({ value, resolvedValue, onColorChange }: ColorSwatchProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Use resolved value for display if available, otherwise use original value
  const displayValue = resolvedValue || value;
  // Show a placeholder if the value is still an unresolved reference; otherwise pass
  // the value directly as a CSS color (supports #hex, rgb(), rgba(), hsl(), named colors, etc.)
  const actualColor = displayValue.startsWith('{') ? '#cccccc' : displayValue;

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-10 h-10 border border-gray-300 rounded cursor-pointer shadow-sm"
        style={{ backgroundColor: actualColor }}
        onClick={() => setIsEditing(!isEditing)}
      />
      {isEditing && (
        <input
          type="color"
          value={actualColor}
          onChange={(e) => onColorChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-8 h-8 border-none rounded cursor-pointer"
          autoFocus
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm text-gray-600 font-mono">{value}</span>
        {resolvedValue && resolvedValue !== value && (
          <span className="text-xs text-blue-600 font-mono">→ {resolvedValue}</span>
        )}
      </div>
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (newValue: string) => void;
  type?: string;
}

function TextInput({ value, onChange, type }: TextInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = useCallback(() => {
    onChange(localValue);
    setIsEditing(false);
  }, [localValue, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        autoFocus
      />
    );
  }

  return (
    <div
      className="px-3 py-2 bg-gray-50 border border-transparent rounded-md hover:bg-gray-100 cursor-pointer font-mono text-sm"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 ml-2">({type})</span>
    </div>
  );
}

export function TokenTable({ section, tokens, onSave }: TokenTableProps) {
  const [editedTokens, setEditedTokens] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const updateToken = useCallback(async (tokenGroup: TokenGroup, newValue: string) => {
    const tokenKey = `${tokenGroup.filePath}:${tokenGroup.path}`;

    setEditedTokens(prev => ({
      ...prev,
      [tokenKey]: newValue
    }));

    setSaving(prev => ({ ...prev, [tokenKey]: true }));

    try {
      const response = await fetch(`/api/tokens/${tokenGroup.filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenPath: tokenGroup.path,
          newValue
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save token');
      }

      const result = await response.json();
      console.log('Token updated successfully:', result);

    } catch (error) {
      console.error('Failed to save token:', error);
      // Revert the change on error
      setEditedTokens(prev => {
        const updated = { ...prev };
        delete updated[tokenKey];
        return updated;
      });
    } finally {
      setSaving(prev => ({ ...prev, [tokenKey]: false }));
    }
  }, []);

  const groupedTokens = tokens.reduce((acc, tokenGroup) => {
    const file = tokenGroup.filePath;
    if (!acc[file]) {
      acc[file] = [];
    }
    acc[file].push(tokenGroup);
    return acc;
  }, {} as Record<string, TokenGroup[]>);

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 capitalize">
          {section.replace(/-/g, ' ')} Tokens
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {tokens.length} token{tokens.length !== 1 ? 's' : ''} across {Object.keys(groupedTokens).length} file{Object.keys(groupedTokens).length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        {Object.entries(groupedTokens).map(([filePath, fileTokens]) => (
          <div key={filePath} className="border-b border-gray-100 last:border-b-0">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">{filePath}</h3>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fileTokens.map((tokenGroup) => {
                  const tokenKey = `${tokenGroup.filePath}:${tokenGroup.path}`;
                  const currentValue = editedTokens[tokenKey] || tokenGroup.token.value;
                  const isColor = tokenGroup.token.type === 'color';

                  return (
                    <tr key={tokenGroup.path} className={`hover:bg-gray-50 ${saving[tokenKey] ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {tokenGroup.path}
                          </div>
                          {saving[tokenKey] && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isColor ? (
                          <ColorSwatch
                            value={currentValue}
                            resolvedValue={tokenGroup.token.resolvedValue}
                            onColorChange={(newColor) => updateToken(tokenGroup, newColor)}
                          />
                        ) : (
                          <TextInput
                            value={currentValue}
                            onChange={(newValue) => updateToken(tokenGroup, newValue)}
                            type={tokenGroup.token.type}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tokenGroup.token.type}
                        </span>
                        {tokenGroup.token.attributes && (
                          <div className="mt-1">
                            {Object.entries(tokenGroup.token.attributes).map(([key, value]) => (
                              <span key={key} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
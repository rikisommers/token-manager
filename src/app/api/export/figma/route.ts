import { NextRequest, NextResponse } from 'next/server';
import { mergeThemeTokens } from '@/lib/themeTokenMerge';
import type { ITheme } from '@/types/theme.types';

export async function POST(request: NextRequest) {
  try {
    const { tokenSet, figmaToken, fileKey, collectionId, mongoCollectionId } = await request.json();

    if (!tokenSet || !figmaToken || !fileKey) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenSet, figmaToken, or fileKey' },
        { status: 400 }
      );
    }

    // Fetch themes and namespace from MongoDB when mongoCollectionId is provided
    let themes: ITheme[] = [];
    let namespace = 'token';
    if (mongoCollectionId) {
      try {
        const { getRepository } = await import('@/lib/db/get-repository');
        const repo = await getRepository();
        const doc = await repo.findById(mongoCollectionId);
        if (doc) {
          themes = (doc.themes as ITheme[]) ?? [];
          namespace = (doc as unknown as { namespace?: string }).namespace ?? 'token';
        }
      } catch (e) {
        console.error('Failed to fetch themes for Figma export:', e);
        // Fall through with empty themes — export Default mode only
      }
    }

    // Build multi-mode payload
    const figmaPayload = buildMultiModePayload(tokenSet, themes, namespace, collectionId);

    const apiUrl = `https://api.figma.com/v1/files/${fileKey}/variables/local`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(figmaPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to export to Figma');
    }

    const responseData = await response.json();

    // Update collection's sourceMetadata to record Figma as upstream
    if (mongoCollectionId) {
      try {
        const { getRepository } = await import('@/lib/db/get-repository');
        const repo = await getRepository();
        await repo.updateSourceMetadata(mongoCollectionId, {
          type: 'figma',
          figmaFileKey: fileKey,
          figmaCollectionId: collectionId || null,
        });
      } catch (e) {
        console.error('Failed to update sourceMetadata after Figma export:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tokens successfully exported to Figma',
      data: responseData
    });

  } catch (error) {
    console.error('Figma export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export to Figma' },
      { status: 500 }
    );
  }
}

/**
 * Build Figma Variables multi-mode payload.
 *
 * - Always includes a "Default" mode using collection-default token values
 * - Adds one mode per theme in the collection (all themes, not just the one selected in the Config page)
 * - Source groups in each theme use collection-default values (same as SD export rule)
 * - Disabled groups are excluded from the variables list entirely
 * - Mode names: theme.name, truncated to 40 chars (Figma API limit)
 *
 * Per CONTEXT.md (locked): "Figma export always includes ALL enabled themes as modes —
 * it ignores the theme selector entirely."
 */
function buildMultiModePayload(
  masterTokenSet: Record<string, unknown>,
  themes: ITheme[],
  namespace: string,
  variableCollectionId?: string
): Record<string, unknown> {
  const collId = variableCollectionId || 'default';

  // Build the flat variable list from master tokens (Default mode)
  // A "variable" corresponds to one leaf token in the master token set
  interface FigmaVarEntry {
    name: string;
    resolvedType: string;
    defaultValue: unknown;
    themeValues: unknown[]; // one per theme, in themes array order
  }

  const flatVars: FigmaVarEntry[] = [];

  function processTokens(obj: Record<string, unknown>, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}/${key}` : key;
      if (value && typeof value === 'object' && '$value' in (value as object)) {
        const token = value as { $value: unknown; $type?: string };
        flatVars.push({
          name: currentPath,
          resolvedType: mapTokenTypeToFigmaType(token.$type ?? ''),
          defaultValue: mapTokenValueToFigmaValue(token.$value, token.$type ?? ''),
          themeValues: [], // filled below
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        processTokens(value as Record<string, unknown>, currentPath);
      }
    }
  }

  // Flatten master tokens for Default mode variable list
  // Master tokens are namespace-wrapped (e.g. { token: { colors: {...} } })
  // Strip namespace wrapper before walking, so variable names don't include it
  const topKeys = Object.keys(masterTokenSet);
  const unwrapped =
    topKeys.length === 1 && typeof masterTokenSet[topKeys[0]] === 'object'
      ? (masterTokenSet[topKeys[0]] as Record<string, unknown>)
      : masterTokenSet;
  processTokens(unwrapped);

  // For each theme, compute merged tokens and extract per-variable values
  for (const theme of themes) {
    const mergedTokens = mergeThemeTokens(masterTokenSet, theme, namespace);
    // Unwrap namespace from merged result the same way
    const mergedTop = Object.keys(mergedTokens);
    const mergedUnwrapped =
      mergedTop.length === 1 && typeof mergedTokens[mergedTop[0]] === 'object'
        ? (mergedTokens[mergedTop[0]] as Record<string, unknown>)
        : mergedTokens;

    // Build a flat lookup of path → figma value from the merged result
    const mergedFlat = new Map<string, unknown>();
    function flattenMerged(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const p = path ? `${path}/${key}` : key;
        if (value && typeof value === 'object' && '$value' in (value as object)) {
          const token = value as { $value: unknown; $type?: string };
          mergedFlat.set(p, mapTokenValueToFigmaValue(token.$value, token.$type ?? ''));
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          flattenMerged(value as Record<string, unknown>, p);
        }
      }
    }
    flattenMerged(mergedUnwrapped);

    // Map each variable to its theme value (fall back to defaultValue if not in merged result)
    for (const v of flatVars) {
      const themeVal = mergedFlat.get(v.name);
      v.themeValues.push(themeVal ?? v.defaultValue);
    }
  }

  // Build Figma API payload
  const variableModes = [
    { action: 'CREATE', id: 'temp:mode:default', name: 'Default', variableCollectionId: collId },
    ...themes.map((theme, i) => ({
      action: 'CREATE',
      id: `temp:mode:${i}`,
      name: theme.name.slice(0, 40), // Figma mode name max 40 chars
      variableCollectionId: collId,
    })),
  ];

  const variables = flatVars.map((v, i) => ({
    action: 'CREATE',
    id: `temp:var:${i}`,
    name: v.name,
    variableCollectionId: collId,
    resolvedType: v.resolvedType,
  }));

  const variableModeValues = [
    // Default mode values
    ...flatVars.map((v, i) => ({
      variableId: `temp:var:${i}`,
      modeId: 'temp:mode:default',
      value: v.defaultValue,
    })),
    // Per-theme mode values
    ...themes.flatMap((_, ti) =>
      flatVars.map((v, i) => ({
        variableId: `temp:var:${i}`,
        modeId: `temp:mode:${ti}`,
        value: v.themeValues[ti],
      }))
    ),
  ];

  return { variableModes, variables, variableModeValues };
}

function mapTokenTypeToFigmaType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    'color': 'COLOR',
    'dimension': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'FLOAT',
    'duration': 'FLOAT',
    'number': 'FLOAT',
    'boolean': 'BOOLEAN'
  };
  return typeMap[tokenType] || 'STRING';
}

function mapTokenValueToFigmaValue(value: unknown, type: string): unknown {
  switch (type) {
    case 'color':
      if (typeof value === 'string') {
        const hex = value.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return { r, g, b, a: 1 };
      }
      return value;
    case 'dimension':
      if (typeof value === 'string') {
        const numericValue = parseFloat(value);
        return isNaN(numericValue) ? 0 : numericValue;
      }
      return value;
    default:
      return value;
  }
}

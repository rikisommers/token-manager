import { NextRequest, NextResponse } from 'next/server';
import { mergeThemeTokens } from '@/lib/themeTokenMerge';
import type { ITheme } from '@/types/theme.types';
import type { ColorMode } from '@/types/theme.types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushFigma);
  if (authResult instanceof NextResponse) return authResult;
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
 * Compute a deterministic fingerprint for a theme's active group structure.
 * Two themes with the same set of enabled+source group IDs (sorted) are "same structure"
 * and will be paired as Light/Dark modes in one Figma variable collection.
 */
function computeGroupKey(theme: ITheme): string {
  const activeGroups = Object.entries(theme.groups)
    .filter(([, state]) => state === 'enabled' || state === 'source')
    .map(([id]) => id)
    .sort();
  return activeGroups.join('|');
}

interface ThemePair {
  groupKey: string;
  lightTheme: ITheme | null;
  darkTheme: ITheme | null;
}

/**
 * Group themes by group structure, pairing light and dark themes.
 * Last-one-wins when two themes share structure + colorMode (with console.warn).
 */
function pairThemesByColorMode(themes: ITheme[]): ThemePair[] {
  const pairMap = new Map<string, ThemePair>();
  for (const theme of themes) {
    const key = computeGroupKey(theme);
    const existing = pairMap.get(key) ?? { groupKey: key, lightTheme: null, darkTheme: null };
    const colorMode = (theme.colorMode ?? 'light') as ColorMode;
    if (colorMode === 'dark') {
      if (existing.darkTheme) {
        console.warn(`[Figma export] Two dark themes with same group structure — using last one. key="${key}"`);
      }
      existing.darkTheme = theme;
    } else {
      if (existing.lightTheme) {
        console.warn(`[Figma export] Two light themes with same group structure — using last one. key="${key}"`);
      }
      existing.lightTheme = theme;
    }
    pairMap.set(key, existing);
  }
  return Array.from(pairMap.values());
}

/**
 * Original single-Default-mode payload (preserves Phase 12 behavior for collections without
 * paired light/dark themes — or as a fallback).
 */
function buildSingleModePayload(
  masterTokenSet: Record<string, unknown>,
  namespace: string,
  variableCollectionId?: string
): Record<string, unknown> {
  const collId = variableCollectionId || 'default';
  const flatVars: Array<{ name: string; resolvedType: string; defaultValue: unknown }> = [];

  function processTokens(obj: Record<string, unknown>, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const p = path ? `${path}/${key}` : key;
      if (value && typeof value === 'object' && '$value' in (value as object)) {
        const token = value as { $value: unknown; $type?: string };
        flatVars.push({
          name: p,
          resolvedType: mapTokenTypeToFigmaType(token.$type ?? ''),
          defaultValue: mapTokenValueToFigmaValue(token.$value, token.$type ?? ''),
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        processTokens(value as Record<string, unknown>, p);
      }
    }
  }

  const topKeys = Object.keys(masterTokenSet);
  const unwrapped =
    topKeys.length === 1 && typeof masterTokenSet[topKeys[0]] === 'object'
      ? (masterTokenSet[topKeys[0]] as Record<string, unknown>)
      : masterTokenSet;
  processTokens(unwrapped);

  const variableModes = [
    { action: 'CREATE', id: 'temp:mode:default', name: 'Default', variableCollectionId: collId },
  ];
  const variables = flatVars.map((v, i) => ({
    action: 'CREATE', id: `temp:var:${i}`, name: v.name, variableCollectionId: collId, resolvedType: v.resolvedType,
  }));
  const variableModeValues = flatVars.map((v, i) => ({
    variableId: `temp:var:${i}`, modeId: 'temp:mode:default', value: v.defaultValue,
  }));
  return { variableModes, variables, variableModeValues };
}

/**
 * Build Figma Variables multi-mode payload with colorMode-aware theme pairing.
 *
 * Phase 14 change: instead of one mode per theme (Phase 12 behavior), themes are grouped
 * by group structure fingerprint and paired into Light/Dark mode collections.
 *
 * - Themes with the same active group IDs (sorted) share a Figma variable collection
 * - A light+dark pair produces modes named "Light" and "Dark"
 * - An unpaired theme (only light or only dark for a group key) falls back to single-Default-mode
 * - Collections with no themes fall back to single-Default-mode
 * - Duplicate same-colorMode themes for the same group key: last-one-wins with console.warn
 */
function buildMultiModePayload(
  masterTokenSet: Record<string, unknown>,
  themes: ITheme[],
  namespace: string,
  variableCollectionId?: string
): Record<string, unknown> {
  // If no themes, fall back to a single Default collection (original behavior)
  if (themes.length === 0) {
    return buildSingleModePayload(masterTokenSet, namespace, variableCollectionId);
  }

  const pairs = pairThemesByColorMode(themes);

  // If only one pair with one mode (no light+dark pairing), use original behavior
  if (pairs.length === 1 && (!pairs[0].lightTheme || !pairs[0].darkTheme)) {
    return buildSingleModePayload(masterTokenSet, namespace, variableCollectionId);
  }

  // Multi-pair: one Figma collection per pair, or use single collection for one pair
  // For now: produce a single-collection payload using the first pair's light/dark structure
  // (The Figma API accepts one variableCollections create per call in most implementations)
  // Use the first pair that has BOTH light and dark, falling back to the first pair
  const primaryPair = pairs.find(p => p.lightTheme && p.darkTheme) ?? pairs[0];
  const lightTheme = primaryPair.lightTheme;
  const darkTheme = primaryPair.darkTheme;

  const collId = variableCollectionId || 'default';

  // Build flat variable list from master tokens
  const flatVars: Array<{ name: string; resolvedType: string; defaultValue: unknown; lightValue: unknown; darkValue: unknown }> = [];

  function processTokens(obj: Record<string, unknown>, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}/${key}` : key;
      if (value && typeof value === 'object' && '$value' in (value as object)) {
        const token = value as { $value: unknown; $type?: string };
        flatVars.push({
          name: currentPath,
          resolvedType: mapTokenTypeToFigmaType(token.$type ?? ''),
          defaultValue: mapTokenValueToFigmaValue(token.$value, token.$type ?? ''),
          lightValue: mapTokenValueToFigmaValue(token.$value, token.$type ?? ''), // default = master = light
          darkValue: mapTokenValueToFigmaValue(token.$value, token.$type ?? ''),  // filled below
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        processTokens(value as Record<string, unknown>, currentPath);
      }
    }
  }

  const topKeys = Object.keys(masterTokenSet);
  const unwrapped =
    topKeys.length === 1 && typeof masterTokenSet[topKeys[0]] === 'object'
      ? (masterTokenSet[topKeys[0]] as Record<string, unknown>)
      : masterTokenSet;
  processTokens(unwrapped);

  // Helper: flatten a merged token set into a path→figmaValue map
  function buildMergedFlat(mergedTokens: Record<string, unknown>): Map<string, unknown> {
    const flat = new Map<string, unknown>();
    function walk(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const p = path ? `${path}/${key}` : key;
        if (value && typeof value === 'object' && '$value' in (value as object)) {
          const token = value as { $value: unknown; $type?: string };
          flat.set(p, mapTokenValueToFigmaValue(token.$value, token.$type ?? ''));
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          walk(value as Record<string, unknown>, p);
        }
      }
    }
    const mergedTop = Object.keys(mergedTokens);
    const mergedUnwrapped =
      mergedTop.length === 1 && typeof mergedTokens[mergedTop[0]] === 'object'
        ? (mergedTokens[mergedTop[0]] as Record<string, unknown>)
        : mergedTokens;
    walk(mergedUnwrapped);
    return flat;
  }

  // Compute light values (use light theme if present, else master)
  if (lightTheme) {
    const lightMerged = mergeThemeTokens(masterTokenSet, lightTheme, namespace);
    const lightFlat = buildMergedFlat(lightMerged);
    for (const v of flatVars) {
      v.lightValue = lightFlat.get(v.name) ?? v.defaultValue;
    }
  }

  // Compute dark values (use dark theme if present, else same as light = no dark modes shown)
  if (darkTheme) {
    const darkMerged = mergeThemeTokens(masterTokenSet, darkTheme, namespace);
    const darkFlat = buildMergedFlat(darkMerged);
    for (const v of flatVars) {
      v.darkValue = darkFlat.get(v.name) ?? v.defaultValue;
    }
  }

  // Determine modes to include
  const modes: Array<{ id: string; name: string }> = [];
  if (lightTheme && darkTheme) {
    modes.push({ id: 'temp:mode:light', name: 'Light' });
    modes.push({ id: 'temp:mode:dark', name: 'Dark' });
  } else if (lightTheme) {
    modes.push({ id: 'temp:mode:light', name: 'Light' });
  } else if (darkTheme) {
    modes.push({ id: 'temp:mode:dark', name: 'Dark' });
  } else {
    // Fallback: default mode from master
    modes.push({ id: 'temp:mode:default', name: 'Default' });
  }

  const variableModes = modes.map(m => ({
    action: 'CREATE',
    id: m.id,
    name: m.name,
    variableCollectionId: collId,
  }));

  const variables = flatVars.map((v, i) => ({
    action: 'CREATE',
    id: `temp:var:${i}`,
    name: v.name,
    variableCollectionId: collId,
    resolvedType: v.resolvedType,
  }));

  const variableModeValues: Array<Record<string, unknown>> = [];
  for (const m of modes) {
    for (const [i, v] of flatVars.entries()) {
      const value =
        m.id === 'temp:mode:light' ? v.lightValue :
        m.id === 'temp:mode:dark'  ? v.darkValue :
        v.defaultValue;
      variableModeValues.push({
        variableId: `temp:var:${i}`,
        modeId: m.id,
        value,
      });
    }
  }

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

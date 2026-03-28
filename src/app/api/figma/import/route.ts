import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

// -------------------------------------------------------------------
// Figma type helpers
// -------------------------------------------------------------------

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

type FigmaValue = FigmaColor | number | string | boolean;

function convertFigmaValue(value: FigmaValue, resolvedType: string): unknown {
  if (resolvedType === 'COLOR') {
    const color = value as FigmaColor;
    if (
      color !== null &&
      typeof color === 'object' &&
      color.r !== undefined &&
      color.g !== undefined &&
      color.b !== undefined
    ) {
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = color.a !== undefined ? color.a : 1;
      if (a < 1) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  return value;
}

function mapFigmaType(resolvedType: string): string {
  switch (resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'number';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'string';
    default:
      return 'string';
  }
}

// -------------------------------------------------------------------
// POST /api/figma/import
// -------------------------------------------------------------------

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: string;
  variableCollectionId: string;
  valuesByMode: Record<string, FigmaValue>;
}

interface FigmaMode {
  modeId: string;
  name: string;
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: FigmaMode[];
}

interface FigmaMetaData {
  variableCollections: Record<string, FigmaVariableCollection>;
  variables: Record<string, FigmaVariable>;
}

interface FigmaApiResponse {
  meta?: FigmaMetaData;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushFigma);
  if (authResult instanceof NextResponse) return authResult;
  let body: {
    token?: string;
    fileKey?: string;
    collectionId?: string;
    collectionName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, fileKey, collectionId, collectionName } = body;

  if (!token || !fileKey || !collectionId || !collectionName) {
    return NextResponse.json(
      { error: 'token, fileKey, collectionId, and collectionName are required' },
      { status: 400 }
    );
  }

  // 1. Fetch variables from Figma
  const figmaRes = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/variables/local`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!figmaRes.ok) {
    return NextResponse.json({ error: 'Figma API error' }, { status: 502 });
  }

  const figmaData: FigmaApiResponse = await figmaRes.json();

  // 2. Extract target collection and its variables
  const variableCollections = figmaData.meta?.variableCollections || {};
  const collection = variableCollections[collectionId];

  if (!collection) {
    return NextResponse.json(
      { error: `Collection ${collectionId} not found in Figma file` },
      { status: 404 }
    );
  }

  const allVariables = Object.values(figmaData.meta?.variables || {}) as FigmaVariable[];
  const variables = allVariables.filter(
    (v) => v.variableCollectionId === collectionId
  );

  // 3. Convert to multi-brand token structure (each mode → brand key)
  const tokensByMode: Record<string, Record<string, unknown>> = {};

  for (const mode of collection.modes) {
    const modeTokens: Record<string, unknown> = {};

    for (const variable of variables) {
      const modeValue = variable.valuesByMode[mode.modeId];
      if (modeValue === undefined) continue;

      // Build nested path from variable.name (slash-separated)
      const parts = variable.name.split('/');
      let current: Record<string, unknown> = modeTokens;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]] as Record<string, unknown>;
      }

      const leafName = parts[parts.length - 1];
      current[leafName] = {
        $value: convertFigmaValue(modeValue, variable.resolvedType),
        $type: mapFigmaType(variable.resolvedType),
      };
    }

    tokensByMode[mode.name] = modeTokens;
  }

  // 4. Save to database
  try {
    const repo = await getRepository();
    const saved = await repo.create({
      name: collectionName,
      tokens: tokensByMode,
      sourceMetadata: {
        repo: null,
        branch: null,
        path: null,
        type: 'figma',
        figmaFileKey: fileKey,
        figmaCollectionId: collectionId,
      },
      userId: null,
    });

    return NextResponse.json(
      { collection: { _id: saved._id, name: saved.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/figma/import] Database error:', error);
    return NextResponse.json({ error: 'Failed to save collection' }, { status: 500 });
  }
}

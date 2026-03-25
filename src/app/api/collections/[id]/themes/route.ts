import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { tokenService } from '@/services/token.service';
import type { TokenGroup } from '@/types';
import type { ITheme, ColorMode } from '@/types/theme.types';
import type { CollectionGraphState } from '@/types/graph-state.types';
import { remapGraphStateForTheme } from '@/lib/graphStateRemap';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repo = await getRepository();
    const doc = await repo.findById(params.id);

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ themes: doc.themes ?? [] });
  } catch (error) {
    console.error('[GET /api/collections/[id]/themes]', error);
    return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as { name?: string; colorMode?: string };

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Derive all group IDs using the same service as the Tokens page — strips namespace
    // wrapper and returns path-based IDs (e.g. "colors", "colors/brand") that match
    // the group IDs the token tree uses when filtering.
    const rawTokens = (collection.tokens as Record<string, unknown>) ?? {};
    const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, '');
    function flattenAllGroups(gs: TokenGroup[]): TokenGroup[] {
      const result: TokenGroup[] = [];
      for (const g of gs) {
        result.push(g);
        if (g.children?.length) result.push(...flattenAllGroups(g.children));
      }
      return result;
    }
    const groupIds = flattenAllGroups(groupTree).map(g => g.id);

    const existingThemes = (collection.themes as ITheme[]) ?? [];

    if (existingThemes.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 themes per collection' },
        { status: 422 }
      );
    }

    const defaultState = 'enabled';

    const validColorModes = ['light', 'dark'] as const;
    const colorMode: ColorMode = (
      body.colorMode && validColorModes.includes(body.colorMode as ColorMode)
        ? body.colorMode as ColorMode
        : 'light'
    );

    // Inherit graph state from collection default (deep clone) and remap node IDs
    // so each theme has unique graph nodes (themes are separate entities; groups linked by source)
    const collectionGraphState = (collection.graphState ?? {}) as CollectionGraphState;
    const themeId = crypto.randomUUID();
    const graphState = remapGraphStateForTheme(
      JSON.parse(JSON.stringify(collectionGraphState)),
      themeId
    );

    const theme: ITheme = {
      id: themeId,
      name: body.name.trim(),
      colorMode,
      groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
      tokens: groupTree,  // full tree snapshot — not the flat list
      graphState,
    };

    const updated = await TokenCollection.findByIdAndUpdate(
      params.id,
      { $push: { themes: theme } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ theme }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/collections/[id]/themes]', error);
    return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
  }
}

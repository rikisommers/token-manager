import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { ITheme, ThemeGroupState, ColorMode } from '@/types/theme.types';
import type { CollectionGraphState } from '@/types/graph-state.types';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  try {
    const body = await request.json() as {
      name?: string;
      groups?: Record<string, ThemeGroupState>;
      graphState?: CollectionGraphState | null;
      colorMode?: ColorMode;
    };

    if (body.name === undefined && body.groups === undefined && body.graphState === undefined && body.colorMode === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await dbConnect();

    // Fetch the full document first — positional $set ('themes.$.field') is unreliable
    // on Schema.Types.Mixed arrays (Mongoose #14595, #12530). Use whole-array $set instead.
    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;

    if (!collection) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
    const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);

    if (themeIndex === -1) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
    }

    const updatedTheme: Record<string, unknown> = {
      ...themes[themeIndex],
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.groups !== undefined ? { groups: body.groups } : {}),
      ...(body.graphState !== undefined ? { graphState: body.graphState } : {}),
      ...(body.colorMode !== undefined ? { colorMode: body.colorMode } : {}),
    };

    const updatedThemes = [
      ...themes.slice(0, themeIndex),
      updatedTheme,
      ...themes.slice(themeIndex + 1),
    ];

    await TokenCollection.findByIdAndUpdate(
      params.id,
      { $set: { themes: updatedThemes } }
    ).lean();

    return NextResponse.json({ theme: updatedTheme as unknown as ITheme });
  } catch (error) {
    console.error('[PUT /api/collections/[id]/themes/[themeId]]', error);
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  try {
    await dbConnect();

    const updated = await TokenCollection.findByIdAndUpdate(
      params.id,
      { $pull: { themes: { id: params.themeId } } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/themes/[themeId]]', error);
    return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 });
  }
}

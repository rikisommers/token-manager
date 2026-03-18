import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { ITheme, ThemeGroupState } from '@/types/theme.types';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  try {
    const body = await request.json() as { name?: string; groups?: Record<string, ThemeGroupState> };

    if (body.name === undefined && body.groups === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await dbConnect();

    // Build the $set update — only include fields present in the body
    const setFields: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
      setFields['themes.$.name'] = body.name.trim();
    }
    if (body.groups !== undefined) {
      setFields['themes.$.groups'] = body.groups;
    }

    const updated = await TokenCollection.findOneAndUpdate(
      { _id: params.id, 'themes.id': params.themeId },
      { $set: setFields },
      { new: true }
    ).lean() as Record<string, unknown> | null;

    if (!updated) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const themes = (updated.themes as ITheme[]) ?? [];
    const theme = themes.find((t) => t.id === params.themeId) ?? null;

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found after update' }, { status: 404 });
    }

    return NextResponse.json({ theme });
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
      { new: true }
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

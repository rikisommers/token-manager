import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { TokenGroup } from '@/types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json() as { tokens?: unknown };

    if (!Array.isArray(body.tokens)) {
      return NextResponse.json({ error: 'tokens must be an array' }, { status: 400 });
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

    const theme = themes[themeIndex];
    const groups = (theme.groups as Record<string, string>) ?? {};

    // Guard: reject writes to source groups (root-level group IDs only)
    const hasSourceWrite = (body.tokens as TokenGroup[]).some(g => groups[g.id] === 'source');
    if (hasSourceWrite) {
      return NextResponse.json({ error: 'Cannot write to source groups' }, { status: 422 });
    }

    const updatedTheme: Record<string, unknown> = {
      ...theme,
      tokens: body.tokens,
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

    return NextResponse.json({ tokens: body.tokens });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/themes/[themeId]/tokens]', error);
    return NextResponse.json({ error: 'Failed to update theme tokens' }, { status: 500 });
  }
}

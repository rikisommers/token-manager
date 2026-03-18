import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { ITheme } from '@/types/theme.types';

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
    const body = await request.json() as { name?: string };

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Extract top-level group keys: keys of tokens that are objects and not $-prefixed
    const rawTokens = (collection.tokens as Record<string, unknown>) ?? {};
    const groupIds = Object.keys(rawTokens).filter(
      (key) => !key.startsWith('$') && typeof rawTokens[key] === 'object' && rawTokens[key] !== null
    );

    // Determine default state: first theme → 'enabled', subsequent themes → 'disabled'
    const existingThemes = (collection.themes as ITheme[]) ?? [];
    const defaultState = existingThemes.length === 0 ? 'enabled' : 'disabled';

    const theme: ITheme = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
    };

    const updated = await TokenCollection.findByIdAndUpdate(
      params.id,
      { $push: { themes: theme } },
      { new: true }
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

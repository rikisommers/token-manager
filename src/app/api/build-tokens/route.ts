import { NextRequest, NextResponse } from 'next/server';
import { buildTokens } from '@/services/style-dictionary.service';
import type { BuildTokensRequest } from '@/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as BuildTokensRequest;

    if (!body.tokens || typeof body.tokens !== 'object') {
      return NextResponse.json({ error: 'tokens is required and must be an object' }, { status: 400 });
    }
    if (!body.collectionName || typeof body.collectionName !== 'string') {
      return NextResponse.json({ error: 'collectionName is required' }, { status: 400 });
    }

    const result = await buildTokens({
      tokens: body.tokens,
      namespace: body.namespace ?? 'token',
      collectionName: body.collectionName,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Build tokens error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build tokens' },
      { status: 500 }
    );
  }
}

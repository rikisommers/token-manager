import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.CreateCollection, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const repo = await getRepository();
    const source = await repo.findById(params.id);

    if (!source) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const baseCopyName = `${source.name} (copy)`;
    const existingCopy = await repo.findByName(baseCopyName);
    const copyName = existingCopy
      ? `${source.name} (copy ${Date.now()})`
      : baseCopyName;

    const newDoc = await repo.create({
      name: copyName,
      tokens: source.tokens,
      sourceMetadata: source.sourceMetadata ?? null,
      description: source.description ?? null,
      tags: source.tags ?? [],
      figmaToken: source.figmaToken ?? null,
      figmaFileId: source.figmaFileId ?? null,
      githubRepo: source.githubRepo ?? null,
      githubBranch: source.githubBranch ?? null,
      userId: source.userId ?? null,
    });

    return NextResponse.json(
      { collection: { _id: newDoc._id, name: newDoc.name } },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/collections/[id]/duplicate]', error);
    return NextResponse.json({ error: 'Failed to duplicate collection' }, { status: 500 });
  }
}

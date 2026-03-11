import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const source = await TokenCollection.findById(params.id).lean();

    if (!source) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Determine a unique name for the copy
    const baseCopyName = `${source.name as string} (copy)`;
    const existingCopy = await TokenCollection.findOne({ name: baseCopyName }).lean();
    const copyName = existingCopy
      ? `${source.name as string} (copy ${Date.now()})`
      : baseCopyName;

    const newDoc = await TokenCollection.create({
      name: copyName,
      tokens: source.tokens,
      sourceMetadata: (source.sourceMetadata as Record<string, unknown> | null | undefined) ?? null,
      description: (source.description as string | null | undefined) ?? null,
      tags: (source.tags as string[] | undefined) ?? [],
      figmaToken: (source.figmaToken as string | null | undefined) ?? null,
      figmaFileId: (source.figmaFileId as string | null | undefined) ?? null,
      githubRepo: (source.githubRepo as string | null | undefined) ?? null,
      githubBranch: (source.githubBranch as string | null | undefined) ?? null,
      userId: (source.userId as string | null | undefined) ?? null,
    });

    return NextResponse.json(
      {
        collection: {
          _id: newDoc._id.toString(),
          name: newDoc.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/collections/[id]/duplicate]', error);
    return NextResponse.json({ error: 'Failed to duplicate collection' }, { status: 500 });
  }
}

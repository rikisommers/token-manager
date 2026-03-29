import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/nextauth.config';
import { bootstrapCollectionGrants } from '@/lib/auth/collection-bootstrap';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import type { CollectionCardData, ISourceMetadata } from '@/types/collection.types';

export async function GET() {
  await bootstrapCollectionGrants();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repo = await getRepository();
    const docs = await repo.list();

    let visibleDocs = docs;

    if (session.user.role !== 'Admin') {
      await dbConnect();
      const grants = await CollectionPermission.find({ userId: session.user.id }, 'collectionId').lean();
      // No grants = org-scoped access (all collections visible)
      if (grants.length > 0) {
        const grantedIds = new Set(grants.map(g => g.collectionId));
        visibleDocs = docs.filter(d => grantedIds.has(d._id.toString()));
      }
    }

    const collections: CollectionCardData[] = visibleDocs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      description: doc.description ?? null,
      tags: doc.tags ?? [],
      tokenCount: Object.keys(doc.tokens ?? {}).length,
      updatedAt: doc.updatedAt,
      figmaConfigured: !!(doc.figmaToken && doc.figmaFileId),
      githubConfigured: !!doc.githubRepo,
    }));

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[GET /api/collections] Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(Action.CreateCollection);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json() as {
      name?: string;
      namespace?: string;
      tokens?: Record<string, unknown>;
      sourceMetadata?: ISourceMetadata | null;
    };

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const repo = await getRepository();

    const existing = await repo.findByName(body.name);
    if (existing) {
      return NextResponse.json(
        {
          error: `A collection named "${body.name}" already exists`,
          existingId: existing._id,
        },
        { status: 409 },
      );
    }

    const doc = await repo.create({
      name: body.name,
      namespace: body.namespace,
      tokens: body.tokens ?? {},
      sourceMetadata: body.sourceMetadata ?? null,
      userId: null,
    });

    return NextResponse.json(
      {
        collection: {
          _id: doc._id,
          name: doc.name,
          tokens: doc.tokens,
          sourceMetadata: doc.sourceMetadata,
          userId: doc.userId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/collections]', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}

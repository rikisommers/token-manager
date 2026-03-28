import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/nextauth.config';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import type { UpdateTokenCollectionInput } from '@/types/collection.types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'Admin') {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId: params.id,
    }).lean();
    if (!grant) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
  }

  try {
    const repo = await getRepository();
    const doc = await repo.findById(params.id);

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({
      collection: {
        _id: doc._id,
        name: doc.name,
        namespace: doc.namespace ?? 'token',
        tokens: doc.tokens,
        sourceMetadata: doc.sourceMetadata ?? null,
        description: doc.description ?? null,
        tags: doc.tags ?? [],
        figmaToken: doc.figmaToken ?? null,
        figmaFileId: doc.figmaFileId ?? null,
        githubRepo: doc.githubRepo ?? null,
        githubBranch: doc.githubBranch ?? null,
        graphState: doc.graphState ?? null,
      },
    });
  } catch (error) {
    console.error('[GET /api/collections/[id]] Failed to fetch collection:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json() as UpdateTokenCollectionInput;

    if (
      body.name === undefined &&
      body.namespace === undefined &&
      body.tokens === undefined &&
      body.sourceMetadata === undefined &&
      body.description === undefined &&
      body.tags === undefined &&
      body.figmaToken === undefined &&
      body.figmaFileId === undefined &&
      body.githubRepo === undefined &&
      body.githubBranch === undefined &&
      body.graphState === undefined
    ) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const repo = await getRepository();
    const doc = await repo.update(params.id, body);

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({
      collection: {
        _id: doc._id,
        name: doc.name,
        tokens: doc.tokens,
        sourceMetadata: doc.sourceMetadata,
        userId: doc.userId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    console.error('[PUT /api/collections/[id]]', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.DeleteCollection, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const repo = await getRepository();
    const deleted = await repo.delete(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}

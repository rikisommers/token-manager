import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { UpdateTokenCollectionInput } from '@/types/collection.types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const doc = await TokenCollection.findById(params.id).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ collection: doc });
  } catch (error) {
    console.error('[GET /api/collections/[id]] Failed to fetch collection:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const body = await request.json() as UpdateTokenCollectionInput;

    // If body is empty (all fields undefined), return 400
    if (
      body.name === undefined &&
      body.tokens === undefined &&
      body.sourceMetadata === undefined
    ) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const doc = await TokenCollection.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({
      collection: {
        _id: doc._id.toString(),
        name: doc.name as string,
        tokens: doc.tokens,
        sourceMetadata: doc.sourceMetadata,
        userId: doc.userId,
        createdAt: (doc.createdAt as Date).toISOString(),
        updatedAt: (doc.updatedAt as Date).toISOString(),
      },
    });
  } catch (error) {
    console.error('[PUT /api/collections/[id]]', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

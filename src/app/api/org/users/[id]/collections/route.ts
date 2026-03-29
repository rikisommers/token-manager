import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

/**
 * PUT /api/org/users/[id]/collections
 * Body: { collectionIds: string[] }
 *
 * Replaces the user's collection grants.
 * Empty array = org-scoped access (no CollectionPermission rows = sees all collections).
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  const { collectionIds } = await request.json() as { collectionIds: string[] };

  if (!Array.isArray(collectionIds)) {
    return NextResponse.json({ error: 'collectionIds must be an array' }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(params.id).lean() as { _id: { toString(): string }; role: string } | null;
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Replace all grants: delete existing, insert new ones
  await CollectionPermission.deleteMany({ userId: params.id });

  if (collectionIds.length > 0) {
    await CollectionPermission.insertMany(
      collectionIds.map((collectionId) => ({
        userId: params.id,
        collectionId,
        role: user.role,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

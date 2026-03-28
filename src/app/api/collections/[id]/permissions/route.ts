import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import dbConnect from '@/lib/mongodb';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  const { userId, role } = await request.json() as { userId: string; role: 'Editor' | 'Viewer' };

  if (!userId || !role || !['Editor', 'Viewer'].includes(role)) {
    return NextResponse.json({ error: 'userId and role (Editor|Viewer) required' }, { status: 400 });
  }

  await dbConnect();
  await CollectionPermission.findOneAndUpdate(
    { userId, collectionId: params.id },
    { userId, collectionId: params.id, role },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = await request.json() as { userId: string };
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  await dbConnect();
  await CollectionPermission.deleteOne({ userId, collectionId: params.id });

  return NextResponse.json({ success: true });
}

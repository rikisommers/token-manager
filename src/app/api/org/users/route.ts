import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function GET() {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();

  const users = await User.find({ status: { $ne: 'disabled' } })
    .select('displayName email role status createdAt')
    .sort({ createdAt: 1 })
    .lean() as Array<{
      _id: { toString(): string };
      displayName: string;
      email: string;
      role: string;
      status: string;
      createdAt: Date;
    }>;

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? '';

  const result = users.map((u) => ({
    _id: u._id.toString(),
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    isSuperAdmin: u.email === superAdminEmail,
  }));

  return NextResponse.json({ users: result });
}

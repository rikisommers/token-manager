import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import { hashToken, isInviteExpired } from '@/lib/auth/invite';

/**
 * GET /api/invites/validate?token=<plaintext_token>
 * Public endpoint — used by /auth/invite-setup page on mount to validate the token.
 * Returns: { valid: true, email, role, collectionId? } | { valid: false, reason }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'missing' }, { status: 400 });
  }

  await dbConnect();
  const hashedToken = hashToken(token);
  const invite = await Invite.findOne({ token: hashedToken }).lean();

  if (!invite) {
    return NextResponse.json({ valid: false, reason: 'not-found' }, { status: 404 });
  }
  if (invite.status === 'accepted') {
    return NextResponse.json({ valid: false, reason: 'used' }, { status: 410 });
  }
  if (isInviteExpired(invite.expiresAt)) {
    return NextResponse.json({ valid: false, reason: 'expired' }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    ...(invite.collectionIds?.length ? { collectionIds: invite.collectionIds } : {}),
  });
}

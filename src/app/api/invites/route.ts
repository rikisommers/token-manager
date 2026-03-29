import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import { generateInviteToken, hashToken } from '@/lib/auth/invite';
import { buildInviteEmailHtml } from '@/lib/email/invite-email';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

/**
 * GET /api/invites
 * Returns all non-accepted invite documents (pending or expired).
 * Admin-only via requireRole(Action.ManageUsers).
 */
export async function GET() {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();
  const invites = await Invite.find({ status: { $ne: 'accepted' } })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites });
}

/**
 * POST /api/invites
 * Creates a new invite and sends the setup email via Resend.
 * Body: { email: string, role: 'Admin' | 'Editor' | 'Viewer', collectionId?: string }
 * Admin-only via requireRole(Action.ManageUsers).
 */
export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  const { email, role, collectionIds } = await request.json() as { email: string; role: string; collectionIds?: string[] };

  if (!email || !role || !['Admin', 'Editor', 'Viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  await dbConnect();

  // Duplicate check: existing active user account (disabled = removed, can be re-invited)
  const existingUser = await User.findOne({ email: email.toLowerCase(), status: { $ne: 'disabled' } });
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  // Duplicate check: pending non-expired invite
  const existingInvite = await Invite.findOne({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email' },
      { status: 409 }
    );
  }

  // Generate token pair
  const plainToken = generateInviteToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await Invite.create({
    email: email.toLowerCase(),
    token: hashedToken,
    role,
    createdBy: session.user.id,
    expiresAt,
    status: 'pending',
    ...(collectionIds?.length ? { collectionIds } : {}),
  });

  // Send email
  const setupUrl = `${process.env.NEXTAUTH_URL}/auth/invite-setup?token=${plainToken}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'ATUI Tokens Manager <noreply@tokenflow.studio>',
    to: [email.toLowerCase()],
    subject: `You've been invited to ATUI Tokens Manager as ${role}`,
    html: buildInviteEmailHtml(email.toLowerCase(), role, setupUrl),
  });

  if (emailError) {
    console.error('[invites] Resend error:', emailError);
    // Roll back invite creation if email delivery failed
    await Invite.deleteOne({ _id: invite._id });
    return NextResponse.json({ error: 'Failed to send invite email', detail: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ invite }, { status: 201 });
}

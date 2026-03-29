import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import { generateInviteToken, hashToken } from '@/lib/auth/invite';
import { buildInviteEmailHtml } from '@/lib/email/invite-email';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

/**
 * POST /api/invites/[id]/resend
 * Generates a new token, resets expiresAt by 7 days, sends a fresh email.
 * Admin-only. Only works on invites with status='pending' or 'expired'.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();
  const invite = await Invite.findById(params.id);

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 });
  }

  // Regenerate token and reset clock
  const plainToken = generateInviteToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  invite.token = hashedToken;
  invite.expiresAt = expiresAt;
  invite.status = 'pending';
  await invite.save();

  // Resend email with new link
  const setupUrl = `${process.env.NEXTAUTH_URL}/auth/invite-setup?token=${plainToken}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'ATUI Tokens Manager <noreply@tokenflow.studio>',
    to: [invite.email],
    subject: `You've been invited to ATUI Tokens Manager as ${invite.role}`,
    html: buildInviteEmailHtml(invite.email, invite.role, setupUrl),
  });

  if (emailError) {
    return NextResponse.json({ error: 'Failed to resend invite email' }, { status: 500 });
  }

  return NextResponse.json({ invite });
}

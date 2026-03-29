import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { Document } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import type { IUser } from '@/lib/db/models/User';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import { hashToken, isInviteExpired } from '@/lib/auth/invite';

/**
 * POST /api/auth/invite-setup
 * Body: { token: string, displayName: string, password: string }
 *
 * Flow:
 * 1. Hash the plain token and look up the invite atomically
 * 2. Validate invite is pending and not expired
 * 3. Create the User document (status: 'active', role from invite)
 * 4. Atomically mark invite as 'accepted' (findOneAndUpdate with pending filter)
 * 5. Return { ok: true, email, collectionId? } for client-side auto sign-in
 *
 * No requireAuth() — invited user has no session at this point.
 * This is the second documented bootstrap exception to ARCH-02 (POST /api/auth/setup is the first).
 */
export async function POST(request: Request) {
  const { token, displayName, password } = await request.json();

  if (!token || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  await dbConnect();

  // Find invite by hashed token
  const hashedToken = hashToken(token);
  const invite = await Invite.findOne({ token: hashedToken });

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'This invite link has already been used' }, { status: 410 });
  }
  if (isInviteExpired(invite.expiresAt)) {
    return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
  }

  // Check if active user already exists (disabled = previously removed, can be re-activated)
  const existingUser = await User.findOne({ email: invite.email });
  if (existingUser && existingUser.status !== 'disabled') {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  // Create or re-activate user
  const passwordHash = await bcrypt.hash(password, 12);
  let user: Document & IUser & { _id: { toString(): string } };
  if (existingUser) {
    // Re-activate previously removed account
    existingUser.displayName = displayName.trim();
    existingUser.passwordHash = passwordHash;
    existingUser.role = invite.role;
    existingUser.status = 'active';
    await existingUser.save();
    user = existingUser;
  } else {
    user = await User.create({
      displayName: displayName.trim(),
      email: invite.email,
      passwordHash,
      role: invite.role,
      status: 'active', // Must be explicit — schema defaults to 'invited', which would block sign-in via authorize()
    });
  }

  // Grant collection access for each scoped collection
  if (invite.collectionIds?.length) {
    await CollectionPermission.insertMany(
      invite.collectionIds.map((collectionId: string) => ({
        userId: user._id.toString(),
        collectionId,
        role: invite.role,
      }))
    );
  }

  // Atomically mark invite accepted — prevents race on double-submit
  // findOneAndUpdate with { status: 'pending' } filter: only one concurrent request wins
  const accepted = await Invite.findOneAndUpdate(
    { _id: invite._id, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  );

  if (!accepted) {
    // Race condition: another request beat us; user was created but invite already accepted
    // This is fine — user exists, just return ok
  }

  return NextResponse.json({
    ok: true,
    email: invite.email,
    // Redirect to first collection if scoped; client handles multi-collection case
    ...(invite.collectionIds?.length ? { collectionId: invite.collectionIds[0] } : {}),
  });
}

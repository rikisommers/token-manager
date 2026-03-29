// src/lib/auth/require-auth.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';
import { canPerform } from './permissions';
import type { Role, ActionType } from './permissions';
import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';

export type AuthResult = Session | NextResponse;

/**
 * Call at the top of every write Route Handler (before any business logic).
 * Returns the Session on success, or a 401 NextResponse on failure.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   // authResult is now typed as Session — authResult.user.id / authResult.user.role are available
 *
 * CRITICAL: App Router Route Handlers must call getServerSession with ONE argument (authOptions only).
 * The three-argument form getServerSession(req, res, authOptions) is for Pages API routes and throws
 * "res.getHeader is not a function" in App Router context because App Router uses Web API
 * Request/Response (not Node.js IncomingMessage/ServerResponse).
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

/**
 * Collection-scoped role enforcement gate.
 * Returns the Session on success, or a 401/403/404 NextResponse on failure.
 *
 * Logic:
 * - No session → 401 Unauthorized
 * - Admin org role + can perform action → Session (Admin bypasses collection grant check)
 * - Admin org role + cannot perform action → 403 Forbidden (data integrity edge case)
 * - Non-Admin + no collectionId → use orgRole as effectiveRole
 * - Non-Admin + collectionId + no grant + user has other grants → 404 Not Found (collection-scoped, no access)
 * - Non-Admin + collectionId + no grant + user has no grants → org-scoped, use orgRole
 * - Non-Admin + collectionId + grant found → use grant.role as effectiveRole
 * - effectiveRole can perform action → Session; otherwise → 403 Forbidden
 *
 * CRITICAL: Same single-argument getServerSession(authOptions) form required — see requireAuth() above.
 */
export async function requireRole(action: ActionType, collectionId?: string): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgRole = session.user.role as Role;

  if (orgRole === 'Admin') {
    if (canPerform('Admin', action)) {
      return session;
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Non-Admin path
  let effectiveRole: Role = orgRole;

  if (collectionId) {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId,
    }).lean();

    if (!grant) {
      // No grant for this collection — check if user is org-scoped (zero grants total)
      // vs collection-scoped (has grants but not for this one)
      const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
      if (anyGrant) {
        // Collection-scoped user with no access to this collection
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      // Org-scoped user: fall through using orgRole as effectiveRole
    } else {
      effectiveRole = grant.role as Role;
    }
  }

  if (canPerform(effectiveRole, action)) {
    return session;
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

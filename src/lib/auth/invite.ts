import crypto from 'crypto';

/** Generate a URL-safe plaintext token (64 hex chars). Send in email link. */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash a plaintext token with SHA-256 for safe DB storage. Store the hash, not the plaintext. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Returns true if the invite has passed its expiry date. */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

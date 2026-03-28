'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ValidateResponse =
  | { valid: true; email: string; role: string; collectionId?: string }
  | { valid: false; reason: string };

export default function InviteSetupForm({ token }: { token: string }) {
  const router = useRouter();

  // Token validation state
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; role: string; collectionId?: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invite token found. Please use the link from your invitation email.');
      setValidating(false);
      return;
    }

    fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: ValidateResponse) => {
        if (data.valid) {
          setInviteData({ email: data.email, role: data.role, collectionId: data.collectionId });
        } else {
          const messages: Record<string, string> = {
            'used': 'This invite link has already been used. Please contact your administrator.',
            'expired': 'This invite link has expired. Please ask your administrator to send a new invitation.',
            'not-found': 'This invite link is invalid. Please check your email for the correct link.',
            'missing': 'No invite token found. Please use the link from your invitation email.',
          };
          setTokenError(messages[data.reason] ?? 'This invite link is invalid.');
        }
      })
      .catch(() => {
        setTokenError('Unable to validate invite link. Please refresh and try again.');
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    // Step 1: Create account
    const res = await fetch('/api/auth/invite-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, displayName, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Setup failed. Please try again.');
      setLoading(false);
      return;
    }

    // Step 2: Auto sign-in
    const result = await signIn('credentials', {
      redirect: false,
      email: inviteData.email,
      password,
    });

    setLoading(false);

    if (!result?.ok || result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.');
      router.push('/auth/sign-in');
      return;
    }

    // Step 3: Redirect to specific collection or home
    const collectionId = (data as { collectionId?: string }).collectionId;
    router.push(collectionId ? `/collections/${collectionId}` : '/collections');
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state for invalid/expired/used tokens
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Invite Link Invalid
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tokenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-md p-8">
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-1">
          Set up your account
        </h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          You&apos;ve been invited as <strong>{inviteData?.role}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Display name
            </label>
            <Input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="Min. 8 characters"
            />
            {/* Hint shown always; validation error only after field touched */}
            {!passwordTouched && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Must be at least 8 characters.
              </p>
            )}
            {passwordTouched && password.length > 0 && password.length < 8 && (
              <p className="text-xs text-red-500 dark:text-red-400">
                Password must be at least 8 characters.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

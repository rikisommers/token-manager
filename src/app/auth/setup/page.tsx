'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetupPage() {
  const router = useRouter();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mount check state
  const [checking, setChecking] = useState(true);
  const [setupEmail, setSetupEmail] = useState<string | null>(null);

  // On mount: check whether setup is still required
  useEffect(() => {
    fetch('/api/auth/setup')
      .then((r) => r.json())
      .then((data) => {
        if (!data.setupRequired) {
          // Users already exist — redirect away without back-button return
          router.replace('/auth/sign-in');
          return;
        }
        // Store the email returned by the server (SUPER_ADMIN_EMAIL, server-side only)
        setSetupEmail(data.email ?? null);
        setChecking(false);
      })
      .catch(() => {
        // If the check fails, fall through to show an error state
        setError('Unable to check setup status. Please refresh the page.');
        setChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    // Step 1: Create the admin account
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? 'Setup failed. Please try again.');
      setLoading(false);
      return;
    }

    // Step 2: Auto sign-in using the email stored from the GET response
    const result = await signIn('credentials', {
      redirect: false,
      email: setupEmail,
      password,
    });

    setLoading(false);

    if (!result?.ok || result?.error) {
      setError('Account created but auto sign-in failed. Please sign in manually.');
      router.push('/auth/sign-in');
      return;
    }

    router.push('/');
  };

  // Show a centered spinner while the mount check is in progress
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-md p-8">
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-1">
          Create Admin Account
        </h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Set up your account to get started.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="displayName"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
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
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
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

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { resetPasswordViaApi } from '@/lib/auth-api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Missing reset token');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await resetPasswordViaApi(token, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Reset failed');
      return;
    }
    setMessage(result.message ?? 'Password updated.');
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Enter a new password for your account.">
      {message ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
          <Link href="/login" className="text-sm text-primary font-medium hover:underline">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-[12px] font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-new" className="block text-[12px] font-medium">
              Confirm password
            </label>
            <input
              id="confirm-new"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

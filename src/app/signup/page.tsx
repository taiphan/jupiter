'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { SocialSignInButtons } from '@/components/auth/social-sign-in-buttons';
import { registerViaApi } from '@/lib/auth-api';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await registerViaApi({ name: name.trim(), email: email.trim(), password });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
  };

  return (
    <AuthShell title="Create your account" subtitle="Sign up with your work email.">
      <Suspense fallback={null}>
        <SocialSignInButtons />
      </Suspense>

      {message ? (
        <p className="mb-4 text-sm text-center text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-[12px] font-medium">
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-email" className="block text-[12px] font-medium">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="block text-[12px] font-medium">
              Password
            </label>
            <input
              id="signup-password"
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
            <label htmlFor="confirm" className="block text-[12px] font-medium">
              Confirm password
            </label>
            <input
              id="confirm"
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
            disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

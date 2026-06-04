'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { DEMO_ACCOUNTS } from '@/lib/demo-users';
import { fetchAuthConfig } from '@/lib/auth-api';
import { ROLE_LABELS } from '@/lib/permissions';
import { initials } from '@/lib/utils';
import { AuthShell } from './auth-shell';
import { GoogleSignInButton } from './google-sign-in-button';
import { googleAuthErrorMessage } from '@/lib/auth-errors';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    void fetchAuthConfig().then((cfg) => {
      if (!cfg?.emailAuth) setDevMode(true);
    });
    if (searchParams.get('verified') === '1') {
      setInfo('Email verified. You can sign in now.');
    }
    const err = searchParams.get('error');
    const googleMsg = googleAuthErrorMessage(err);
    if (googleMsg) setError(googleMsg);
    else if (err) setError('Sign-in failed. Please try again.');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error ?? 'Login failed');
    setLoading(false);
  };

  return (
    <AuthShell
      title="Log in to VPBank"
      subtitle="Welcome back. Sign in with your email to continue to Jupiter."
    >
      <Suspense fallback={null}>
        <GoogleSignInButton />
      </Suspense>

      <form onSubmit={handleSubmit} className="space-y-4">
        {info ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">{info}</p>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden="true" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[12px] font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            placeholder="you@company.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-[12px] font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>

      {devMode ? (
        <div className="mt-6 border-t pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Dev mode (no database)
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            Use demo emails below. With Docker, run <code className="text-[10px]">npm run db:setup</code>.
          </p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map(({ user, password: pw }) => (
              <button
                key={user.email}
                type="button"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(pw);
                  setError('');
                }}
                className="flex w-full items-center gap-2.5 rounded-md border border-transparent p-2 text-left transition-colors hover:bg-muted cursor-pointer"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {initials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <code className="hidden text-[10px] text-muted-foreground sm:inline">
                  {user.email}
                </code>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}

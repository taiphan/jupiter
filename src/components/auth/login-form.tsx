'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { DEMO_ACCOUNTS } from '@/lib/demo-users';
import { fetchAuthConfig } from '@/lib/auth-api';
import { ROLE_LABELS } from '@/lib/permissions';
import { initials } from '@/lib/utils';
import { AuthShell } from './auth-shell';
import { SocialSignInButtons } from './social-sign-in-buttons';
import { oauthAuthErrorMessage } from '@/lib/auth-errors';
import { authInputClass, authLabelClass } from './auth-styles';
import { AuthContinueButton } from './auth-continue-button';

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [authConfig, setAuthConfig] = useState<Awaited<ReturnType<typeof fetchAuthConfig>>>(null);
  const searchParams = useSearchParams();

  const hasSocial =
    Boolean(authConfig?.googleAuth) ||
    Boolean(authConfig?.microsoftAuth) ||
    Boolean(authConfig?.githubAuth);

  useEffect(() => {
    void fetchAuthConfig().then((cfg) => {
      setAuthConfig(cfg);
      if (!cfg?.emailAuth) setDevMode(true);
    });
    if (searchParams.get('verified') === '1') {
      setInfo('Email verified. You can sign in now.');
    }
    const err = searchParams.get('error');
    const oauthMsg = oauthAuthErrorMessage(err);
    if (oauthMsg) setError(oauthMsg);
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
    if (result.requires2fa) {
      router.push('/login/2fa');
      setLoading(false);
      return;
    }
    if (!result.success) setError(result.error ?? 'Login failed');
    setLoading(false);
  };

  return (
    <AuthShell
      title="Sign in to Jupiter"
      subtitle="Welcome back! Please sign in to continue"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SocialSignInButtons />
      </Suspense>

      {authConfig?.workspacePersistence && !hasSocial && authConfig.emailAuth ? (
        <p className="mb-4 text-center text-xs text-zinc-500">
          Social sign-in is not configured. Admins: Settings → Authentication &amp; email.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5 pb-6">
        {info ? (
          <p className="text-center text-xs text-emerald-400">{info}</p>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className={authInputClass}
            placeholder="Enter your email address"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="password" className={authLabelClass}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
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
            className={authInputClass}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>

        <AuthContinueButton loading={loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </AuthContinueButton>
      </form>

      {devMode ? (
        <div className="mb-6 rounded-lg border border-white/10 bg-[#0c0c0e] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Dev mode (no database)
          </p>
          <p className="text-[11px] text-zinc-500 mb-3">
            Use demo accounts below, or run <code className="text-violet-300">npm run db:setup</code>.
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
                className="flex w-full items-center gap-2.5 rounded-md border border-transparent p-2 text-left transition-colors hover:bg-white/5 cursor-pointer"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {initials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{ROLE_LABELS[user.role]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}

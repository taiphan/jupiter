'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { SocialSignInButtons } from '@/components/auth/social-sign-in-buttons';
import { AuthContinueButton } from '@/components/auth/auth-continue-button';
import { authInputClass, authLabelClass } from '@/components/auth/auth-styles';
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
    <AuthShell
      title="Sign up for Jupiter"
      subtitle="Create your account to start tracking work"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SocialSignInButtons />
      </Suspense>

      {message ? (
        <p className="mb-4 text-center text-sm text-emerald-400">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="name" className={authLabelClass}>
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClass}
              placeholder="Your name"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-email" className={authLabelClass}>
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="Enter your email address"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-password" className={authLabelClass}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className={authLabelClass}>
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputClass}
              placeholder="Repeat your password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <AuthContinueButton loading={loading}>
            {loading ? 'Creating account…' : 'Continue'}
          </AuthContinueButton>
        </form>
      )}
    </AuthShell>
  );
}

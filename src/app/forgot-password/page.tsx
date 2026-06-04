'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthContinueButton } from '@/components/auth/auth-continue-button';
import { authInputClass, authLabelClass } from '@/components/auth/auth-styles';
import { forgotPasswordViaApi } from '@/lib/auth-api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPasswordViaApi(email.trim());
    setMessage(result.message);
    setLoading(false);
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We will email you a link to choose a new password"
      footer={
        <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 pb-6">
        {message ? <p className="text-sm text-center text-zinc-400">{message}</p> : null}
        <div className="space-y-2">
          <label htmlFor="forgot-email" className={authLabelClass}>
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="Enter your email address"
            required
            autoComplete="email"
          />
        </div>
        <AuthContinueButton loading={loading}>
          {loading ? 'Sending…' : 'Continue'}
        </AuthContinueButton>
      </form>
    </AuthShell>
  );
}

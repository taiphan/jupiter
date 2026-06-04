'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
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
    <AuthShell title="Reset password" subtitle="We will email you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {message ? <p className="text-sm text-center text-muted-foreground">{message}</p> : null}
        <div className="space-y-1.5">
          <label htmlFor="forgot-email" className="block text-[12px] font-medium">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm"
            required
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

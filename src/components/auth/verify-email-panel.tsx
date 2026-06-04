'use client';

import { useState } from 'react';
import { AuthShell } from './auth-shell';
import { useAuthStore } from '@/lib/auth-store';
import { resendVerificationViaApi } from '@/lib/auth-api';

export function VerifyEmailPanel() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user?.email) return null;

  const handleResend = async () => {
    setLoading(true);
    const result = await resendVerificationViaApi(user.email);
    setMessage(result.message);
    setLoading(false);
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a link to ${user.email}. Verify before using Jupiter.`}
    >
      <div className="space-y-4 text-center text-sm">
        {message ? <p className="text-muted-foreground">{message}</p> : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleResend()}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Resend verification email'}
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </AuthShell>
  );
}

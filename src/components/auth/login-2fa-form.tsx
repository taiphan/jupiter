'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { challenge2faViaApi } from '@/lib/auth-api';
import { AuthShell } from './auth-shell';
import { AuthContinueButton } from './auth-continue-button';
import { authInputClass, authLabelClass } from './auth-styles';

export function Login2faForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await challenge2faViaApi(
      useBackup
        ? { backupCode: backupCode.trim() }
        : { code },
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setUser(result.user);
    router.replace('/');
  };

  return (
    <AuthShell
      title="Two-factor authentication"
      subtitle="Enter the code from your authenticator app to finish signing in."
      footer={
        <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 pb-6">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        ) : null}

        {useBackup ? (
          <div className="space-y-2">
            <label htmlFor="backup" className={authLabelClass}>
              Backup code
            </label>
            <input
              id="backup"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className={`${authInputClass} font-mono`}
              placeholder="XXXX-XXXX-XXXX"
              required
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="totp" className={authLabelClass}>
              6-digit code
            </label>
            <input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${authInputClass} font-mono tracking-[0.3em] text-center`}
              required
              autoFocus
            />
          </div>
        )}

        <AuthContinueButton
          loading={loading}
          disabled={useBackup ? !backupCode.trim() : code.length !== 6}
        >
          {loading ? 'Verifying…' : 'Continue'}
        </AuthContinueButton>

        <button
          type="button"
          className="w-full text-xs text-violet-400 hover:text-violet-300 hover:underline"
          onClick={() => {
            setUseBackup(!useBackup);
            setError('');
          }}
        >
          {useBackup ? 'Use authenticator code' : 'Use a backup code'}
        </button>
      </form>
    </AuthShell>
  );
}

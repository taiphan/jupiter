'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { challenge2faViaApi } from '@/lib/auth-api';
import { AuthShell } from './auth-shell';

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
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden="true" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        ) : null}

        {useBackup ? (
          <div className="space-y-1.5">
            <label htmlFor="backup" className="block text-[12px] font-medium">
              Backup code
            </label>
            <input
              id="backup"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm font-mono"
              placeholder="XXXX-XXXX-XXXX"
              required
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="totp" className="block text-[12px] font-medium">
              6-digit code
            </label>
            <input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm font-mono tracking-[0.3em] text-center"
              required
              autoFocus
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (useBackup ? !backupCode.trim() : code.length !== 6)}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Continue'}
        </button>

        <button
          type="button"
          className="w-full text-xs text-primary hover:underline"
          onClick={() => {
            setUseBackup(!useBackup);
            setError('');
          }}
        >
          {useBackup ? 'Use authenticator code' : 'Use a backup code'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

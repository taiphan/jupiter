'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  disable2faViaApi,
  enable2faViaApi,
  fetchSession,
  regenerateBackupCodesViaApi,
  setup2faViaApi,
} from '@/lib/auth-api';

type SetupState = {
  qrDataUrl: string;
  manualKey: string;
  secretMasked: string;
};

export function TwoFactorCard() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const session = await fetchSession();
    if (session.mode === 'ok') {
      setAvailable(session.twoFactorAuthAvailable);
      setEnabled(session.totpEnabled);
    } else {
      setAvailable(false);
      setEnabled(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading || !available) return null;

  const startSetup = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    const result = await setup2faViaApi();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Request failed');
      return;
    }
    setSetup({
      qrDataUrl: result.qrDataUrl,
      manualKey: result.manualKey,
      secretMasked: result.secretMasked,
    });
    setConfirmCode('');
    setBackupCodes(null);
  };

  const confirmEnable = async () => {
    setError('');
    setBusy(true);
    const result = await enable2faViaApi(confirmCode);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Request failed');
      return;
    }
    setSetup(null);
    setBackupCodes(result.backupCodes);
    setEnabled(true);
    setMessage('Two-factor authentication is now enabled.');
  };

  const disable = async () => {
    setError('');
    setBusy(true);
    const result = await disable2faViaApi({
      password: disablePassword,
      code: disableCode || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not disable 2FA');
      return;
    }
    setEnabled(false);
    setSetup(null);
    setBackupCodes(null);
    setDisablePassword('');
    setDisableCode('');
    setMessage('Two-factor authentication disabled.');
  };

  const regenerate = async () => {
    setError('');
    setBusy(true);
    const result = await regenerateBackupCodesViaApi(regenPassword, regenCode);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Request failed');
      return;
    }
    setBackupCodes(result.backupCodes);
    setRegenPassword('');
    setRegenCode('');
    setMessage('New backup codes generated. Save them now.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          Use an authenticator app for an extra sign-in step
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Authenticator app</p>
            <p className="text-[11px] text-muted-foreground">
              {enabled ? 'Required at sign-in' : 'Not enabled'}
            </p>
          </div>
          <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px]">
            {enabled ? 'On' : 'Off'}
          </Badge>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>
        ) : null}

        {backupCodes ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-medium">Save these backup codes (shown once)</p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-[11px]">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setBackupCodes(null)}
            >
              I saved them
            </Button>
          </div>
        ) : null}

        {!enabled && !setup ? (
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            disabled={busy}
            onClick={() => void startSetup()}
          >
            {busy ? 'Starting…' : 'Enable 2FA'}
          </Button>
        ) : null}

        {setup ? (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Scan the QR code with Google Authenticator, 1Password, or Authy.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrDataUrl}
              alt="QR code for authenticator setup"
              className="mx-auto h-40 w-40 rounded-md border bg-white p-2"
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Manual key: <span className="font-mono">{setup.manualKey}</span>
              <span className="sr-only"> ({setup.secretMasked})</span>
            </p>
            <div className="space-y-1.5">
              <label htmlFor="totp-confirm" className="text-[12px] font-medium">
                Enter 6-digit code
              </label>
              <input
                id="totp-confirm"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                disabled={busy || confirmCode.length !== 6}
                onClick={() => void confirmEnable()}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setSetup(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {enabled ? (
          <div className="space-y-4 border-t pt-3">
            <div className="space-y-2">
              <p className="text-xs font-medium">Regenerate backup codes</p>
              <input
                type="password"
                placeholder="Password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
                className="w-full h-9 px-3 border border-input rounded-md text-sm"
                autoComplete="current-password"
              />
              <input
                inputMode="numeric"
                placeholder="6-digit code"
                maxLength={6}
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-9 px-3 border border-input rounded-md text-sm font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => void regenerate()}
              >
                Regenerate codes
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-destructive">Disable 2FA</p>
              <input
                type="password"
                placeholder="Password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full h-9 px-3 border border-input rounded-md text-sm"
                autoComplete="current-password"
              />
              <input
                inputMode="numeric"
                placeholder="6-digit code or backup code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="w-full h-9 px-3 border border-input rounded-md text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer text-destructive border-destructive/40"
                disabled={busy}
                onClick={() => void disable()}
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

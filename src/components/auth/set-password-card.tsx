'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchSession, setPasswordViaApi } from '@/lib/auth-api';

export function SetPasswordCard() {
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetchSession().then((s) => {
      setNeedsPassword(s.mode === 'ok' && !s.hasPassword);
      setLoading(false);
    });
  }, []);

  const submit = async () => {
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    const result = await setPasswordViaApi(password);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not set password');
      return;
    }
    setMessage('Password set. You can sign in with email and password.');
    setNeedsPassword(false);
    setPassword('');
    setConfirm('');
  };

  if (loading || !needsPassword) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Set a password</CardTitle>
        <CardDescription>
          You signed in with a social provider. Add a password so you can disconnect OAuth or use
          email sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="password"
          className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          type="password"
          className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="cursor-pointer"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? 'Saving…' : 'Set password'}
        </Button>
      </CardContent>
    </Card>
  );
}

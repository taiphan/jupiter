'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { disconnectGoogleViaApi, fetchSession } from '@/lib/auth-api';

export function ConnectedAccountsCard() {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const session = await fetchSession();
    if (session.mode === 'ok') {
      setGoogleConnected(session.googleConnected);
      setGoogleAvailable(session.googleAuthAvailable);
    } else {
      setGoogleConnected(false);
      setGoogleAvailable(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const disconnect = async () => {
    setError('');
    setMessage('');
    if (!confirm('Disconnect Google from this account?')) return;
    setDisconnecting(true);
    const result = await disconnectGoogleViaApi();
    setDisconnecting(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not disconnect Google');
      return;
    }
    setMessage('Google account disconnected.');
    setGoogleConnected(false);
  };

  if (loading) return null;
  if (!googleAvailable && !googleConnected) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connected accounts</CardTitle>
        <CardDescription>Sign-in methods linked to your Jupiter account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Google</p>
            <p className="text-[11px] text-muted-foreground">
              {googleConnected ? 'Connected for sign-in' : 'Not connected'}
            </p>
          </div>
          <Badge variant={googleConnected ? 'default' : 'secondary'} className="text-[10px]">
            {googleConnected ? 'Linked' : 'Available'}
          </Badge>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p> : null}

        {googleConnected ? (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={disconnecting}
            onClick={() => void disconnect()}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect Google'}
          </Button>
        ) : googleAvailable ? (
          <a
            href="/api/auth/google?redirect=%2Fsettings"
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
          >
            Connect Google
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

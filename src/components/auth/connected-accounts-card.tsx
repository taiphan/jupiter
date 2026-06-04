'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  disconnectOAuthViaApi,
  fetchSession,
  type OAuthProviderId,
} from '@/lib/auth-api';

const PROVIDERS: {
  id: OAuthProviderId;
  label: string;
  connectPath: string;
  availabilityKey: 'googleAuthAvailable' | 'microsoftAuthAvailable' | 'githubAuthAvailable';
}[] = [
  { id: 'google', label: 'Google', connectPath: '/api/auth/google', availabilityKey: 'googleAuthAvailable' },
  {
    id: 'microsoft',
    label: 'Microsoft',
    connectPath: '/api/auth/microsoft',
    availabilityKey: 'microsoftAuthAvailable',
  },
  { id: 'github', label: 'GitHub', connectPath: '/api/auth/github', availabilityKey: 'githubAuthAvailable' },
];

export function ConnectedAccountsCard() {
  const [connected, setConnected] = useState<OAuthProviderId[]>([]);
  const [availability, setAvailability] = useState<Record<OAuthProviderId, boolean>>({
    google: false,
    microsoft: false,
    github: false,
  });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const session = await fetchSession();
    if (session.mode === 'ok') {
      setConnected(session.oauthConnected);
      setAvailability({
        google: session.googleAuthAvailable,
        microsoft: session.microsoftAuthAvailable,
        github: session.githubAuthAvailable,
      });
    } else {
      setConnected([]);
      setAvailability({ google: false, microsoft: false, github: false });
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const disconnect = async (provider: OAuthProviderId) => {
    setError('');
    setMessage('');
    if (!confirm(`Disconnect ${provider} from this account?`)) return;
    setDisconnecting(provider);
    const result = await disconnectOAuthViaApi(provider);
    setDisconnecting(null);
    if (!result.ok) {
      setError(result.error ?? `Could not disconnect ${provider}`);
      return;
    }
    setMessage(`${provider.charAt(0).toUpperCase()}${provider.slice(1)} disconnected.`);
    setConnected((c) => c.filter((p) => p !== provider));
  };

  if (loading) return null;

  const visible = PROVIDERS.filter(
    (p) => availability[p.id] || connected.includes(p.id),
  );
  if (visible.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connected accounts</CardTitle>
        <CardDescription>Sign-in methods linked to your Jupiter account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((p) => {
          const isConnected = connected.includes(p.id);
          return (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isConnected ? 'Connected for sign-in' : 'Not connected'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isConnected ? 'default' : 'secondary'} className="text-[10px]">
                  {isConnected ? 'Linked' : 'Available'}
                </Badge>
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={disconnecting === p.id}
                    onClick={() => void disconnect(p.id)}
                  >
                    {disconnecting === p.id ? '…' : 'Disconnect'}
                  </Button>
                ) : availability[p.id] ? (
                  <a
                    href={`${p.connectPath}?redirect=${encodeURIComponent('/settings')}`}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
                  >
                    Connect
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

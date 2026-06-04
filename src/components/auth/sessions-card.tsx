'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchSessionsViaApi,
  revokeAllOtherSessionsViaApi,
  revokeSessionViaApi,
  type SessionListItem,
} from '@/lib/auth-api';
import { formatDistanceToNow } from 'date-fns';

export function SessionsCard() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setSessions(await fetchSessionsViaApi());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const revoke = async (id: string) => {
    setBusy(id);
    setMessage('');
    const result = await revokeSessionViaApi(id);
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error ?? 'Could not revoke session');
      return;
    }
    setMessage('Session revoked.');
    await load();
  };

  const revokeOthers = async () => {
    if (!confirm('Sign out all other devices?')) return;
    setBusy('all');
    setMessage('');
    const result = await revokeAllOtherSessionsViaApi();
    setBusy(null);
    if (!result.ok) {
      setMessage('Could not revoke other sessions');
      return;
    }
    setMessage(
      result.revoked ? `Revoked ${result.revoked} other session(s).` : 'No other sessions to revoke.',
    );
    await load();
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active sessions</CardTitle>
        <CardDescription>Devices signed in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active sessions.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {s.userAgent?.split(' ')[0] ?? 'Unknown browser'}
                  {s.current ? (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      This device
                    </Badge>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {s.ipAddress ?? 'IP unknown'} · Started{' '}
                  {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!s.current ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  disabled={busy === s.id}
                  onClick={() => void revoke(s.id)}
                >
                  {busy === s.id ? '…' : 'Revoke'}
                </Button>
              ) : null}
            </div>
          ))
        )}

        {sessions.some((s) => !s.current) ? (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={busy === 'all'}
            onClick={() => void revokeOthers()}
          >
            {busy === 'all' ? 'Revoking…' : 'Sign out other devices'}
          </Button>
        ) : null}

        {message ? (
          <p className="text-xs text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

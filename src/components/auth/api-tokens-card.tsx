'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createApiTokenViaApi,
  fetchApiTokensViaApi,
  revokeApiTokenViaApi,
  type ApiTokenListItem,
} from '@/lib/auth-api';

export function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenListItem[]>([]);
  const [name, setName] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setTokens(await fetchApiTokensViaApi());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setError('');
    setNewSecret(null);
    if (!name.trim()) {
      setError('Enter a token name');
      return;
    }
    setCreating(true);
    const result = await createApiTokenViaApi(name.trim());
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewSecret(result.secret);
    setName('');
    await load();
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this token? Applications using it will stop working.')) return;
    await revokeApiTokenViaApi(id);
    await load();
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal access tokens</CardTitle>
        <CardDescription>
          API tokens for scripts and integrations. Use Authorization: Bearer jpt_…
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 h-9 px-3 bg-background border border-input rounded-md text-sm"
            placeholder="Token name (e.g. CI deploy)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            disabled={creating}
            onClick={() => void create()}
          >
            {creating ? 'Creating…' : 'Create token'}
          </Button>
        </div>

        {newSecret ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
            <p className="text-xs font-medium">Copy your token now — it won&apos;t be shown again.</p>
            <code className="block text-[11px] break-all font-mono">{newSecret}</code>
          </div>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tokens yet.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {t.tokenPrefix}…
                    {t.lastUsedAt ? ` · used ${new Date(t.lastUsedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  onClick={() => void revoke(t.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

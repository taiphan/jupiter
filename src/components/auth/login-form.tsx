'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthStore, DEMO_USERS } from '@/lib/auth-store';
import { ROLE_LABELS } from '@/lib/permissions';
import { initials } from '@/lib/utils';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = login(username.trim(), password);
      if (!result.success) setError(result.error ?? 'Login failed');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Atlassian-style top bar */}
      <header className="flex h-12 items-center border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-black text-primary-foreground">
            J
          </span>
          <span className="text-sm font-semibold">Jira</span>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 ds-shadow-raised">
          {/* FE CREDIT mark */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-[#E31837] text-sm font-black text-white">
              FC
            </span>
            <h1 className="text-xl font-semibold">Log in to FE CREDIT</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back. Sign in to continue to Jira.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden="true" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[12px] font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                placeholder="Enter username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12px] font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 border-t pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Demo accounts
            </p>
            <div className="space-y-1.5">
              {DEMO_USERS.map(({ user, password: pw, username: uname }) => (
                <button
                  key={uname}
                  type="button"
                  onClick={() => {
                    setUsername(uname);
                    setPassword(pw);
                    setError('');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md border border-transparent p-2 text-left transition-colors hover:bg-muted cursor-pointer"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                  <code className="hidden text-[10px] text-muted-foreground sm:inline">
                    {uname} / {pw}
                  </code>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card px-4 py-3 text-center text-[11px] text-muted-foreground">
        © 2026 FE CREDIT · Atlassian-style project tracker
      </footer>
    </div>
  );
}

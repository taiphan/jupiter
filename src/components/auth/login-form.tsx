'use client';

import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0052cc] via-[#0747a6] to-[#0c1e3e] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-lg">
              JC
            </div>
            <div>
              <span className="text-lg font-bold">Jira Clone</span>
              <p className="text-[11px] text-blue-100/80">Project tracker for modern teams</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              Plan, track, and<br />ship your work.
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Boards, backlogs, and issue tracking — all the essentials for getting work
              done, without the bloat.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Stat label="Projects" value="Unlimited" />
              <Stat label="Issue types" value="5+" />
              <Stat label="Workflows" value="Customizable" />
              <Stat label="Roles" value="4" />
            </div>
          </div>

          <p className="text-blue-200 text-xs flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Built on Next.js 16 · React 19 · Tailwind v4
          </p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#0052cc] flex items-center justify-center">
                <span className="text-sm font-black text-white">JC</span>
              </div>
              <span className="font-semibold">Jira Clone</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Sign in to your workspace
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[13px] font-medium">
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
                className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                placeholder="admin"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium">
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
                className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <p className="text-[12px] font-medium text-muted-foreground mb-3">
              Demo accounts (click to auto-fill)
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map(({ user, password: pw, username: uname }) => (
                <button
                  key={uname}
                  type="button"
                  onClick={() => {
                    setUsername(uname);
                    setPassword(pw);
                    setError('');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium group-hover:text-primary transition-colors">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {ROLE_LABELS[user.role]} · {user.title}
                    </p>
                  </div>
                  <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:block">
                    {uname}
                  </code>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Password: <code className="px-1 py-0.5 bg-muted rounded">{'<role>'}123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/10 backdrop-blur">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[11px] text-blue-100">{label}</p>
    </div>
  );
}

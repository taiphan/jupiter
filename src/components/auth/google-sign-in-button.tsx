'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { fetchAuthConfig } from '@/lib/auth-api';

export function GoogleSignInButton() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    void fetchAuthConfig().then((cfg) => {
      if (cfg?.googleAuth) setEnabled(true);
    });
  }, []);

  if (!enabled) return null;

  const redirect =
    pathname && pathname !== '/login' && pathname !== '/signup'
      ? pathname
      : (searchParams.get('redirect') ?? '/');

  const href = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`;

  return (
    <>
      <a
        href={href}
        onClick={() => setLoading(true)}
        aria-busy={loading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        {loading ? 'Redirecting to Google…' : 'Continue with Google'}
      </a>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

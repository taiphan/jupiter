'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { fetchAuthConfig, type LoginAuthConfig } from '@/lib/auth-api';
import { AuthDivider } from './auth-divider';
import { authSocialButtonClass } from './auth-styles';

type Provider = 'google' | 'microsoft' | 'github';

/** OrbStack-style order: GitHub and Google side by side when both enabled. */
const PROVIDERS: {
  id: Provider;
  label: string;
  path: string;
  configKey: keyof Pick<LoginAuthConfig, 'googleAuth' | 'microsoftAuth' | 'githubAuth'>;
  icon: React.ReactNode;
}[] = [
  {
    id: 'github',
    label: 'GitHub',
    path: '/api/auth/github',
    configKey: 'githubAuth',
    icon: <GitHubIcon />,
  },
  {
    id: 'google',
    label: 'Google',
    path: '/api/auth/google',
    configKey: 'googleAuth',
    icon: <GoogleIcon />,
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    path: '/api/auth/microsoft',
    configKey: 'microsoftAuth',
    icon: <MicrosoftIcon />,
  },
];

export function SocialSignInButtons({ showDivider = true }: { showDivider?: boolean }) {
  const [config, setConfig] = useState<LoginAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<Provider | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    void fetchAuthConfig().then((cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
  }, []);

  const enabled = PROVIDERS.filter((p) => config?.[p.configKey]);

  if (loading) {
    return (
      <div
        className="mb-2 grid grid-cols-2 gap-3"
        aria-busy="true"
        aria-label="Loading sign-in options"
      >
        <div className="h-11 animate-pulse rounded-lg bg-white/5" />
        <div className="h-11 animate-pulse rounded-lg bg-white/5" />
      </div>
    );
  }

  if (enabled.length === 0) {
    return null;
  }

  const redirect =
    pathname && pathname !== '/login' && pathname !== '/signup'
      ? pathname
      : (searchParams.get('redirect') ?? '/');

  return (
    <>
      <div
        className={
          enabled.length === 1
            ? 'grid grid-cols-1 gap-3'
            : enabled.length === 2
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-2 gap-3'
        }
      >
        {enabled.map((p) => {
          const href = `${p.path}?redirect=${encodeURIComponent(redirect)}`;
          const spanFull = enabled.length === 3 && p.id === 'microsoft';
          return (
            <a
              key={p.id}
              href={href}
              onClick={() => setLoadingId(p.id)}
              aria-busy={loadingId === p.id}
              className={`${authSocialButtonClass}${spanFull ? ' col-span-2' : ''}`}
            >
              {p.icon}
              <span>{loadingId === p.id ? 'Redirecting…' : p.label}</span>
            </a>
          );
        })}
      </div>
      {showDivider ? <AuthDivider /> : null}
    </>
  );
}

/** @deprecated use SocialSignInButtons */
export function GoogleSignInButton() {
  return <SocialSignInButtons />;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
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

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true" className="shrink-0">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M12 1h10v10H12z" />
      <path fill="#7fba00" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

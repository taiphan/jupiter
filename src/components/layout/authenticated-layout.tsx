'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { LoginForm } from '@/components/auth/login-form';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';
import { GlobalTopNav } from './global-top-nav';
import { RouteGuard } from './route-guard';
import { WorkspaceSync } from '@/components/workspace/workspace-sync';
import { PersistenceSync } from '@/components/workspace/persistence-sync';

const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]);

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrateSession = useAuthStore((s) => s.hydrateSession);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateSession();
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateSession]);

  if (!hydrated) return null;

  if (PUBLIC_AUTH_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    );
  }

  if (user && user.emailVerified === false) {
    return <VerifyEmailPanel />;
  }

  return (
    <div className="flex h-screen flex-col">
      <WorkspaceSync />
      <PersistenceSync />
      <GlobalTopNav />
      <RouteGuard>
        <div className="flex flex-1 overflow-hidden">{children}</div>
      </RouteGuard>
    </div>
  );
}

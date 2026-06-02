'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { LoginForm } from '@/components/auth/login-form';
import { GlobalTopNav } from './global-top-nav';
import { RouteGuard } from './route-guard';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Avoid flashing login on first paint while localStorage rehydrates
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration flag, syncs with browser-only state
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  if (!isAuthenticated) return <LoginForm />;

  return (
    <div className="flex h-screen flex-col">
      <GlobalTopNav />
      <RouteGuard>
        <div className="flex flex-1 overflow-hidden">{children}</div>
      </RouteGuard>
    </div>
  );
}

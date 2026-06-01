'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { LoginForm } from '@/components/auth/login-form';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { RouteGuard } from './route-guard';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Avoid flashing the login screen on first paint while localStorage rehydrates
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration flag, synchronizes with browser-only state
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  if (!isAuthenticated) return <LoginForm />;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <RouteGuard>{children}</RouteGuard>
      </SidebarInset>
    </SidebarProvider>
  );
}

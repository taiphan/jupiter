'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import { canAccessRoute, ROLE_LABELS } from '@/lib/permissions';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  if (!user) return <>{children}</>;
  if (canAccessRoute(user.role, pathname)) return <>{children}</>;

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your role doesn&apos;t have permission to view this page. Ask an admin if you
            need access.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">Path:</span>
            <code className="rounded bg-muted px-2 py-1 font-mono">{pathname}</code>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Role:</span>
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="sm" className="cursor-pointer gap-2" render={<Link href="/" />}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to My Work
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

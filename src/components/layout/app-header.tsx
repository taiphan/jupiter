'use client';

import Link from 'next/link';
import { Bell, Plus } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './theme-toggle';

interface AppHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, description, actions }: AppHeaderProps) {
  return (
    <div className="shrink-0">
      <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
        <SidebarTrigger className="cursor-pointer" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        {title && (
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">{title}</h1>
            {description && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                — {description}
              </span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {actions}
          <Button
            size="sm"
            className="hidden cursor-pointer gap-1.5 sm:inline-flex"
            render={<Link href="/issues/new" />}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Create
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px]">
              2
            </Badge>
          </Button>
          <ThemeToggle />
        </div>
      </header>
    </div>
  );
}

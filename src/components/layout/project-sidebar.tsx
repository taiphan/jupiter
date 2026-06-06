'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  KanbanSquare,
  ListTodo,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
  ArrowLeftRight,
  CheckSquare,
  Star,
  Code2,
  Repeat,
  Webhook,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectsStore } from '@/lib/projects-store';
import type { Project } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface ProjectSidebarProps {
  project: Project;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Layers;
  badge?: string;
}

export function ProjectSidebar({ project }: ProjectSidebarProps) {
  const pathname = usePathname();
  const lead = useProjectsStore((s) => s.members.find((m) => m.id === project.leadId));
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, 'projects.edit');

  const [collapsed, setCollapsed] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(true);
  const [devOpen, setDevOpen] = useState(true);

  const baseUrl = `/projects/${project.key}`;

  const planning: NavItem[] = [
    { label: 'Summary', href: `${baseUrl}/summary`, icon: Layers },
    { label: 'Timeline', href: `${baseUrl}/timeline`, icon: Calendar },
    { label: 'Backlog', href: `${baseUrl}/backlog`, icon: ListTodo },
    { label: 'Board', href: baseUrl, icon: KanbanSquare },
    { label: 'List', href: `${baseUrl}/list`, icon: ListTodo },
    { label: 'Calendar', href: `${baseUrl}/calendar`, icon: CalendarDays },
    { label: 'Reports', href: `${baseUrl}/reports`, icon: BarChart3 },
  ];

  const development: NavItem[] = [
    { label: 'All issues', href: `/issues?project=${project.id}`, icon: CheckSquare },
    { label: 'Code', href: '#', icon: Code2 },
    { label: 'Releases', href: `${baseUrl}/releases`, icon: Zap },
    { label: 'Automation', href: `${baseUrl}/automation`, icon: Repeat },
    { label: 'Webhooks', href: `${baseUrl}/webhooks`, icon: Webhook },
  ];

  const settings: NavItem[] = canEdit
    ? [
        { label: 'Board configuration', href: `${baseUrl}/board-config`, icon: Layers },
        { label: 'Custom fields', href: `${baseUrl}/fields`, icon: ListTodo },
        { label: 'Project settings', href: `${baseUrl}/settings`, icon: SettingsIcon },
      ]
    : [];

  const isActive = (href: string) => {
    if (href.includes('?') || href === '#') return false;
    if (href === baseUrl) return pathname === baseUrl;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (collapsed) {
    return (
      <aside className="hidden h-full w-12 shrink-0 flex-col items-center border-r bg-[var(--sidebar)] md:flex">
        <Button
          variant="ghost"
          size="icon"
          className="mt-2 h-8 w-8 cursor-pointer"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <span className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
          {project.key}
        </span>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r bg-[var(--sidebar)] md:flex">
      {/* Header */}
      <div className="border-b px-3 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 cursor-pointer gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            render={<Link href="/projects" />}
          >
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            Projects
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {project.key}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {project.type === 'kanban' ? 'Team-managed software' : 'Scrum software'}
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Star project"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <NavGroup
          title="Planning"
          items={planning}
          isActive={isActive}
          open={planningOpen}
          onToggle={() => setPlanningOpen((o) => !o)}
        />
        <NavGroup
          title="Development"
          items={development}
          isActive={isActive}
          open={devOpen}
          onToggle={() => setDevOpen((o) => !o)}
        />
        {settings.length > 0 && <NavGroup items={settings} isActive={isActive} />}
      </div>

      {lead && (
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: lead.avatarColor }}
              aria-hidden="true"
            >
              {lead.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead</p>
              <p className="truncate text-xs font-medium">{lead.name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full cursor-pointer justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          render={<Link href="/projects" />}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Switch project
        </Button>
      </div>
    </aside>
  );
}

function NavGroup({
  title, items, isActive, open = true, onToggle,
}: {
  title?: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="px-2 py-1">
      {title && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {open
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
          {title}
        </button>
      )}
      {open && (
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isActive(item.href);
            const isPlaceholder = item.href === '#';
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-disabled={isPlaceholder}
                onClick={(e) => {
                  if (isPlaceholder) e.preventDefault();
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-muted',
                  isPlaceholder && 'cursor-not-allowed opacity-50',
                )}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

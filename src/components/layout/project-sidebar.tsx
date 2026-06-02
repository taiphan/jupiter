'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  Layers,
  KanbanSquare,
  ListTodo,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  ArrowLeftRight,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectsStore } from '@/lib/projects-store';
import type { Project } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';

interface ProjectSidebarProps {
  project: Project;
}

export function ProjectSidebar({ project }: ProjectSidebarProps) {
  const pathname = usePathname();
  const lead = useProjectsStore((s) => s.members.find((m) => m.id === project.leadId));
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, 'projects.edit');

  const baseUrl = `/projects/${project.key}`;

  // Atlassian groups planning vs operations vs settings
  const planning = [
    { label: 'Summary', href: `${baseUrl}/summary`, icon: Layers },
    { label: 'Board', href: baseUrl, icon: KanbanSquare },
    { label: 'Backlog', href: `${baseUrl}/backlog`, icon: ListTodo },
    { label: 'Timeline', href: `${baseUrl}/timeline`, icon: Calendar },
    { label: 'Reports', href: `${baseUrl}/reports`, icon: BarChart3 },
  ];

  const development = [
    { label: 'All issues', href: `/issues?project=${project.id}`, icon: CheckSquare },
  ];

  const settings = canEdit
    ? [{ label: 'Project settings', href: `${baseUrl}/settings`, icon: SettingsIcon }]
    : [];

  const isActive = (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    if (href.includes('?')) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="hidden h-full w-60 shrink-0 border-r bg-[var(--sidebar)] md:flex md:flex-col">
      {/* Project header */}
      <div className="border-b px-4 pb-3 pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 h-7 cursor-pointer gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          render={<Link href="/projects" />}
        >
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          Projects
        </Button>
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {project.key}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {project.type === 'kanban' ? 'Team-managed software' : 'Scrum software'}
            </p>
          </div>
        </div>
      </div>

      {/* Planning */}
      <div className="flex-1 overflow-y-auto py-2">
        <NavGroup title="Planning" items={planning} isActive={isActive} />
        <NavGroup title="Development" items={development} isActive={isActive} />
        {settings.length > 0 && <NavGroup items={settings} isActive={isActive} />}
      </div>

      {/* Footer: lead */}
      {lead && (
        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: lead.avatarColor }}
              aria-hidden="true"
            >
              {lead.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Lead</p>
              <p className="truncate text-xs font-medium">{lead.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Switch project */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full cursor-pointer justify-start gap-2 text-xs"
          render={<Link href="/projects" />}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Switch project
        </Button>
      </div>
    </aside>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Layers;
}

function NavGroup({
  title, items, isActive,
}: {
  title?: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="px-2 py-1">
      {title && (
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-muted',
              ].join(' ')}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Settings as SettingsIcon,
  Plus,
  ChevronDown,
  AppWindow,
  LogOut,
  CheckCircle2,
  Star,
  Clock,
  ListChecks,
  FolderKanban,
  Filter as FilterIcon,
  Users,
  ArrowRight,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/auth-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { ROLE_LABELS, hasPermission } from '@/lib/permissions';
import { ThemeToggle } from './theme-toggle';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { UserAvatar } from '@/components/issue/user-avatar';
import { useNotifications } from '@/lib/use-notifications';
import { useNotificationsStore } from '@/lib/notifications-store';
import { initials, timeAgo } from '@/lib/utils';

export function GlobalTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectsStore((s) => s.projects);
  const issues = useIssuesStore((s) => s.issues);

  const { notifications, unreadCount } = useNotifications();
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);

  const [createOpen, setCreateOpen] = useState(false);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input') as HTMLInputElement | null;
        input?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!user) return null;

  const myAssigned = issues
    .filter((i) => i.assigneeId === user.id && i.status !== 'done')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const recentlyUpdated = [...issues]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const trimmed = search.trim().toLowerCase();
  const matchingIssues = trimmed
    ? issues.filter((i) =>
        i.summary.toLowerCase().includes(trimmed) ||
        i.key.toLowerCase().includes(trimmed),
      ).slice(0, 6)
    : [];
  const matchingProjects = trimmed
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.key.toLowerCase().includes(trimmed),
      ).slice(0, 4)
    : [];

  const isInProjectArea = pathname.startsWith('/projects');
  const isInProjectsList = pathname === '/projects';
  const isInIssues = pathname.startsWith('/issues');
  const isInTeams = pathname.startsWith('/people');
  const isInYourWork = pathname === '/';

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-1 border-b bg-[var(--topnav)] px-2 text-[var(--topnav-foreground)]">
        {/* App switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label="App switcher"
              >
                <AppWindow className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your apps
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">J</span>
              Jira
              <Badge variant="secondary" className="ml-auto text-[9px]">Active</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white">C</span>
              Confluence
              <Badge variant="outline" className="ml-auto text-[9px]">Soon</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
              <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-[10px] font-bold text-white">B</span>
              Bitbucket
              <Badge variant="outline" className="ml-auto text-[9px]">Soon</Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Workspace mark */}
        <Link href="/" className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#E31837] text-[10px] font-black text-white">
            FC
          </span>
          <span className="hidden text-sm font-semibold sm:inline">FE CREDIT</span>
        </Link>

        {/* Product nav (dropdown menus, like real Jira) */}
        <nav className="ml-1 hidden items-center md:flex">
          <NavMenu label="Your work" active={isInYourWork}>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Worked on
            </DropdownMenuLabel>
            {recentlyUpdated.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No recent activity</p>
            )}
            {recentlyUpdated.map((i) => (
              <DropdownMenuItem
                key={i.id}
                onClick={() => setOpenIssueId(i.id)}
                className="cursor-pointer"
              >
                <IssueTypeIcon type={i.type} />
                <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                <span className="flex-1 truncate text-xs">{i.summary}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(i.updatedAt)}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned to me
            </DropdownMenuLabel>
            {myAssigned.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Nothing assigned</p>
            ) : (
              myAssigned.slice(0, 3).map((i) => (
                <DropdownMenuItem key={i.id} onClick={() => setOpenIssueId(i.id)} className="cursor-pointer">
                  <IssueTypeIcon type={i.type} />
                  <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                  <span className="flex-1 truncate text-xs">{i.summary}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" render={<Link href="/" />}>
              <ArrowRight className="h-3.5 w-3.5" /> Go to Your work
            </DropdownMenuItem>
          </NavMenu>

          <NavMenu label="Projects" active={isInProjectArea}>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent projects
            </DropdownMenuLabel>
            {projects.slice(0, 6).map((p) => (
              <DropdownMenuItem
                key={p.id}
                className="cursor-pointer"
                render={<Link href={`/projects/${p.key}`} />}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                  {p.key.slice(0, 3)}
                </span>
                <span className="flex-1 truncate">{p.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" render={<Link href="/projects" />}>
              <FolderKanban className="h-3.5 w-3.5" /> View all projects
            </DropdownMenuItem>
          </NavMenu>

          <NavMenu label="Filters" active={isInIssues}>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saved filters
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/issues?assignee=me')}
            >
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              Assigned to me
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/issues?status=in-progress')}
            >
              <Clock className="h-3.5 w-3.5" />
              In progress
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/issues')}
            >
              <ListChecks className="h-3.5 w-3.5" />
              All issues
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" render={<Link href="/issues" />}>
              <FilterIcon className="h-3.5 w-3.5" /> Advanced search
            </DropdownMenuItem>
          </NavMenu>

          <NavLink href="/people" active={isInTeams && !isInProjectsList}>
            <Users className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Teams
          </NavLink>
        </nav>

        {/* Create button */}
        <Button
          size="sm"
          className="ml-2 cursor-pointer gap-1.5 px-3 text-sm font-medium"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Create
        </Button>

        {/* Search */}
        <div ref={searchRef} className="relative ml-auto flex w-full max-w-md items-center">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="global-search-input"
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            className="h-8 w-full rounded-md border bg-card pl-8 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            aria-label="Global search"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>

          {searchOpen && trimmed && (
            <div className="absolute left-0 right-0 top-10 z-50 max-h-[400px] overflow-auto rounded-md border bg-popover ds-shadow-overlay">
              {matchingIssues.length === 0 && matchingProjects.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No results for &quot;{search}&quot;
                </p>
              ) : (
                <div className="p-2">
                  {matchingProjects.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Projects
                      </p>
                      {matchingProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            router.push(`/projects/${p.key}`);
                            setSearch('');
                            setSearchOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                            {p.key}
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {matchingIssues.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Issues
                      </p>
                      {matchingIssues.map((i) => (
                        <button
                          key={i.id}
                          onClick={() => {
                            setOpenIssueId(i.id);
                            setSearch('');
                            setSearchOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted cursor-pointer"
                        >
                          <IssueTypeIcon type={i.type} />
                          <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                          <span className="flex-1 truncate text-sm">{i.summary}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-2 flex items-center gap-0.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                    onClick={() => markAllRead(user.id, notifications.map((n) => n.activity.id))}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="gap-2 cursor-default" disabled>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="flex-1 text-xs">You&apos;re all caught up</span>
                </DropdownMenuItem>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="cursor-pointer items-start gap-2 py-2"
                      onClick={() => {
                        markRead(user.id, n.activity.id);
                        setOpenIssueId(n.issue.id);
                      }}
                    >
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      {n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug">
                          <span className="text-muted-foreground">{n.activity.message}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <IssueTypeIcon type={n.issue.type} />
                          <span className="font-mono">{n.issue.key}</span>
                          <span className="truncate">{n.issue.summary}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(n.activity.createdAt)}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Settings"
            render={<Link href="/settings" />}
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: user.avatarColor }}
                  aria-label="Profile menu"
                >
                  {initials(user.name)}
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-1">
                  <UserAvatar
                    member={{
                      id: user.id, name: user.name, username: user.username,
                      email: user.email, avatarColor: user.avatarColor, title: user.title,
                    }}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" render={<Link href="/settings" />}>
                <SettingsIcon className="h-3.5 w-3.5" /> Settings
              </DropdownMenuItem>
              {hasPermission(user.role, 'audit.view') && (
                <DropdownMenuItem className="cursor-pointer" render={<Link href="/audit" />}>
                  <ScrollText className="h-3.5 w-3.5" /> Audit log
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setOpenIssueId(id)}
      />
      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </>
  );
}

function NavMenu({
  label, children, active,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={[
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer',
              active
                ? 'bg-accent font-semibold text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            {label}
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLink({
  href, children, active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-accent font-semibold text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

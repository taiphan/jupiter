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
  AppWindow,
  LogOut,
  CheckCircle2,
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
import { ROLE_LABELS } from '@/lib/permissions';
import { ThemeToggle } from './theme-toggle';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import { UserAvatar } from '@/components/issue/user-avatar';
import { initials } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Your work', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Filters', href: '/issues' },
  { label: 'Teams', href: '/people' },
];

export function GlobalTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectsStore((s) => s.projects);
  const issues = useIssuesStore((s) => s.issues);

  const [createOpen, setCreateOpen] = useState(false);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close the search dropdown on outside click
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

  // ⌘K / Ctrl+K to focus search
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const trimmed = search.trim().toLowerCase();
  const matchingIssues = trimmed
    ? issues
        .filter((i) =>
          i.summary.toLowerCase().includes(trimmed) ||
          i.key.toLowerCase().includes(trimmed),
        )
        .slice(0, 6)
    : [];
  const matchingProjects = trimmed
    ? projects
        .filter((p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.key.toLowerCase().includes(trimmed),
        )
        .slice(0, 4)
    : [];

  if (!user) return null;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-[var(--topnav)] px-3 text-[var(--topnav-foreground)]">
        {/* App switcher + workspace logo */}
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

        {/* Workspace name */}
        <Link href="/" className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#E31837] text-[10px] font-black text-white">
            FC
          </span>
          <span className="hidden text-sm font-semibold sm:inline">FE CREDIT</span>
        </Link>

        {/* Primary nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-accent font-semibold text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
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

        {/* Spacer + global search */}
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
                            setCreatedIssueId(i.id);
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
        <div className="ml-2 flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Help"
          >
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
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="flex-1 text-xs">All caught up</span>
              </DropdownMenuItem>
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

          {/* Profile menu */}
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
                  <UserAvatar member={{
                    id: user.id, name: user.name, username: user.username,
                    email: user.email, avatarColor: user.avatarColor, title: user.title,
                  }} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                render={<Link href="/settings" />}
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setCreatedIssueId(id)}
      />
      {/* When the user picks an issue from search, surface it. We embed the dialog at this level so it works app-wide. */}
      <IssueDialogPortal openId={createdIssueId} onClose={() => setCreatedIssueId(null)} />
    </>
  );
}

// Lazy-import the issue dialog to avoid a circular dep at module-eval time
import { IssueDialog } from '@/components/issue/issue-dialog';
function IssueDialogPortal({ openId, onClose }: { openId: string | null; onClose: () => void }) {
  return <IssueDialog issueId={openId} onClose={onClose} />;
}

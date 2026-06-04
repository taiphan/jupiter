'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Code2, ListFilter, CircleHelp, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueRow } from '@/components/issue/issue-row';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { parseJql, runJql, validateJql, type JqlContext } from '@/lib/jql';

function IssuesPageInner() {
  const issues = useIssuesStore((s) => s.issues);
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);
  const sprints = useSprintsStore((s) => s.sprints);
  const user = useAuthStore((s) => s.user);
  const params = useSearchParams();

  const [mode, setMode] = useState<'basic' | 'jql'>('basic');
  const [filters, setFilters] = useState<IssueFilters>(() => parseFiltersFromParams(params));
  const [jql, setJql] = useState('status != Done ORDER BY updated DESC');
  const [appliedJql, setAppliedJql] = useState('');
  const [jqlError, setJqlError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // Sync filters when navigating via nav links (e.g. Filters → Assigned to me)
  useEffect(() => {
    setFilters(parseFiltersFromParams(params));
  }, [params]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jupiter-jql-recent');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = hasPermission(user?.role, 'issues.create');

  const jqlContext: JqlContext = useMemo(() => ({
    currentUserId: user?.id,
    resolveUser: (token) => {
      const lower = token.toLowerCase();
      return members.find(
        (m) => m.name.toLowerCase() === lower || m.username.toLowerCase() === lower || m.id === token,
      )?.id;
    },
    resolveProject: (token) => {
      const lower = token.toLowerCase();
      return projects.find(
        (p) => p.key.toLowerCase() === lower || p.name.toLowerCase() === lower || p.id === token,
      )?.id;
    },
    resolveSprint: (token) => {
      const lower = token.toLowerCase();
      return sprints.find((s) => s.name.toLowerCase() === lower || s.id === token)?.id;
    },
  }), [user?.id, members, projects, sprints]);

  const filtered = useMemo(() => {
    if (mode === 'jql' && appliedJql) {
      try {
        const parsed = parseJql(appliedJql);
        return runJql(issues, parsed, jqlContext);
      } catch {
        return [];
      }
    }
    return applyFilters(issues, filters, user?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [mode, appliedJql, issues, filters, user?.id, jqlContext]);

  const runQuery = () => {
    const err = validateJql(jql);
    setJqlError(err);
    if (!err) {
      setAppliedJql(jql);
      const trimmed = jql.trim();
      if (trimmed) {
        setRecent((prev) => {
          const next = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, 6);
          try {
            localStorage.setItem('jupiter-jql-recent', JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    }
  };

  const EXAMPLES = [
    'assignee = currentUser() AND status != Done',
    'type = bug AND priority IN (high, highest)',
    'status = in-progress ORDER BY priority DESC',
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Filters"
        description="Search across the workspace"
        actions={
          canCreate ? (
            <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create issue
            </Button>
          ) : null
        }
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setMode('basic')}
                className={[
                  'flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                  mode === 'basic' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <ListFilter className="h-3.5 w-3.5" />
                Basic
              </button>
              <button
                type="button"
                onClick={() => setMode('jql')}
                className={[
                  'flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                  mode === 'jql' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <Code2 className="h-3.5 w-3.5" />
                JQL
              </button>
            </div>

            {mode === 'jql' && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label="JQL help">
                      <CircleHelp className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-96 p-3">
                  <p className="mb-2 text-xs font-semibold">JQL-lite reference</p>
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <p><strong className="text-foreground">Fields:</strong> project, type, status, priority, assignee, reporter, label, summary, sprint, storypoints, key</p>
                    <p><strong className="text-foreground">Operators:</strong> = != ~ !~ &gt; &lt; IN &quot;NOT IN&quot;</p>
                    <p><strong className="text-foreground">Logic:</strong> AND, OR, parentheses</p>
                    <p><strong className="text-foreground">Functions:</strong> currentUser(), unassigned, EMPTY</p>
                    <div className="mt-2 space-y-1 rounded bg-muted p-2 font-mono">
                      <p>status != Done AND assignee = currentUser()</p>
                      <p>project = WEB AND priority IN (high, highest)</p>
                      <p>summary ~ login ORDER BY created DESC</p>
                      <p>type = bug AND status != done</p>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {mode === 'basic' ? (
            <IssueFiltersBar filters={filters} onChange={setFilters} showProject />
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={jql}
                    onChange={(e) => {
                      setJql(e.target.value);
                      setJqlError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runQuery();
                    }}
                    placeholder='e.g. status != Done AND assignee = currentUser()'
                    className="pl-9 font-mono text-xs"
                    aria-label="JQL query"
                    spellCheck={false}
                  />
                </div>
                <Button className="cursor-pointer" onClick={runQuery}>Run</Button>
              </div>
              {jqlError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {jqlError}
                </div>
              )}

              {/* Example queries */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Examples:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setJql(ex);
                      setJqlError(null);
                    }}
                    className="rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Recent queries */}
              {recent.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Recent:</span>
                  {recent.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setJql(q);
                        setJqlError(null);
                        setAppliedJql(q);
                      }}
                      className="max-w-[260px] truncate rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                      title={q}
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setRecent([]);
                      try {
                        localStorage.removeItem('jupiter-jql-recent');
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="text-[10px] text-muted-foreground underline hover:text-foreground cursor-pointer"
                  >
                    clear
                  </button>
                </div>
              )}

              {!appliedJql && !jqlError && (
                <p className="text-[11px] text-muted-foreground">Press Run (or Enter) to execute your query.</p>
              )}
            </div>
          )}

          <Card>
            <CardContent className="p-3 space-y-1.5">
              {filtered.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  {mode === 'jql' && !appliedJql
                    ? 'Run a query to see results.'
                    : 'No issues match.'}
                </div>
              ) : (
                filtered.map((i) => (
                  <IssueRow key={i.id} issue={i} onClick={(it) => setOpenIssueId(it.id)} showProject />
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground">
            Showing {filtered.length} of {issues.length} issues
          </p>
        </div>
      </main>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setOpenIssueId(id)}
      />
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesPageInner />
    </Suspense>
  );
}

function parseFiltersFromParams(params: URLSearchParams): IssueFilters {
  const projectParam = params.get('project') ?? undefined;
  const assignee = params.get('assignee') as IssueFilters['assigneeId'] | null;
  const status = params.get('status') as IssueFilters['status'] | null;
  return {
    projectId: projectParam,
    assigneeId: assignee ?? undefined,
    status: status ?? undefined,
  };
}

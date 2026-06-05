'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import { UserAvatar } from '@/components/issue/user-avatar';
import type { ActivityKind } from '@/lib/types';
import type { AuditEntry } from '@/lib/audit-types';
import { timeAgo } from '@/lib/utils';
import { isWorkspaceOnline } from '@/lib/workspace-mode';
import { fetchAuditPage } from '@/lib/persistence-api';

const KIND_LABELS: Record<ActivityKind | 'all', string> = {
  all: 'All actions',
  created: 'Created',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  type: 'Type',
  summary: 'Summary',
  description: 'Description',
  label: 'Labels',
  parent: 'Parent',
  comment: 'Comment',
  'link-added': 'Link added',
  'link-removed': 'Link removed',
  watcher: 'Watchers',
};

const WS_KIND_LABELS: Record<string, string> = {
  'ws.sprint.started': 'Sprint started',
  'ws.sprint.completed': 'Sprint completed',
  'ws.sprint.created': 'Sprint created',
  'ws.project.created': 'Project created',
};

export default function AuditLogPage() {
  const localActivity = useIssuesStore((s) => s.activity);
  const issues = useIssuesStore((s) => s.issues);
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');

  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [apiEntries, setApiEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const useApi = isWorkspaceOnline();

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const issueById = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);

  const loadAudit = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!useApi) return;
      setLoading(true);
      const result = await fetchAuditPage({
        cursor: cursor ?? undefined,
        limit: 50,
        projectId: projectFilter === 'all' ? undefined : projectFilter,
        actorId: actorFilter === 'all' ? undefined : actorFilter,
        kind: kindFilter === 'all' ? undefined : kindFilter,
        search: search.trim() || undefined,
      });
      setLoading(false);
      if (result.mode !== 'ok') return;
      setApiEntries((prev) => (append ? [...prev, ...result.page.entries] : result.page.entries));
      setNextCursor(result.page.nextCursor);
    },
    [useApi, projectFilter, actorFilter, kindFilter, search],
  );

  useEffect(() => {
    if (useApi) {
      void loadAudit(null, false);
    } else {
      setApiEntries([]);
      setNextCursor(null);
    }
  }, [useApi, loadAudit]);

  const localFiltered = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return [...localActivity]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((a) => {
        const issue = issueById.get(a.issueId);
        if (projectFilter !== 'all' && issue?.projectId !== projectFilter) return false;
        if (actorFilter !== 'all' && a.actorId !== actorFilter) return false;
        if (kindFilter !== 'all' && a.kind !== kindFilter) return false;
        if (trimmed) {
          const haystack = [a.message, issue?.summary ?? '', issue?.key ?? ''].join(' ').toLowerCase();
          if (!haystack.includes(trimmed)) return false;
        }
        return true;
      })
      .slice(0, 200)
      .map(
        (a): AuditEntry => ({
          source: 'issue',
          id: a.id,
          issueId: a.issueId,
          actorId: a.actorId,
          kind: a.kind,
          message: a.message,
          createdAt: a.createdAt,
          issueKey: issueById.get(a.issueId)?.key ?? null,
          issueSummary: issueById.get(a.issueId)?.summary ?? null,
          projectId: issueById.get(a.issueId)?.projectId ?? null,
        }),
      );
  }, [localActivity, search, projectFilter, actorFilter, kindFilter, issueById]);

  const entries = useApi ? apiEntries : localFiltered;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Audit log"
        description={
          useApi
            ? `${entries.length.toLocaleString()}+ events (server-backed)`
            : `${localActivity.length.toLocaleString()} events across ${projects.length} projects`
        }
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search by message, issue key, or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && useApi) void loadAudit(null, false);
                }}
                className="pl-9"
                aria-label="Search audit log"
              />
            </div>

            <Select value={projectFilter} onValueChange={(v) => v && setProjectFilter(v)}>
              <SelectTrigger className="w-[160px]" aria-label="Project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actorFilter} onValueChange={(v) => v && setActorFilter(v)}>
              <SelectTrigger className="w-[180px]" aria-label="Actor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={kindFilter} onValueChange={(v) => v && setKindFilter(v)}>
              <SelectTrigger className="w-[180px]" aria-label="Action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(Object.entries(KIND_LABELS) as [string, string][])
                  .filter(([k]) => k !== 'all')
                  .map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                {useApi &&
                  Object.entries(WS_KIND_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {useApi && (
              <Button variant="secondary" size="sm" onClick={() => void loadAudit(null, false)}>
                Apply filters
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {entries.length === 0 && !loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No events match these filters.
                </div>
              ) : (
                <ul className="divide-y">
                  {entries.map((entry) => {
                    const actor = memberById.get(entry.actorId);
                    const project =
                      entry.source === 'issue'
                        ? projects.find((p) => p.id === entry.projectId)
                        : projects.find((p) => p.id === entry.projectId);
                    return (
                      <li key={`${entry.source}-${entry.id}`} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <UserAvatar member={actor} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-sm">
                              <span className="font-medium">{actor?.name ?? 'System'}</span>
                              <span className="text-muted-foreground">{entry.message.toLowerCase()}</span>
                              {entry.source === 'issue' && (
                                <>
                                  <span className="text-muted-foreground">on</span>
                                  {entry.issueKey ? (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-primary transition-colors hover:bg-accent cursor-pointer"
                                      onClick={() => setOpenIssueId(entry.issueId)}
                                    >
                                      <IssueTypeIcon
                                        type={issueById.get(entry.issueId)?.type ?? 'task'}
                                      />
                                      <span className="font-mono text-xs">{entry.issueKey}</span>
                                      <span className="truncate">{entry.issueSummary}</span>
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground italic">[deleted issue]</span>
                                  )}
                                </>
                              )}
                              {entry.source === 'workspace' && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  workspace
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {timeAgo(entry.createdAt)} · {new Date(entry.createdAt).toLocaleString()}
                              {project && ` · ${project.key}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {loading && (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              )}
            </CardContent>
          </Card>

          {useApi && nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => void loadAudit(nextCursor, true)}
              >
                Load more
              </Button>
            </div>
          )}

          {!useApi && localFiltered.length >= 200 && (
            <p className="text-center text-[11px] text-muted-foreground">
              Showing the most recent 200 matching events (connect Postgres for full pagination)
            </p>
          )}
        </div>
      </main>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}

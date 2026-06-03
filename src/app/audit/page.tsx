'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { timeAgo } from '@/lib/utils';

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
};

export default function AuditLogPage() {
  const issues = useIssuesStore((s) => s.issues);
  const activity = useIssuesStore((s) => s.activity);
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<ActivityKind | 'all'>('all');

  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const issueById = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const filtered = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return [...activity]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((a) => {
        const issue = issueById.get(a.issueId);
        if (projectFilter !== 'all' && issue?.projectId !== projectFilter) return false;
        if (actorFilter !== 'all' && a.actorId !== actorFilter) return false;
        if (kindFilter !== 'all' && a.kind !== kindFilter) return false;
        if (trimmed) {
          const haystack = [
            a.message,
            issue?.summary ?? '',
            issue?.key ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(trimmed)) return false;
        }
        return true;
      });
  }, [activity, search, projectFilter, actorFilter, kindFilter, issueById]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Audit log"
        description={`${activity.length.toLocaleString()} events across ${projects.length} projects`}
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Filters */}
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

            <Select
              value={kindFilter}
              onValueChange={(v) => v && setKindFilter(v as ActivityKind | 'all')}
            >
              <SelectTrigger className="w-[160px]" aria-label="Action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(KIND_LABELS) as [ActivityKind | 'all', string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No events match these filters.
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.slice(0, 200).map((entry) => {
                    const issue = issueById.get(entry.issueId);
                    const actor = memberById.get(entry.actorId);
                    const project = issue ? projects.find((p) => p.id === issue.projectId) : undefined;
                    return (
                      <li key={entry.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <UserAvatar member={actor} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-sm">
                              <span className="font-medium">{actor?.name ?? 'System'}</span>
                              <span className="text-muted-foreground">{entry.message.toLowerCase()}</span>
                              <span className="text-muted-foreground">on</span>
                              {issue ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-primary transition-colors hover:bg-accent cursor-pointer"
                                  onClick={() => setOpenIssueId(issue.id)}
                                >
                                  <IssueTypeIcon type={issue.type} />
                                  <span className="font-mono text-xs">{issue.key}</span>
                                  <span className="truncate">{issue.summary}</span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground italic">[deleted issue]</span>
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
            </CardContent>
          </Card>

          {filtered.length > 200 && (
            <p className="text-center text-[11px] text-muted-foreground">
              Showing the most recent 200 of {filtered.length} matching events
            </p>
          )}
        </div>
      </main>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import {
  STATUSES, STATUS_LABELS, ISSUE_TYPES, ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS,
} from '@/lib/types';
import type { IssueStatus } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import { UserAvatar } from '@/components/issue/user-avatar';
import { IssueTypeIcon } from '@/components/issue/issue-icon';

const STATUS_COLOR: Record<IssueStatus, string> = {
  backlog: '#94A3B8',
  todo: '#64748B',
  'in-progress': '#0C66E4',
  'in-review': '#F59E0B',
  done: '#1F845A',
};

export function SummaryView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const members = useProjectsStore((s) => s.members);
  const allIssues = useIssuesStore((s) => s.issues);
  const allActivity = useIssuesStore((s) => s.activity);

  const issues = useMemo(
    () => (project ? allIssues.filter((i) => i.projectId === project.id) : []),
    [allIssues, project],
  );

  const stats = useMemo(() => {
    const total = issues.length;
    const done = issues.filter((i) => i.status === 'done').length;
    const inProgress = issues.filter((i) => i.status === 'in-progress').length;
    const completedPercent = total ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, completedPercent };
  }, [issues]);

  const statusBreakdown = useMemo(
    () => STATUSES.map((s) => ({
      name: STATUS_LABELS[s],
      value: issues.filter((i) => i.status === s).length,
      fill: STATUS_COLOR[s],
    })).filter((d) => d.value > 0),
    [issues],
  );

  const typeBreakdown = useMemo(
    () => ISSUE_TYPES.map((t) => ({
      name: ISSUE_TYPE_LABELS[t],
      value: issues.filter((i) => i.type === t).length,
      fill: ISSUE_TYPE_COLORS[t],
    })).filter((d) => d.value > 0),
    [issues],
  );

  const teamWorkload = useMemo(() => {
    if (!project) return [];
    return project.memberIds
      .map((id) => {
        const member = members.find((m) => m.id === id);
        if (!member) return null;
        const assigned = issues.filter((i) => i.assigneeId === id);
        const open = assigned.filter((i) => i.status !== 'done').length;
        return { member, total: assigned.length, open };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.open - a.open);
  }, [project, members, issues]);

  const recentActivity = useMemo(() => {
    if (!project) return [];
    const issueIds = new Set(issues.map((i) => i.id));
    return allActivity
      .filter((a) => issueIds.has(a.issueId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  }, [project, issues, allActivity]);

  if (!project) return null;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total issues" value={stats.total} />
        <StatCard label="In progress" value={stats.inProgress} accent="text-primary" />
        <StatCard label="Completed" value={stats.done} accent="text-emerald-600" />
        <StatCard label="% complete" value={`${stats.completedPercent}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status overview</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Issues by current status</p>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <Empty>No issues yet</Empty>
            ) : (
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="h-44">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {statusBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {statusBreakdown.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.fill }} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Types of work</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Distribution by issue type</p>
          </CardHeader>
          <CardContent>
            {typeBreakdown.length === 0 ? (
              <Empty>No issues yet</Empty>
            ) : (
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={typeBreakdown} layout="vertical" margin={{ left: 10, right: 12 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                    <RTooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {typeBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Team workload</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Open issues per member</p>
          </CardHeader>
          <CardContent>
            {teamWorkload.length === 0 ? (
              <Empty>No members yet</Empty>
            ) : (
              <ul className="space-y-2">
                {teamWorkload.map(({ member, open, total }) => (
                  <li key={member.id} className="flex items-center gap-3">
                    <UserAvatar member={member} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground">{open} open · {total} total</p>
                    </div>
                    <Badge variant={open > 5 ? 'default' : 'secondary'}>{open}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest changes in this project</p>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <Empty>No activity yet</Empty>
            ) : (
              <ul className="space-y-2.5">
                {recentActivity.map((a) => {
                  const issue = issues.find((i) => i.id === a.issueId);
                  const actor = members.find((m) => m.id === a.actorId);
                  if (!issue) return null;
                  return (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <UserAvatar member={actor} size="sm" />
                      <div className="min-w-0 flex-1 text-xs">
                        <p>
                          <span className="font-medium text-foreground">{actor?.name ?? 'Someone'}</span>{' '}
                          <span className="text-muted-foreground">{a.message.toLowerCase()}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                          <IssueTypeIcon type={issue.type} />
                          <span className="font-mono">{issue.key}</span>
                          <span className="truncate">{issue.summary}</span>
                          <span>·</span>
                          <span>{timeAgo(a.createdAt)}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold leading-none ${accent ?? ''}`}>{value}</p>
        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">{children}</div>
  );
}

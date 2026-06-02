'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { formatDate } from '@/lib/utils';

export function ReportsView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const allIssues = useIssuesStore((s) => s.issues);
  const sprintsByProject = useSprintsStore(
    (s) => (project ? s.getSprintsByProject(project.id) : []),
  );

  const issues = useMemo(
    () => (project ? allIssues.filter((i) => i.projectId === project.id) : []),
    [allIssues, project],
  );

  // Velocity: for each completed sprint, compute committed vs completed story points
  const velocity = useMemo(
    () =>
      sprintsByProject
        .filter((s) => s.state === 'completed')
        .map((s) => {
          const inSprint = issues.filter((i) => i.sprintId === s.id);
          const committed = inSprint.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          const completed = inSprint
            .filter((i) => i.status === 'done')
            .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          return {
            name: s.name.replace(`${project!.key} `, ''),
            committed,
            completed,
            issues: inSprint.length,
            done: inSprint.filter((i) => i.status === 'done').length,
            sprint: s,
          };
        }),
    [sprintsByProject, issues, project],
  );

  const avgVelocity = velocity.length > 0
    ? Math.round(velocity.reduce((sum, v) => sum + v.completed, 0) / velocity.length)
    : 0;

  // Active sprint burndown
  const activeSprint = sprintsByProject.find((s) => s.state === 'active');
  const burndown = useMemo(() => {
    if (!activeSprint || !activeSprint.startDate || !activeSprint.endDate) return null;

    const inSprint = issues.filter((i) => i.sprintId === activeSprint.id);
    const totalPoints = inSprint.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const today = new Date();
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Build a daily axis from start → end
    const points: { date: string; ideal: number; remaining: number | null; label: string }[] = [];
    for (let d = 0; d <= totalDays; d++) {
      const cur = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
      const ideal = Math.max(0, totalPoints - (totalPoints * d) / totalDays);
      const isPastOrToday = cur <= today;

      // Approximate "remaining" by using the issue's updatedAt as the burn-down event
      let remaining: number | null = null;
      if (isPastOrToday) {
        const burnt = inSprint
          .filter((i) => i.status === 'done' && new Date(i.updatedAt) <= cur)
          .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
        remaining = Math.max(0, totalPoints - burnt);
      }

      points.push({
        date: cur.toISOString().slice(0, 10),
        label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ideal: Math.round(ideal * 10) / 10,
        remaining,
      });
    }

    return { totalPoints, points, totalDays };
  }, [activeSprint, issues]);

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Velocity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Velocity</CardTitle>
              <CardDescription className="text-xs">
                Story points committed vs completed across the last {velocity.length} sprints
              </CardDescription>
            </div>
            {velocity.length > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                Avg {avgVelocity} pts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {velocity.length === 0 ? (
            <Empty>No completed sprints yet — finish a sprint to see velocity here.</Empty>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={velocity} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="committed" name="Committed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#0C66E4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {velocity.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {velocity.slice(-4).map((v) => (
                <div key={v.sprint.id} className="rounded-md border p-3">
                  <p className="text-xs font-semibold">{v.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {v.completed} / {v.committed} pts · {v.done} of {v.issues} done
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Burndown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Burndown</CardTitle>
              <CardDescription className="text-xs">
                {activeSprint
                  ? `Story points remaining in ${activeSprint.name}`
                  : 'No active sprint right now'}
              </CardDescription>
            </div>
            {activeSprint && (
              <Badge variant="default" className="text-[10px]">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!burndown ? (
            <Empty>Start a sprint to see its burndown chart.</Empty>
          ) : (
            <>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={burndown.points} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <RTooltip
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      name="Ideal"
                      stroke="#94A3B8"
                      strokeDasharray="5 4"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="remaining"
                      name="Remaining"
                      stroke="#0C66E4"
                      dot={{ r: 3 }}
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Total" value={`${burndown.totalPoints} pts`} />
                <Stat label="Sprint length" value={`${burndown.totalDays} days`} />
                <Stat
                  label="Period"
                  value={`${formatDate(activeSprint!.startDate!)} – ${formatDate(activeSprint!.endDate!)}`}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cumulative flow lite — issue counts by status across statuses. Uses bars stacked by status. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issue distribution</CardTitle>
          <CardDescription className="text-xs">
            Count of issues by status — a quick read on where work is piling up
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <Empty>No issues yet</Empty>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(['backlog', 'todo', 'in-progress', 'in-review', 'done'] as const).map((s) => {
                const count = issues.filter((i) => i.status === s).length;
                return (
                  <div key={s} className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.replace('-', ' ')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
      {children}
    </div>
  );
}

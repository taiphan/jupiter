'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { formatDate } from '@/lib/utils';
import { STATUSES, STATUS_DEFAULTS } from '@/lib/types';
import type { IssueStatus } from '@/lib/types';
import { burndownAriaLabel, type BurndownPoint } from './burndown-a11y';
import {
  computeVelocityRolling,
  selectVelocityWindow,
  VELOCITY_HINT_NEEDS_MORE_SPRINTS,
  VELOCITY_ROLLING_WINDOW,
} from './velocity-rolling';
import { computeVelocityRows } from '@/lib/derive/report-metrics';
import { downloadCsv, velocityToCsv } from '@/lib/export/csv';

export function ReportsView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const allIssues = useIssuesStore((s) => s.issues);
  const sprintsByProject = useSprintsStore(
    (s) => (project ? s.getSprintsByProject(project.id) : []),
  );
  const [showBurndownTable, setShowBurndownTable] = useState(false);

  const issues = useMemo(
    () => (project ? allIssues.filter((i) => i.projectId === project.id) : []),
    [allIssues, project],
  );

  // Velocity: for each completed sprint, compute committed vs completed story points
  const velocity = useMemo(
    () => (project ? computeVelocityRows(sprintsByProject, issues, project.key) : []),
    [sprintsByProject, issues, project],
  );

  // Rolling-average reference line over the last three completed sprints (Req 2.8).
  // Falls back to a "needs more sprints" hint when fewer than three exist (Req 2.9).
  const velocityWindow = useMemo(() => selectVelocityWindow(velocity), [velocity]);
  const velocitySummary = useMemo(
    () => computeVelocityRolling(velocityWindow.map((v) => v.completed)),
    [velocityWindow],
  );

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
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 text-xs"
          onClick={() => {
            if (!project) return;
            downloadCsv(
              `${project.key}-velocity`,
              velocityToCsv(velocity),
            );
          }}
          disabled={velocity.length === 0}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export velocity CSV
        </Button>
      </div>
      {/* Velocity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Velocity</CardTitle>
              <CardDescription className="text-xs">
                {velocityWindow.length === 0
                  ? `Story points completed across the last ${VELOCITY_ROLLING_WINDOW} sprints`
                  : `Story points committed vs completed across the last ${velocityWindow.length} of ${velocity.length} completed sprints`}
              </CardDescription>
            </div>
            {velocitySummary.rollingAverage !== null && (
              <Badge variant="secondary" className="font-mono text-xs">
                Avg {velocitySummary.rollingAverage} pts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {velocityWindow.length === 0 ? (
            <Empty>No completed sprints yet — finish a sprint to see velocity here.</Empty>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={velocityWindow} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
                  {velocitySummary.rollingAverage !== null && (
                    <ReferenceLine
                      y={velocitySummary.rollingAverage}
                      stroke="#0C66E4"
                      strokeDasharray="4 4"
                      ifOverflow="extendDomain"
                      label={{
                        value: `Avg ${velocitySummary.rollingAverage}`,
                        position: 'right',
                        fill: '#0C66E4',
                        fontSize: 10,
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {velocitySummary.needsMoreSprints && (
            <p
              role="note"
              className="mt-3 rounded-md border border-dashed bg-muted/40 p-2 text-[11px] text-muted-foreground"
            >
              {VELOCITY_HINT_NEEDS_MORE_SPRINTS}
            </p>
          )}
          {velocityWindow.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {velocityWindow.map((v) => (
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
            <div className="flex items-center gap-2">
              {burndown && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-pressed={showBurndownTable}
                  onClick={() => setShowBurndownTable((v) => !v)}
                >
                  {showBurndownTable ? 'Show chart' : 'Show data table'}
                </Button>
              )}
              {activeSprint && (
                <Badge variant="default" className="text-[10px]">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!burndown ? (
            <Empty>Start a sprint to see its burndown chart.</Empty>
          ) : (
            <>
              {showBurndownTable ? (
                <BurndownTable
                  points={burndown.points}
                  sprintName={activeSprint!.name}
                />
              ) : (
                <div
                  className="h-72"
                  role="img"
                  aria-label={burndownAriaLabel(activeSprint!.name, burndown)}
                >
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
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 4"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining"
                        name="Remaining"
                        stroke="var(--chart-1)"
                        dot={{ r: 3 }}
                        strokeWidth={2}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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

      {/* Cumulative Flow Diagram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cumulative flow</CardTitle>
          <CardDescription className="text-xs">
            How work has accumulated across statuses over the last 30 days. Approximated from each issue&apos;s
            current state — useful for spotting WIP bloat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <Empty>No issues yet</Empty>
          ) : (
            <CfdChart issues={issues} />
          )}
        </CardContent>
      </Card>

      {/* Cumulative Flow legacy distribution */}
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

const CFD_STACK: IssueStatus[] = ['done', 'in-review', 'in-progress', 'todo', 'backlog'];

function CfdChart({ issues }: { issues: { id: string; status: IssueStatus; createdAt: string; updatedAt: string }[] }) {
  const data = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const points: Array<{ label: string; date: string } & Record<IssueStatus, number>> = [];

    for (let d = days; d >= 0; d--) {
      const cur = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      const cutoff = cur.getTime() + 24 * 60 * 60 * 1000 - 1; // end of that day

      // For each issue, count it under its current status only if it was created by `cur`,
      // and treat its current status as effective from `updatedAt` onward; for earlier days,
      // approximate it as `todo` (a reasonable default for demo data).
      const counts: Record<IssueStatus, number> = {
        backlog: 0, todo: 0, 'in-progress': 0, 'in-review': 0, done: 0,
      };
      for (const i of issues) {
        const created = new Date(i.createdAt).getTime();
        if (created > cutoff) continue;
        const updated = new Date(i.updatedAt).getTime();
        const effectiveStatus: IssueStatus =
          updated <= cutoff ? i.status : 'todo';
        counts[effectiveStatus] += 1;
      }

      points.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: cur.toISOString().slice(0, 10),
        ...counts,
      });
    }

    return points;
  }, [issues]);

  return (
    <div className="h-72">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
            interval={Math.ceil(data.length / 8)} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <RTooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {CFD_STACK.map((s) => (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              name={STATUSES.includes(s) ? s.replace('-', ' ') : s}
              stackId="cfd"
              stroke={STATUS_DEFAULTS[s].color}
              fill={STATUS_DEFAULTS[s].color}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
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

function BurndownTable({
  points,
  sprintName,
}: {
  points: BurndownPoint[];
  sprintName: string;
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <Table>
        <TableCaption className="sr-only">
          Daily burndown data for {sprintName}: ideal vs remaining story points per day.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Day</TableHead>
            <TableHead scope="col" className="text-right">Ideal (pts)</TableHead>
            <TableHead scope="col" className="text-right">Remaining (pts)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((p) => (
            <TableRow key={p.date}>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">{p.date}</span>
                <span className="ml-2">{p.label}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.ideal}</TableCell>
              <TableCell className="text-right tabular-nums">
                {p.remaining === null ? <span className="text-muted-foreground">—</span> : p.remaining}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

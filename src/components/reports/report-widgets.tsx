'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATUSES, STATUS_DEFAULTS } from '@/lib/types';
import type { Issue, Sprint } from '@/lib/types';
import {
  CFD_STACK,
  computeBurndown,
  computeCfdPoints,
  computeVelocityRows,
  type BurndownSeries,
  type VelocityRow,
} from '@/lib/derive/report-metrics';
import { burndownAriaLabel } from '@/app/projects/[key]/reports/burndown-a11y';
import {
  computeVelocityRolling,
  selectVelocityWindow,
  VELOCITY_HINT_NEEDS_MORE_SPRINTS,
} from '@/app/projects/[key]/reports/velocity-rolling';
import { formatDate } from '@/lib/utils';

export function VelocityWidget({
  projectKey,
  sprints,
  issues,
  compact = false,
}: {
  projectKey: string;
  sprints: Sprint[];
  issues: Issue[];
  compact?: boolean;
}) {
  const velocity = useMemo(
    () => computeVelocityRows(sprints, issues, projectKey),
    [sprints, issues, projectKey],
  );
  const velocityWindow = useMemo(() => selectVelocityWindow(velocity), [velocity]);
  const velocitySummary = useMemo(
    () => computeVelocityRolling(velocityWindow.map((v) => v.completed)),
    [velocityWindow],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={compact ? 'text-sm' : 'text-base'}>Velocity</CardTitle>
            <CardDescription className="text-xs">
              Story points across completed sprints
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
          <WidgetEmpty>No completed sprints yet.</WidgetEmpty>
        ) : (
          <div className={compact ? 'h-56' : 'h-72'}>
            <ResponsiveContainer>
              <BarChart data={velocityWindow} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
                <Bar dataKey="committed" name="Committed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#0C66E4" radius={[4, 4, 0, 0]} />
                {velocitySummary.rollingAverage !== null && (
                  <ReferenceLine
                    y={velocitySummary.rollingAverage}
                    stroke="#0C66E4"
                    strokeDasharray="4 4"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {velocitySummary.needsMoreSprints && (
          <p className="mt-2 text-[11px] text-muted-foreground">{VELOCITY_HINT_NEEDS_MORE_SPRINTS}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function BurndownWidget({
  activeSprint,
  issues,
  compact = false,
}: {
  activeSprint: Sprint | undefined;
  issues: Issue[];
  compact?: boolean;
}) {
  const burndown = useMemo(
    () => computeBurndown(activeSprint, issues),
    [activeSprint, issues],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={compact ? 'text-sm' : 'text-base'}>Burndown</CardTitle>
            <CardDescription className="text-xs">
              {activeSprint
                ? `Remaining points in ${activeSprint.name}`
                : 'No active sprint'}
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
        {!burndown || !activeSprint ? (
          <WidgetEmpty>Start a sprint to see burndown.</WidgetEmpty>
        ) : (
          <>
            <div
              className={compact ? 'h-56' : 'h-72'}
              role="img"
              aria-label={burndownAriaLabel(activeSprint.name, burndown)}
            >
              <ResponsiveContainer>
                <LineChart data={burndown.points} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
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
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-md border p-2">
                <p className="font-semibold">{burndown.totalPoints} pts</p>
                <p className="text-muted-foreground">Total</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold">{burndown.totalDays} days</p>
                <p className="text-muted-foreground">Length</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold truncate">
                  {formatDate(activeSprint.startDate!)} – {formatDate(activeSprint.endDate!)}
                </p>
                <p className="text-muted-foreground">Period</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CfdWidget({
  issues,
  compact = false,
}: {
  issues: Issue[];
  compact?: boolean;
}) {
  const data = useMemo(() => computeCfdPoints(issues), [issues]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={compact ? 'text-sm' : 'text-base'}>Cumulative flow</CardTitle>
        <CardDescription className="text-xs">Status accumulation over 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <WidgetEmpty>No issues yet.</WidgetEmpty>
        ) : (
          <div className={compact ? 'h-56' : 'h-72'}>
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.ceil(data.length / 8)}
                />
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
        )}
      </CardContent>
    </Card>
  );
}

function WidgetEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export type { VelocityRow, BurndownSeries };

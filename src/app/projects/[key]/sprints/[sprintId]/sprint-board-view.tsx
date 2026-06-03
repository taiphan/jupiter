'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Lock, Pencil, Play,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend,
  ResponsiveContainer, Tooltip as RTooltip,
} from 'recharts';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { SPRINT_STATE_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { KanbanBoard } from '@/components/board/kanban-board';
import {
  StartSprintDialog,
  CompleteSprintDialog,
  RenameSprintDialog,
} from '@/components/sprint/sprint-dialogs';
import {
  burndownAriaLabel,
  type BurndownPoint,
} from '../../reports/burndown-a11y';
import { computeSprintBurndown } from './sprint-burndown';

interface SprintBoardViewProps {
  projectKey: string;
  sprintId: string;
}

type TabValue = 'board' | 'report';

export function SprintBoardView({ projectKey, sprintId }: SprintBoardViewProps) {
  const router = useRouter();
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const sprint = useSprintsStore((s) => s.getSprintById(sprintId));
  const sprintsByProject = useSprintsStore((s) =>
    project ? s.getSprintsByProject(project.id) : [],
  );
  const startSprintAction = useSprintsStore((s) => s.startSprint);
  const completeSprintAction = useSprintsStore((s) => s.completeSprint);
  const updateSprint = useSprintsStore((s) => s.updateSprint);

  const allIssues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<TabValue>('board');
  const [showStart, setShowStart] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showRename, setShowRename] = useState(false);

  // Issues that belong to this sprint, used for action dialogs and the report tab.
  const sprintIssues = useMemo(() => {
    if (!sprint) return [];
    return allIssues.filter((i) => i.sprintId === sprint.id);
  }, [allIssues, sprint]);

  const completedCount = sprintIssues.filter((i) => i.status === 'done').length;
  const incompleteCount = sprintIssues.length - completedCount;

  const otherSprints = useMemo(
    () =>
      sprint
        ? sprintsByProject.filter((s) => s.id !== sprint.id && s.state !== 'completed')
        : [],
    [sprint, sprintsByProject],
  );

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <Button variant="outline" size="sm" render={<Link href="/projects" />}>
            Back to projects
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!sprint) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Sprint not found in {project.key}.</p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/projects/${project.key}/backlog`} />}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to backlog
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Per Req 1.7, completed sprints render read-only — no add / remove / reassign.
  const isCompleted = sprint.state === 'completed';
  const isActive = sprint.state === 'active';
  const isPlanned = sprint.state === 'planned';
  const canManage = hasPermission(user?.role, 'projects.edit');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/projects/${project.key}/backlog`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Backlog
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{sprint.name}</h2>
            <Badge
              variant={isActive ? 'default' : isCompleted ? 'outline' : 'secondary'}
              className="text-[10px] capitalize"
            >
              {SPRINT_STATE_LABELS[sprint.state]}
            </Badge>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden="true" /> Read-only
              </span>
            )}
          </div>
          {sprint.goal && (
            <p className="max-w-2xl text-xs text-muted-foreground">{sprint.goal}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {sprint.startDate && sprint.endDate
              ? `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`
              : 'Dates not set'}
            <span className="mx-1.5">·</span>
            {sprintIssues.length} {sprintIssues.length === 1 ? 'issue' : 'issues'}
            <span className="mx-1.5">·</span>
            {completedCount} done
          </p>
        </div>

        {/* Sprint actions — role-gated per Req 1.6 */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManage && isPlanned && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowStart(true)}
              disabled={sprintIssues.length === 0}
            >
              <Play className="h-3 w-3" /> Start sprint
            </Button>
          )}
          {canManage && isActive && (
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowComplete(true)}
            >
              <CheckCircle2 className="h-3 w-3" /> Complete sprint
            </Button>
          )}
          {canManage && !isCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowRename(true)}
            >
              <Pencil className="h-3 w-3" /> Rename
            </Button>
          )}
        </div>
      </div>

      {/* Board / Report tab toggle */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList aria-label="Sprint view">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {sprintIssues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm font-medium">No issues in this sprint yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Add issues from the backlog to plan {sprint.name}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/projects/${project.key}/backlog`} />}
                >
                  Open backlog
                </Button>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard
              projectId={project.id}
              sprintId={sprint.id}
              readOnly={isCompleted}
            />
          )}
        </TabsContent>

        <TabsContent value="report">
          <SprintReportPanel
            sprint={sprint}
            issues={sprintIssues}
          />
        </TabsContent>
      </Tabs>

      {/* Action dialogs */}
      <StartSprintDialog
        open={showStart}
        onClose={() => setShowStart(false)}
        sprint={sprint}
        issueCount={sprintIssues.length}
        onStart={(range) => {
          startSprintAction(sprint.id, range);
          setShowStart(false);
        }}
      />
      <CompleteSprintDialog
        open={showComplete}
        onClose={() => setShowComplete(false)}
        sprint={sprint}
        completed={completedCount}
        incomplete={incompleteCount}
        otherSprints={otherSprints}
        onComplete={(opts) => {
          completeSprintAction(sprint.id, opts);
          setShowComplete(false);
          // After completion the board switches to read-only; surface the report
          // so the user lands somewhere useful rather than a frozen kanban.
          setTab('report');
          router.refresh();
        }}
      />
      <RenameSprintDialog
        open={showRename}
        onClose={() => setShowRename(false)}
        sprint={sprint}
        onRename={(next) => {
          updateSprint(sprint.id, next);
          setShowRename(false);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint-scoped report panel
// ─────────────────────────────────────────────────────────────────────────────

interface SprintReportPanelProps {
  sprint: ReturnType<typeof useSprintsStore.getState>['sprints'][number];
  issues: ReturnType<typeof useIssuesStore.getState>['issues'];
}

function SprintReportPanel({ sprint, issues }: SprintReportPanelProps) {
  const [showTable, setShowTable] = useState(false);

  // Per Req 2.5, future sprints don't render a chart at all.
  if (sprint.state === 'planned') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Burndown is available once the sprint starts.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sprint.startDate || !sprint.endDate) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            This sprint has no start or end date set.
          </div>
        </CardContent>
      </Card>
    );
  }

  const burndown = computeSprintBurndown({
    startIso: sprint.startDate,
    endIso: sprint.endDate,
    // Per Req 2.6, completed sprints freeze data at completedAt.
    asOf: sprint.state === 'completed' && sprint.completedAt
      ? new Date(sprint.completedAt)
      : new Date(),
    issues,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Burndown</CardTitle>
              <CardDescription className="text-xs">
                Story points remaining across {burndown.totalDays} days of {sprint.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-pressed={showTable}
                onClick={() => setShowTable((v) => !v)}
              >
                {showTable ? 'Show chart' : 'Show data table'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showTable ? (
            <BurndownTable points={burndown.points} sprintName={sprint.name} />
          ) : (
            <div
              className="h-72"
              role="img"
              aria-label={burndownAriaLabel(sprint.name, burndown)}
            >
              <ResponsiveContainer>
                <LineChart
                  data={burndown.points}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
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
              value={`${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`}
            />
          </div>
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

function BurndownTable({
  points, sprintName,
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

'use client';

import { useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssueLinksStore } from '@/lib/issue-links-store';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import type { Issue } from '@/lib/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROW_H = 36;
const LABEL_W = 260;

type Zoom = 'week' | 'month' | 'quarter';
const ZOOM_DAY_WIDTH: Record<Zoom, number> = {
  week: 40,    // 40 px per day → ~7 cols visible
  month: 14,   // 14 px per day → ~30 cols visible
  quarter: 6,  // 6 px per day  → ~90 cols visible
};
const ZOOM_LABELS: Record<Zoom, string> = { week: 'Week', month: 'Month', quarter: 'Quarter' };
const ZOOM_SEQUENCE: Zoom[] = ['week', 'month', 'quarter'];

// ─── Date helpers ────────────────────────────────────────────────────────────

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
function parseDay(s: string | undefined): Date | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms);
}
function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// ─── Time-grid header ────────────────────────────────────────────────────────

function buildHeaderUnits(start: Date, days: number, zoom: Zoom): Array<{ label: string; span: number }> {
  const units: Array<{ label: string; span: number }> = [];
  let cursor = new Date(start);
  let remaining = days;

  if (zoom === 'week') {
    // Day labels
    while (remaining > 0) {
      units.push({ label: cursor.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }), span: 1 });
      cursor = addDays(cursor, 1);
      remaining--;
    }
  } else if (zoom === 'month') {
    // Week labels (Mon–Sun)
    while (remaining > 0) {
      const span = Math.min(7, remaining);
      const label = cursor.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      units.push({ label, span });
      cursor = addDays(cursor, span);
      remaining -= span;
    }
  } else {
    // Month labels
    while (remaining > 0) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth();
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const dayOfMonth = cursor.getUTCDate();
      const span = Math.min(daysInMonth - dayOfMonth + 1, remaining);
      units.push({ label: cursor.toLocaleDateString('en', { month: 'short', year: '2-digit' }), span });
      cursor = addDays(cursor, span);
      remaining -= span;
    }
  }
  return units;
}

// ─── Bar geometry ────────────────────────────────────────────────────────────

interface BarGeom {
  left: number;
  width: number;
  isPlaceholder: boolean;
}

function computeBar(
  issue: Issue,
  viewStart: Date,
  dayW: number,
  totalDays: number,
): BarGeom | null {
  const start = parseDay(issue.startDate) ?? parseDay(issue.createdAt.slice(0, 10));
  const end = parseDay(issue.dueDate);
  if (!start) return null;

  const dayOffset = diffDays(viewStart, start);
  const isPlaceholder = !end;
  const durationDays = end ? Math.max(1, diffDays(start, end)) : 2;

  if (dayOffset + durationDays < 0) return null;
  if (dayOffset > totalDays) return null;

  return {
    left: dayOffset * dayW,
    width: durationDays * dayW,
    isPlaceholder,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

interface TimelineViewProps {
  projectKey: string;
}

export function TimelineView({ projectKey }: TimelineViewProps) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const allIssues = useIssuesStore((s) => s.issues);
  const links = useIssueLinksStore((s) => s.links);

  const [zoom, setZoom] = useState<Zoom>('month');
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const dayW = ZOOM_DAY_WIDTH[zoom];

  const projectIssues = useMemo(
    () => (project ? allIssues.filter((i) => i.projectId === project.id) : []),
    [allIssues, project],
  );

  // Build hierarchical rows: epics → children (stories/tasks/bugs) → subtasks
  const rows = useMemo(() => {
    const epics = projectIssues.filter((i) => i.type === 'epic');
    const nonEpics = projectIssues.filter(
      (i) => i.type !== 'epic' && !i.parentId,
    );
    const result: Array<{ issue: Issue; depth: number }> = [];

    for (const epic of epics) {
      result.push({ issue: epic, depth: 0 });
      if (!collapsed.has(epic.id)) {
        const children = projectIssues.filter((i) => i.parentId === epic.id);
        for (const child of children) {
          result.push({ issue: child, depth: 1 });
          if (!collapsed.has(child.id)) {
            const subtasks = projectIssues.filter((i) => i.parentId === child.id);
            for (const sub of subtasks) {
              result.push({ issue: sub, depth: 2 });
            }
          }
        }
      }
    }
    for (const issue of nonEpics) {
      result.push({ issue, depth: 0 });
    }
    return result;
  }, [projectIssues, collapsed]);

  // Compute view range: earliest date → latest date + padding
  const { viewStart, totalDays } = useMemo(() => {
    let earliest: Date | null = null;
    let latest: Date | null = null;
    for (const { issue } of rows) {
      const s = parseDay(issue.startDate) ?? parseDay(issue.createdAt.slice(0, 10));
      const e = parseDay(issue.dueDate);
      if (s && (!earliest || s < earliest)) earliest = s;
      if (e && (!latest || e > latest)) latest = e;
    }
    const today = utcToday();
    const start = earliest ? addDays(earliest, -7) : addDays(today, -14);
    const end = latest ? addDays(latest, 14) : addDays(today, 60);
    return { viewStart: start, totalDays: Math.max(90, diffDays(start, end)) };
  }, [rows]);

  const totalW = totalDays * dayW;
  const todayOffset = diffDays(viewStart, utcToday());
  const headerUnits = useMemo(
    () => buildHeaderUnits(viewStart, totalDays, zoom),
    [viewStart, totalDays, zoom],
  );

  // Blocks dependency links within this project
  const blockLinks = useMemo(
    () =>
      links.filter(
        (l) =>
          l.type === 'blocks' &&
          projectIssues.some((i) => i.id === l.fromIssueId) &&
          projectIssues.some((i) => i.id === l.toIssueId),
      ),
    [links, projectIssues],
  );

  const rowIndex = useMemo(
    () => new Map(rows.map(({ issue }, idx) => [issue.id, idx])),
    [rows],
  );

  if (!project) return null;

  const zoomIn = () => {
    const idx = ZOOM_SEQUENCE.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_SEQUENCE[idx - 1]);
  };
  const zoomOut = () => {
    const idx = ZOOM_SEQUENCE.indexOf(zoom);
    if (idx < ZOOM_SEQUENCE.length - 1) setZoom(ZOOM_SEQUENCE[idx + 1]);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalH = rows.length * ROW_H;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-semibold">Timeline</span>
        <span className="text-xs text-muted-foreground">{project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">{ZOOM_LABELS[zoom]}</span>
          <Button variant="outline" size="icon-xs" className="cursor-pointer h-7 w-7" onClick={zoomIn} disabled={zoom === 'week'} aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon-xs" className="cursor-pointer h-7 w-7" onClick={zoomOut} disabled={zoom === 'quarter'} aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Label column */}
        <div
          className="shrink-0 overflow-y-auto border-r"
          style={{ width: LABEL_W }}
        >
          {/* Header spacer */}
          <div className="border-b bg-muted/40" style={{ height: ROW_H }} />
          {rows.map(({ issue, depth }) => {
            const hasChildren = projectIssues.some((i) => i.parentId === issue.id);
            const isCollapsed = collapsed.has(issue.id);
            return (
              <div
                key={issue.id}
                className={cn(
                  'flex items-center gap-1.5 border-b px-2 text-xs hover:bg-muted/50 cursor-pointer select-none',
                  'group',
                )}
                style={{ height: ROW_H, paddingLeft: 8 + depth * 16 }}
                onClick={() => setOpenIssueId(issue.id)}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(issue.id); }}
                    className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <IssueTypeIcon type={issue.type} />
                <span className="font-mono text-[10px] text-primary shrink-0">{issue.key}</span>
                <span className="flex-1 truncate">{issue.summary}</span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Gantt area */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <div style={{ width: totalW, minWidth: totalW }}>
            {/* Time header */}
            <div
              className="sticky top-0 z-10 flex border-b bg-background"
              style={{ height: ROW_H }}
            >
              {headerUnits.map((u, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r px-1 text-[10px] text-muted-foreground flex items-center overflow-hidden"
                  style={{ width: u.span * dayW }}
                >
                  <span className="truncate">{u.label}</span>
                </div>
              ))}
            </div>

            {/* Rows + bars */}
            <div className="relative" style={{ height: totalH }}>
              {/* Vertical day grid lines */}
              {Array.from({ length: Math.ceil(totalDays / (zoom === 'week' ? 1 : zoom === 'month' ? 7 : 30)) }, (_, i) => {
                const step = zoom === 'week' ? 1 : zoom === 'month' ? 7 : 30;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-border/30"
                    style={{ left: i * step * dayW }}
                  />
                );
              })}

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: todayOffset * dayW }}
                >
                  <div className="absolute top-0 left-0.5 text-[9px] font-semibold text-red-500 whitespace-nowrap bg-background px-0.5 rounded-sm">
                    Today
                  </div>
                </div>
              )}

              {/* Horizontal row lines */}
              {rows.map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-b border-border/20"
                  style={{ top: (i + 1) * ROW_H - 1 }}
                />
              ))}

              {/* Issue bars */}
              {rows.map(({ issue }, rowIdx) => {
                const geom = computeBar(issue, viewStart, dayW, totalDays);
                if (!geom) return null;

                const statusColour = STATUS_COLORS[issue.status];
                const top = rowIdx * ROW_H + 6;
                const height = ROW_H - 12;

                return (
                  <div
                    key={issue.id}
                    title={`${issue.key}: ${issue.summary}${issue.startDate ? `\nStart: ${issue.startDate}` : ''}${issue.dueDate ? `\nDue: ${issue.dueDate}` : ''}`}
                    onClick={() => setOpenIssueId(issue.id)}
                    className={cn(
                      'absolute rounded cursor-pointer select-none overflow-hidden flex items-center px-1.5 text-[10px] font-medium transition-opacity hover:opacity-80',
                      statusColour,
                      geom.isPlaceholder && 'opacity-50 border border-dashed',
                    )}
                    style={{
                      top,
                      left: geom.left,
                      width: Math.max(geom.width, 8),
                      height,
                    }}
                  >
                    <span className="truncate text-white drop-shadow-sm">{issue.key}</span>
                  </div>
                );
              })}

              {/* Dependency arrows (SVG overlay) */}
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ width: totalW, height: totalH }}
              >
                {blockLinks.map((link) => {
                  const fromIdx = rowIndex.get(link.fromIssueId);
                  const toIdx = rowIndex.get(link.toIssueId);
                  if (fromIdx === undefined || toIdx === undefined) return null;

                  const fromIssue = rows[fromIdx]?.issue;
                  const toIssue = rows[toIdx]?.issue;
                  if (!fromIssue || !toIssue) return null;

                  const fromGeom = computeBar(fromIssue, viewStart, dayW, totalDays);
                  const toGeom = computeBar(toIssue, viewStart, dayW, totalDays);
                  if (!fromGeom || !toGeom) return null;

                  const x1 = fromGeom.left + fromGeom.width;
                  const y1 = fromIdx * ROW_H + ROW_H / 2;
                  const x2 = toGeom.left;
                  const y2 = toIdx * ROW_H + ROW_H / 2;
                  const cx = (x1 + x2) / 2;

                  return (
                    <g key={link.id}>
                      <path
                        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        opacity={0.7}
                      />
                      <polygon
                        points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
                        fill="hsl(var(--destructive))"
                        opacity={0.7}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No issues in this project yet.
        </div>
      )}

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}

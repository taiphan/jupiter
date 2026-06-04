'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Issue, IssueType } from '@/lib/types';
import { ISSUE_TYPE_COLORS } from '@/lib/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarViewProps {
  projectKey: string;
  issues: Issue[];
  canEdit: boolean;
  onOpenIssue: (issue: Issue) => void;
  onCreateOnDate: (date: string) => void;
  onMoveDueDate: (issueId: string, dueDate: string) => void;
}

function monthMatrix(year: number, month: number): Array<{ date: string | null; day: number | null }> {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < first.getDay(); i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= last.getDate(); d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ date: `${year}-${mm}-${dd}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

export function CalendarView({
  projectKey, issues, canEdit, onOpenIssue, onCreateOnDate, onMoveDueDate,
}: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date(2026, 5, 1));
  const [dragId, setDragId] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const matrix = useMemo(() => monthMatrix(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (!issue.dueDate) continue;
      const list = map.get(issue.dueDate) ?? [];
      list.push(issue);
      map.set(issue.dueDate, list);
    }
    return map;
  }, [issues]);

  const missingDue = issues.filter((i) => !i.dueDate && i.status !== 'done').length;

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[160px] text-center text-sm font-semibold">{monthLabel}</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {missingDue > 0 && (
          <Link
            href={`/projects/${projectKey}/list`}
            className="text-xs text-primary hover:underline"
          >
            {missingDue} issues without due dates
          </Link>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-md border bg-border overflow-hidden">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted/50 px-2 py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">
            {d}
          </div>
        ))}
        {matrix.map((cell, i) => {
          const dayIssues = cell.date ? byDate.get(cell.date) ?? [] : [];
          return (
            <div
              key={i}
              className={cn(
                'min-h-[88px] bg-card p-1.5',
                !cell.date && 'bg-muted/20',
              )}
              onDragOver={(e) => canEdit && cell.date && e.preventDefault()}
              onDrop={(e) => {
                if (!canEdit || !cell.date || !dragId) return;
                e.preventDefault();
                onMoveDueDate(dragId, cell.date);
                setDragId(null);
              }}
            >
              {cell.day && (
                <>
                  <button
                    type="button"
                    className="mb-1 text-[11px] font-medium text-muted-foreground hover:text-primary cursor-pointer"
                    onClick={() => cell.date && canEdit && onCreateOnDate(cell.date)}
                  >
                    {cell.day}
                  </button>
                  <div className="space-y-0.5">
                    {dayIssues.slice(0, 3).map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        draggable={canEdit}
                        onDragStart={() => setDragId(issue.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpenIssue(issue)}
                        className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] hover:bg-muted cursor-pointer"
                        style={{ borderLeft: `2px solid ${ISSUE_TYPE_COLORS[issue.type as IssueType]}` }}
                      >
                        <span className="font-mono shrink-0">{issue.key}</span>
                        <span className="truncate">{issue.summary}</span>
                      </button>
                    ))}
                    {dayIssues.length > 3 && (
                      <p className="text-[9px] text-muted-foreground">+{dayIssues.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { ListTree, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { canTransition as isWorkflowTransitionAllowed, getAllowedTargets } from '@/lib/workflow-transitions';
import { IssueTypeIcon } from './issue-icon';
import {
  STATUSES, STATUS_LABELS, STATUS_COLORS,
} from '@/lib/types';
import type { IssueStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IssueSubtasksPanelProps {
  /** Parent issue id — we list its direct children here. */
  parentId: string;
  projectId: string;
  canCreate: boolean;
  canTransition: boolean;
  /** Called when the user clicks a subtask row. */
  onOpenSubtask: (id: string) => void;
}

export function IssueSubtasksPanel({
  parentId, projectId, canCreate, canTransition, onOpenSubtask,
}: IssueSubtasksPanelProps) {
  const issues = useIssuesStore((s) => s.issues);
  const createIssue = useIssuesStore((s) => s.createIssue);
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const project = useProjectsStore((s) => s.getProject(projectId));
  const user = useAuthStore((s) => s.user);

  const [adding, setAdding] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const subtasks = issues.filter((i) => i.parentId === parentId);
  const done = subtasks.filter((i) => i.status === 'done').length;
  const progress = subtasks.length > 0 ? Math.round((done / subtasks.length) * 100) : 0;

  const handleCreate = () => {
    const summary = newSummary.trim();
    if (!summary || !user) return;
    createIssue({
      projectId,
      type: 'subtask',
      summary,
      status: 'todo',
      priority: 'medium',
      reporterId: user.id,
      parentId,
    });
    setNewSummary('');
    // Keep the add form open for rapid entry
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setAdding(false); setNewSummary(''); }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
          Subtasks
          {subtasks.length > 0 && (
            <span className="ml-0.5 font-normal">
              ({done}/{subtasks.length})
            </span>
          )}
        </button>
        {canCreate && !adding && (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add subtask
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && !collapsed && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{progress}%</span>
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
          <IssueTypeIcon type="subtask" />
          <Input
            ref={inputRef}
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Subtask summary…"
            className="h-7 flex-1 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0 p-0"
          />
          <Button size="xs" className="cursor-pointer" onClick={handleCreate} disabled={!newSummary.trim()}>
            Save
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="cursor-pointer h-6 w-6"
            onClick={() => { setAdding(false); setNewSummary(''); }}
            aria-label="Cancel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Subtask list */}
      {!collapsed && subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.sort((a, b) => a.rank - b.rank).map((sub) => (
            <li key={sub.id} className="group flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs hover:bg-muted/50">
              <IssueTypeIcon type={sub.type} />
              <button
                type="button"
                onClick={() => onOpenSubtask(sub.id)}
                className="flex-1 truncate text-left cursor-pointer hover:underline"
              >
                <span className="font-mono text-primary mr-1.5">{sub.key}</span>
                <span className={cn(sub.status === 'done' && 'line-through text-muted-foreground')}>
                  {sub.summary}
                </span>
              </button>
              {canTransition ? (
                <Select
                  value={sub.status}
                  onValueChange={(v) => {
                    if (!v || !user) return;
                    const next = v as IssueStatus;
                    if (!isWorkflowTransitionAllowed(user.role, sub.status, next, project)) return;
                    updateIssue(sub.id, { status: next }, user.id);
                  }}
                >
                  <SelectTrigger
                    className="h-5 w-auto min-w-[90px] border-0 p-0 shadow-none ring-0 text-[10px] hover:bg-muted focus:ring-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge className={cn(STATUS_COLORS[sub.status], 'border-0 text-[10px] cursor-pointer')}>
                      {STATUS_LABELS[sub.status]}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter(
                      (s) => s === sub.status || getAllowedTargets(user!.role, sub.status, project).includes(s),
                    ).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={cn(STATUS_COLORS[sub.status], 'border-0 text-[10px]')}>
                  {STATUS_LABELS[sub.status]}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      {!collapsed && subtasks.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">No subtasks</p>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Issue, Sprint } from '@/lib/types';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueRow } from '@/components/issue/issue-row';
import { formatDate } from '@/lib/utils';

interface SprintSectionProps {
  sprint?: Sprint; // undefined → backlog
  issues: Issue[];
  onCreate?: () => void;
  onOpenIssue: (id: string) => void;
}

export function SprintSection({ sprint, issues, onCreate, onOpenIssue }: SprintSectionProps) {
  const [open, setOpen] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const startSprint = useSprintsStore((s) => s.startSprint);
  const completeSprint = useSprintsStore((s) => s.completeSprint);
  const deleteSprint = useSprintsStore((s) => s.deleteSprint);
  const removeIssueFromSprint = useSprintsStore((s) => s.removeIssueFromSprint);
  const addIssueToSprint = useSprintsStore((s) => s.addIssueToSprint);
  const projectSprints = useSprintsStore((s) =>
    sprint ? s.getSprintsByProject(sprint.projectId) : [],
  );
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const user = useAuthStore((s) => s.user);

  const canManage = hasPermission(user?.role, 'projects.edit');
  const canEditIssues = hasPermission(user?.role, 'issues.edit');

  const completedCount = issues.filter((i) => i.status === 'done').length;
  const inProgressCount = issues.filter((i) => i.status === 'in-progress' || i.status === 'in-review').length;
  const todoCount = issues.length - completedCount - inProgressCount;
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  const otherSprints = sprint
    ? projectSprints.filter((s) => s.id !== sprint.id && s.state !== 'completed')
    : [];

  // Headline & state-specific elements
  const isBacklog = !sprint;
  const isPlanned = sprint?.state === 'planned';
  const isActive = sprint?.state === 'active';
  const isCompleted = sprint?.state === 'completed';

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
        >
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {isBacklog ? 'Backlog' : sprint!.name}
        </button>

        {sprint && (
          <Badge
            variant={isActive ? 'default' : isCompleted ? 'outline' : 'secondary'}
            className="text-[10px] capitalize"
          >
            {sprint.state}
          </Badge>
        )}

        {sprint?.startDate && sprint?.endDate && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
          </span>
        )}

        <span className="ml-2 text-[11px] text-muted-foreground">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Status pill counts */}
          {issues.length > 0 && !isBacklog && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                {todoCount}
              </span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                {inProgressCount}
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {completedCount}
              </span>
            </div>
          )}

          {totalPoints > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {totalPoints} pts
            </span>
          )}

          {canManage && isPlanned && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowStart(true)}
              disabled={issues.length === 0}
            >
              <Play className="h-3 w-3" />
              Start sprint
            </Button>
          )}
          {canManage && isActive && (
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowComplete(true)}
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete sprint
            </Button>
          )}

          {canManage && sprint && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    aria-label="Sprint actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${sprint.name}? Issues will return to the backlog.`)) {
                      deleteSprint(sprint.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-1 p-2">
          {issues.length === 0 ? (
            <div className="flex h-12 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
              {isBacklog ? 'No backlog items' : 'No issues yet — drag from the backlog'}
            </div>
          ) : (
            issues.map((i) => (
              <div key={i.id} className="group flex items-center gap-2">
                <div className="flex-1">
                  <IssueRow issue={i} onClick={(it) => onOpenIssue(it.id)} />
                </div>
                {canEditIssues && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Issue actions"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="text-xs">
                      {!isBacklog && (
                        <>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => removeIssueFromSprint(i.id)}
                          >
                            Move to backlog
                          </DropdownMenuItem>
                          {otherSprints.length > 0 && <DropdownMenuSeparator />}
                          {otherSprints.map((s) => (
                            <DropdownMenuItem
                              key={s.id}
                              className="cursor-pointer"
                              onClick={() => addIssueToSprint(i.id, s.id)}
                            >
                              Move to {s.name}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      {isBacklog && otherSprints.length > 0 && projectSprints.filter((s) => s.state !== 'completed').length > 0 && (
                        <>
                          {projectSprints
                            .filter((s) => s.state !== 'completed')
                            .map((s) => (
                              <DropdownMenuItem
                                key={s.id}
                                className="cursor-pointer"
                                onClick={() => addIssueToSprint(i.id, s.id)}
                              >
                                Move to {s.name}
                              </DropdownMenuItem>
                            ))}
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          updateIssue(
                            i.id,
                            { status: i.status === 'done' ? 'todo' : 'done' },
                            user!.id,
                          )
                        }
                      >
                        Toggle done
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}

          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Create
            </button>
          )}
        </div>
      )}

      {/* Start sprint dialog */}
      {sprint && (
        <StartSprintDialog
          open={showStart}
          onClose={() => setShowStart(false)}
          sprint={sprint}
          issueCount={issues.length}
          onStart={(range) => {
            startSprint(sprint.id, range);
            setShowStart(false);
          }}
        />
      )}

      {/* Complete sprint dialog */}
      {sprint && (
        <CompleteSprintDialog
          open={showComplete}
          onClose={() => setShowComplete(false)}
          sprint={sprint}
          completed={completedCount}
          incomplete={issues.length - completedCount}
          otherSprints={otherSprints}
          onComplete={(opts) => {
            completeSprint(sprint.id, opts);
            setShowComplete(false);
          }}
        />
      )}
    </div>
  );
}

function StartSprintDialog({
  open, onClose, sprint, issueCount, onStart,
}: {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  issueCount: number;
  onStart: (range: { startDate: string; endDate: string }) => void;
}) {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? '');
  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [start, setStart] = useState(today.toISOString().slice(0, 10));
  const [end, setEnd] = useState(inTwoWeeks.toISOString().slice(0, 10));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start sprint</DialogTitle>
          <DialogDescription>
            {issueCount} {issueCount === 1 ? 'issue' : 'issues'} will be included in this sprint.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Sprint name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Sprint goal">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="What does success look like for this sprint?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button
            className="cursor-pointer"
            onClick={() => {
              onStart({
                startDate: new Date(start).toISOString(),
                endDate: new Date(end).toISOString(),
              });
            }}
          >
            Start sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteSprintDialog({
  open, onClose, sprint, completed, incomplete, otherSprints, onComplete,
}: {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  completed: number;
  incomplete: number;
  otherSprints: Sprint[];
  onComplete: (opts: { moveIncompleteToSprintId?: string }) => void;
}) {
  const [target, setTarget] = useState<string>('backlog');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete {sprint.name}</DialogTitle>
          <DialogDescription>
            {completed} {completed === 1 ? 'issue is' : 'issues are'} done.{' '}
            {incomplete} {incomplete === 1 ? 'issue is' : 'issues are'} still in flight.
          </DialogDescription>
        </DialogHeader>

        {incomplete > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Move incomplete issues to:</p>
            <div className="space-y-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 hover:bg-muted">
                <input
                  type="radio"
                  name="move-target"
                  checked={target === 'backlog'}
                  onChange={() => setTarget('backlog')}
                />
                <span className="text-sm">Backlog</span>
              </label>
              {otherSprints.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 hover:bg-muted"
                >
                  <input
                    type="radio"
                    name="move-target"
                    checked={target === s.id}
                    onChange={() => setTarget(s.id)}
                  />
                  <span className="text-sm">{s.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] capitalize">
                    {s.state}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button
            className="cursor-pointer"
            onClick={() =>
              onComplete({
                moveIncompleteToSprintId: target === 'backlog' ? undefined : target,
              })
            }
          >
            Complete sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium">{label}</div>
      {children}
    </div>
  );
}

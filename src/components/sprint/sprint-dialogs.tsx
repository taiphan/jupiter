'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Sprint } from '@/lib/types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium">{label}</div>
      {children}
    </div>
  );
}

export function StartSprintDialog({
  open, onClose, sprint, issueCount, onStart,
}: {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  issueCount: number;
  onStart: (range: { startDate: string; endDate: string }) => void;
}) {
  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [start, setStart] = useState(today.toISOString().slice(0, 10));
  const [end, setEnd] = useState(inTwoWeeks.toISOString().slice(0, 10));

  // Reset dates when dialog (re-)opens so stale picks don't survive.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form state when the dialog re-opens
    setStart(today.toISOString().slice(0, 10));
    setEnd(inTwoWeeks.toISOString().slice(0, 10));
    // We intentionally only re-run this effect when `open` flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start {sprint.name}</DialogTitle>
          <DialogDescription>
            {issueCount} {issueCount === 1 ? 'issue' : 'issues'} will be included in this sprint.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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

export function CompleteSprintDialog({
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset target when the dialog re-opens
    if (open) setTarget('backlog');
  }, [open]);

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

export function RenameSprintDialog({
  open, onClose, sprint, onRename,
}: {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  onRename: (next: { name: string; goal?: string }) => void;
}) {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form state when the dialog re-opens
    setName(sprint.name);
    setGoal(sprint.goal ?? '');
    setError('');
  }, [open, sprint]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Sprint name is required');
      return;
    }
    onRename({ name: trimmed, goal: goal.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename sprint</DialogTitle>
          <DialogDescription>Update the sprint name and optional goal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Field label="Sprint name">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </Field>
          <Field label="Sprint goal">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="What does success look like for this sprint?"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button className="cursor-pointer" onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

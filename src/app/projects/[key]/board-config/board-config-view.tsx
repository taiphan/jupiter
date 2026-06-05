'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Save } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { STATUS_LABELS, STATUS_DEFAULTS } from '@/lib/types';
import type { IssueStatus, Project } from '@/lib/types';
import { getWorkflow } from '@/lib/workflow';
import { TransitionRulesEditor } from '@/components/workflow/transition-rules-editor';
import { cn } from '@/lib/utils';

const COLOR_OPTIONS = [
  '#94A3B8', // slate
  '#64748B', // gray
  '#0C66E4', // blue (Jira)
  '#1F845A', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#A855F7', // purple
  '#EC4899', // pink
  '#0891B2', // teal
];

interface DraftColumn {
  status: IssueStatus;
  label: string;
  color: string;
  showOnBoard: boolean;
}

export function BoardConfigView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const user = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState<DraftColumn[]>([]);

  // Load workflow into draft when project changes
  useEffect(() => {
    if (!project) return;
    const wf = getWorkflow(project);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state when project id changes
    setDraft(
      wf.map((c) => ({
        status: c.status,
        label: c.label,
        color: c.color,
        showOnBoard: c.showOnBoard,
      })),
    );
  }, [project?.id, project?.statusOverrides]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  const canEdit = hasPermission(user?.role, 'projects.edit');

  const move = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return d;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const update = (idx: number, patch: Partial<DraftColumn>) => {
    setDraft((d) => d.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const isDirty = (() => {
    const wf = getWorkflow(project);
    if (wf.length !== draft.length) return true;
    return draft.some((d, i) => {
      const c = wf[i];
      return c.status !== d.status || c.label !== d.label || c.color !== d.color || c.showOnBoard !== d.showOnBoard;
    });
  })();

  const handleSave = () => {
    const overrides: Partial<NonNullable<Project['statusOverrides']>> = {};
    draft.forEach((d, i) => {
      const baseDef = STATUS_DEFAULTS[d.status];
      // Only persist a column override if any field differs from the default
      const labelChanged = d.label !== baseDef.label;
      const colorChanged = d.color !== baseDef.color;
      const visibilityChanged = d.showOnBoard !== baseDef.showOnBoard;
      const orderChanged = i !== baseDef.order;
      if (labelChanged || colorChanged || visibilityChanged || orderChanged) {
        overrides[d.status] = {
          ...(labelChanged ? { label: d.label } : {}),
          ...(colorChanged ? { color: d.color } : {}),
          ...(visibilityChanged ? { showOnBoard: d.showOnBoard } : {}),
          ...(orderChanged ? { order: i } : {}),
        };
      }
    });
    updateProject(project.id, {
      statusOverrides: Object.keys(overrides).length > 0 ? (overrides as Project['statusOverrides']) : undefined,
    });
  };

  const handleReset = () => {
    if (!confirm('Reset workflow to defaults? Custom labels, colors, and ordering will be lost.')) return;
    updateProject(project.id, { statusOverrides: undefined });
  };

  const visibleCount = draft.filter((c) => c.showOnBoard).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow & board layout</CardTitle>
          <CardDescription>
            Customize column labels, colors, and board visibility for this project. Changes apply
            to the Board, Backlog, and Reports views.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {visibleCount} {visibleCount === 1 ? 'column' : 'columns'} visible on the board ·
            drag-free reorder with the arrow buttons · color &amp; label changes apply globally to
            this project
          </div>

          <ol className="space-y-2">
            {draft.map((col, idx) => (
              <li
                key={col.status}
                className={cn(
                  'rounded-md border p-3 transition-colors',
                  col.showOnBoard ? 'bg-card' : 'bg-muted/30',
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={idx === 0 || !canEdit}
                      onClick={() => move(idx, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={idx === draft.length - 1 || !canEdit}
                      onClick={() => move(idx, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: col.color }}
                    aria-hidden="true"
                  />

                  <Input
                    value={col.label}
                    onChange={(e) => update(idx, { label: e.target.value })}
                    className="h-8 w-44 text-sm"
                    disabled={!canEdit}
                    aria-label={`Label for ${STATUS_LABELS[col.status]}`}
                  />

                  <code className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                    {col.status}
                  </code>

                  {col.showOnBoard ? (
                    <Badge variant="secondary" className="text-[10px]">On board</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto cursor-pointer gap-1.5"
                    onClick={() => update(idx, { showOnBoard: !col.showOnBoard })}
                    disabled={!canEdit}
                  >
                    {col.showOnBoard ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Show
                      </>
                    )}
                  </Button>
                </div>

                {/* Color picker */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Color:</span>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update(idx, { color: c })}
                      disabled={!canEdit}
                      className={cn(
                        'h-5 w-5 rounded-full ring-2 transition-shadow',
                        col.color === c
                          ? 'ring-foreground'
                          : 'ring-transparent hover:ring-foreground/30',
                        !canEdit && 'cursor-not-allowed opacity-60',
                        canEdit && 'cursor-pointer',
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Set color to ${c}`}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>

          {canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="ghost"
                className="cursor-pointer gap-1.5"
                onClick={handleReset}
                disabled={!project.statusOverrides}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to defaults
              </Button>
              <Button
                className="cursor-pointer gap-1.5"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save className="h-3.5 w-3.5" />
                Save workflow
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transition rules</CardTitle>
          <CardDescription>
            Role-based rules for moving issues between statuses. Enforced on the board and in issue details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransitionRulesEditor
            project={project}
            canEdit={canEdit}
            onSave={(rules) => updateProject(project.id, { transitionRules: rules })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

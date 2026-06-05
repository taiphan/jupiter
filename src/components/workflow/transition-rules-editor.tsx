'use client';

import { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/lib/auth-store';
import { ROLE_LABELS } from '@/lib/permissions';
import { STATUS_LABELS, STATUSES } from '@/lib/types';
import type { IssueStatus, Project, TransitionRules } from '@/lib/types';
import {
  buildDefaultTransitionRules,
  resolveTransitionRules,
} from '@/lib/workflow-transitions';
import { cn } from '@/lib/utils';

const ROLES: UserRole[] = ['admin', 'lead', 'member', 'viewer'];

function cloneRules(rules: TransitionRules): TransitionRules {
  const defaults = buildDefaultTransitionRules();
  const out = {} as TransitionRules;
  for (const role of ROLES) {
    const roleRules = rules[role] ?? defaults[role]!;
    out[role] = Object.fromEntries(
      STATUSES.map((from) => [from, [...(roleRules[from] ?? [])]]),
    ) as TransitionRules[UserRole];
  }
  return out;
}

function rulesEqual(a: TransitionRules, b: TransitionRules): boolean {
  return ROLES.every((role) =>
    STATUSES.every((from) => {
      const aa = [...(a[role]?.[from] ?? [])].sort().join(',');
      const bb = [...(b[role]?.[from] ?? [])].sort().join(',');
      return aa === bb;
    }),
  );
}

interface TransitionRulesEditorProps {
  project: Project;
  canEdit: boolean;
  onSave: (rules: TransitionRules | undefined) => void;
}

export function TransitionRulesEditor(props: TransitionRulesEditorProps) {
  const resetKey = `${props.project.id}:${JSON.stringify(props.project.transitionRules ?? null)}`;
  return <TransitionRulesEditorInner key={resetKey} {...props} />;
}

function TransitionRulesEditorInner({ project, canEdit, onSave }: TransitionRulesEditorProps) {
  const saved = useMemo(() => cloneRules(resolveTransitionRules(project)), [project]);
  const [draft, setDraft] = useState(() => cloneRules(saved));
  const [role, setRole] = useState<UserRole>('member');

  const isDirty = !rulesEqual(draft, saved);
  const isDefault = rulesEqual(draft, buildDefaultTransitionRules());

  const toggle = (from: IssueStatus, to: IssueStatus) => {
    if (from === to) return;
    setDraft((prev) => {
      const next = cloneRules(prev);
      const targets = new Set(next[role]![from] ?? []);
      if (targets.has(to)) targets.delete(to);
      else targets.add(to);
      next[role]![from] = [...targets];
      return next;
    });
  };

  const setRow = (from: IssueStatus, allowed: boolean) => {
    setDraft((prev) => {
      const next = cloneRules(prev);
      next[role]![from] = allowed
        ? STATUSES.filter((s) => s !== from)
        : [];
      return next;
    });
  };

  const handleSave = () => {
    onSave(isDefault ? undefined : draft);
  };

  const handleReset = () => {
    setDraft(cloneRules(buildDefaultTransitionRules()));
  };

  const roleRules = draft[role]!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Edit rules for</span>
        <Select value={role} onValueChange={(v) => v && setRole(v as UserRole)}>
          <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Check cells to allow moving from row status → column status.
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 px-2 py-2 text-left font-medium text-muted-foreground">
                From ↓ / To →
              </th>
              {STATUSES.map((to) => (
                <th key={to} className="px-1 py-2 text-center font-medium text-muted-foreground">
                  {STATUS_LABELS[to]}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-muted-foreground">All</th>
            </tr>
          </thead>
          <tbody>
            {STATUSES.map((from) => {
              const targets = new Set(roleRules[from] ?? []);
              const offDiag = STATUSES.filter((s) => s !== from);
              const allOn = offDiag.every((t) => targets.has(t));
              const noneOn = offDiag.every((t) => !targets.has(t));

              return (
                <tr key={from} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium whitespace-nowrap">
                    {STATUS_LABELS[from]}
                  </td>
                  {STATUSES.map((to) => {
                    const isSelf = from === to;
                    const checked = isSelf || targets.has(to);
                    return (
                      <td key={to} className="px-1 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit || isSelf}
                          onChange={() => toggle(from, to)}
                          aria-label={
                            isSelf
                              ? `${STATUS_LABELS[from]} stays unchanged`
                              : `Allow ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`
                          }
                          className={cn(
                            'h-3.5 w-3.5 cursor-pointer accent-primary',
                            isSelf && 'opacity-40 cursor-not-allowed',
                            !canEdit && 'cursor-not-allowed opacity-60',
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    {canEdit && (
                      <div className="flex justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] cursor-pointer"
                          disabled={allOn}
                          onClick={() => setRow(from, true)}
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] cursor-pointer"
                          disabled={noneOn}
                          onClick={() => setRow(from, false)}
                        >
                          None
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save className="h-3.5 w-3.5" />
            Save transition rules
          </Button>
        </div>
      )}
    </div>
  );
}

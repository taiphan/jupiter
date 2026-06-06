'use client';

import { useState } from 'react';
import { Plus, Trash2, Repeat, Zap } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProjectsStore } from '@/lib/projects-store';
import { useAutomationStore } from '@/lib/automation-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_UNASSIGNED,
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
} from '@/lib/types';
import type {
  AutomationAction,
  AutomationActionType,
  AutomationRule,
  AutomationTrigger,
  AutomationTriggerType,
  IssueStatus,
  IssueType,
  Priority,
} from '@/lib/types';

export function AutomationView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const members = useProjectsStore((s) => s.members);
  const rules = useAutomationStore((s) =>
    project ? s.getRulesForProject(project.id) : [],
  );
  const createRule = useAutomationStore((s) => s.createRule);
  const deleteRule = useAutomationStore((s) => s.deleteRule);
  const toggleRule = useAutomationStore((s) => s.toggleRule);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('status_changed');
  const [issueType, setIssueType] = useState<IssueType | 'any'>('any');
  const [fromStatus, setFromStatus] = useState<IssueStatus | 'any'>('any');
  const [toStatus, setToStatus] = useState<IssueStatus | 'any'>('done');
  const [fromAssignee, setFromAssignee] = useState<string>('__any');
  const [toAssignee, setToAssignee] = useState<string>('__any');
  const [fromPriority, setFromPriority] = useState<Priority | 'any'>('any');
  const [toPriority, setToPriority] = useState<Priority | 'any'>('any');
  const [triggerLabel, setTriggerLabel] = useState('');
  const [actionType, setActionType] = useState<AutomationActionType>('add_comment');
  const [actionStatus, setActionStatus] = useState<IssueStatus>('in-review');
  const [actionAssignee, setActionAssignee] = useState<string>('__none');
  const [actionPriority, setActionPriority] = useState<Priority>('high');
  const [actionLabel, setActionLabel] = useState('');
  const [actionComment, setActionComment] = useState('Automated follow-up.');
  const [error, setError] = useState('');

  const canEdit = hasPermission(user?.role, 'projects.edit');
  const projectMembers = project
    ? members.filter((m) => project.memberIds.includes(m.id))
    : members;

  if (!project) return null;

  const assigneeFilter = (value: string) =>
    value === '__any' ? undefined : value === AUTOMATION_UNASSIGNED ? AUTOMATION_UNASSIGNED : value;

  const buildTrigger = (): AutomationTrigger => {
    switch (triggerType) {
      case 'issue_created':
        return {
          type: 'issue_created',
          ...(issueType !== 'any' ? { issueType } : {}),
        };
      case 'status_changed':
        return {
          type: 'status_changed',
          ...(fromStatus !== 'any' ? { fromStatus } : {}),
          ...(toStatus !== 'any' ? { toStatus } : {}),
        };
      case 'assignee_changed':
        return {
          type: 'assignee_changed',
          ...(fromAssignee !== '__any' ? { fromAssigneeId: assigneeFilter(fromAssignee) } : {}),
          ...(toAssignee !== '__any' ? { toAssigneeId: assigneeFilter(toAssignee) } : {}),
        };
      case 'priority_changed':
        return {
          type: 'priority_changed',
          ...(fromPriority !== 'any' ? { fromPriority } : {}),
          ...(toPriority !== 'any' ? { toPriority } : {}),
        };
      case 'label_added':
        return {
          type: 'label_added',
          ...(triggerLabel.trim() ? { label: triggerLabel.trim().toLowerCase() } : {}),
        };
      default:
        return { type: 'status_changed' };
    }
  };

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Rule name is required');

    const trigger = buildTrigger();

    let action: AutomationAction;
    switch (actionType) {
      case 'set_status':
        action = { type: 'set_status', status: actionStatus };
        break;
      case 'set_assignee':
        action = {
          type: 'set_assignee',
          assigneeId: actionAssignee === '__none' ? null : actionAssignee,
        };
        break;
      case 'set_priority':
        action = { type: 'set_priority', priority: actionPriority };
        break;
      case 'add_label':
        if (!actionLabel.trim()) return setError('Label is required for this action');
        action = { type: 'add_label', label: actionLabel.trim().toLowerCase() };
        break;
      case 'remove_label':
        if (!actionLabel.trim()) return setError('Label is required for this action');
        action = { type: 'remove_label', label: actionLabel.trim().toLowerCase() };
        break;
      case 'add_comment':
        if (!actionComment.trim()) return setError('Comment text is required');
        action = { type: 'add_comment', commentBody: actionComment.trim() };
        break;
      default:
        return setError('Unknown action');
    }

    createRule({
      projectId: project.id,
      name: name.trim(),
      trigger,
      actions: [action],
    });

    setName('');
    setActionLabel('');
    setActionComment('Automated follow-up.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Automation rules
          </CardTitle>
          <CardDescription>
            When/then rules for {project.name}. Triggers: create, status, assignee, priority, and label changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No rules yet. Create one below.
            </div>
          ) : (
            <ul className="space-y-2">
              {rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  members={projectMembers}
                  canEdit={canEdit}
                  onToggle={(enabled) => toggleRule(rule.id, enabled)}
                  onDelete={() => {
                    if (confirm(`Delete rule "${rule.name}"?`)) deleteRule(rule.id);
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Create rule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Field label="Rule name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Auto-assign review" />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="When (trigger)">
                <Select value={triggerType} onValueChange={(v) => v && setTriggerType(v as AutomationTriggerType)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUTOMATION_TRIGGER_LABELS) as AutomationTriggerType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{AUTOMATION_TRIGGER_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {triggerType === 'issue_created' ? (
                <Field label="Issue type (optional)">
                  <Select value={issueType} onValueChange={(v) => v && setIssueType(v as IssueType | 'any')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any" className="text-xs">Any type</SelectItem>
                      {ISSUE_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{ISSUE_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : triggerType === 'status_changed' ? (
                <>
                  <Field label="From status (optional)">
                    <Select value={fromStatus} onValueChange={(v) => v && setFromStatus(v as IssueStatus | 'any')}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any" className="text-xs">Any</SelectItem>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="To status (optional)">
                    <Select value={toStatus} onValueChange={(v) => v && setToStatus(v as IssueStatus | 'any')}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any" className="text-xs">Any</SelectItem>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : triggerType === 'assignee_changed' ? (
                <>
                  <Field label="From assignee (optional)">
                    <AssigneeSelect
                      value={fromAssignee}
                      onChange={setFromAssignee}
                      members={projectMembers}
                    />
                  </Field>
                  <Field label="To assignee (optional)">
                    <AssigneeSelect
                      value={toAssignee}
                      onChange={setToAssignee}
                      members={projectMembers}
                    />
                  </Field>
                </>
              ) : triggerType === 'priority_changed' ? (
                <>
                  <Field label="From priority (optional)">
                    <PrioritySelect value={fromPriority} onChange={setFromPriority} />
                  </Field>
                  <Field label="To priority (optional)">
                    <PrioritySelect value={toPriority} onChange={setToPriority} />
                  </Field>
                </>
              ) : triggerType === 'label_added' ? (
                <Field label="Label name (optional)">
                  <Input
                    value={triggerLabel}
                    onChange={(e) => setTriggerLabel(e.target.value)}
                    placeholder="Any label if empty"
                  />
                </Field>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Then (action)">
                <Select value={actionType} onValueChange={(v) => v && setActionType(v as AutomationActionType)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUTOMATION_ACTION_LABELS) as AutomationActionType[]).map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">{AUTOMATION_ACTION_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {actionType === 'set_status' && (
                <Field label="Target status">
                  <Select value={actionStatus} onValueChange={(v) => v && setActionStatus(v as IssueStatus)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {actionType === 'set_assignee' && (
                <Field label="Assignee">
                  <Select value={actionAssignee} onValueChange={(v) => v && setActionAssignee(v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none" className="text-xs">Unassigned</SelectItem>
                      {projectMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {actionType === 'set_priority' && (
                <Field label="Priority">
                  <Select value={actionPriority} onValueChange={(v) => v && setActionPriority(v as Priority)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {(actionType === 'add_label' || actionType === 'remove_label') && (
                <Field label="Label">
                  <Input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} placeholder="e.g. triage" />
                </Field>
              )}

              {actionType === 'add_comment' && (
                <Field label="Comment">
                  <Input value={actionComment} onChange={(e) => setActionComment(e.target.value)} />
                </Field>
              )}
            </div>

            <div className="flex justify-end">
              <Button className="cursor-pointer gap-1.5" onClick={submit}>
                <Plus className="h-3.5 w-3.5" />
                Create rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleRow({
  rule, members, canEdit, onToggle, onDelete,
}: {
  rule: AutomationRule;
  members: { id: string; name: string }[];
  canEdit: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const triggerSummary = describeTrigger(rule);
  const actionSummary = rule.actions.map((a) => describeAction(a, members)).join(' · ');

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-md border bg-card p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{rule.name}</span>
          <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-[10px]">
            {rule.enabled ? 'On' : 'Off'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          When {triggerSummary} → {actionSummary}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 cursor-pointer text-xs"
            onClick={() => onToggle(!rule.enabled)}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

function describeTrigger(rule: AutomationRule): string {
  const t = rule.trigger;
  if (t.type === 'issue_created') {
    return t.issueType ? `${ISSUE_TYPE_LABELS[t.issueType]} is created` : 'issue is created';
  }
  if (t.type === 'status_changed') {
    const from = t.fromStatus ? STATUS_LABELS[t.fromStatus] : 'any status';
    const to = t.toStatus ? STATUS_LABELS[t.toStatus] : 'any status';
    return `status moves from ${from} to ${to}`;
  }
  if (t.type === 'assignee_changed') {
    const from =
      t.fromAssigneeId === AUTOMATION_UNASSIGNED
        ? 'unassigned'
        : t.fromAssigneeId
          ? 'member'
          : 'any assignee';
    const to =
      t.toAssigneeId === AUTOMATION_UNASSIGNED
        ? 'unassigned'
        : t.toAssigneeId
          ? 'member'
          : 'any assignee';
    return `assignee changes from ${from} to ${to}`;
  }
  if (t.type === 'priority_changed') {
    const from = t.fromPriority ? PRIORITY_LABELS[t.fromPriority] : 'any priority';
    const to = t.toPriority ? PRIORITY_LABELS[t.toPriority] : 'any priority';
    return `priority moves from ${from} to ${to}`;
  }
  if (t.type === 'label_added') {
    return t.label ? `label "${t.label}" is added` : 'any label is added';
  }
  return 'unknown trigger';
}

function describeAction(
  action: AutomationRule['actions'][number],
  members: { id: string; name: string }[],
): string {
  switch (action.type) {
    case 'set_status':
      return action.status ? `set status to ${STATUS_LABELS[action.status]}` : 'set status';
    case 'set_assignee': {
      if (!action.assigneeId) return 'unassign';
      const m = members.find((x) => x.id === action.assigneeId);
      return `assign to ${m?.name ?? 'member'}`;
    }
    case 'set_priority':
      return action.priority ? `set priority to ${PRIORITY_LABELS[action.priority]}` : 'set priority';
    case 'add_label':
      return action.label ? `add label "${action.label}"` : 'add label';
    case 'remove_label':
      return action.label ? `remove label "${action.label}"` : 'remove label';
    case 'add_comment':
      return 'add comment';
    default:
      return 'run action';
  }
}

function AssigneeSelect({
  value,
  onChange,
  members,
}: {
  value: string;
  onChange: (v: string) => void;
  members: { id: string; name: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__any" className="text-xs">Any</SelectItem>
        <SelectItem value={AUTOMATION_UNASSIGNED} className="text-xs">Unassigned</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority | 'any';
  onChange: (v: Priority | 'any') => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as Priority | 'any')}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any" className="text-xs">Any</SelectItem>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABELS[p]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

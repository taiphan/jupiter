'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Trash2, Webhook as WebhookIcon, Zap } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useWebhooksStore } from '@/lib/webhooks-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import type { ProjectWebhook, WebhookEvent } from '@/lib/types';
import { WEBHOOK_EVENT_LABELS } from '@/lib/types';

const ALL_EVENTS = Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[];

export function WebhooksView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const hooks = useWebhooksStore((s) =>
    project ? s.getWebhooksForProject(project.id) : [],
  );
  const createWebhook = useWebhooksStore((s) => s.createWebhook);
  const deleteWebhook = useWebhooksStore((s) => s.deleteWebhook);
  const toggleWebhook = useWebhooksStore((s) => s.toggleWebhook);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>(['issue_created', 'issue_status_changed']);
  const [error, setError] = useState('');

  const canEdit = hasPermission(user?.role, 'projects.edit');

  if (!project) return null;

  const toggleEvent = (event: WebhookEvent, checked: boolean) => {
    setEvents((prev) =>
      checked ? [...prev, event] : prev.filter((e) => e !== event),
    );
  };

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Name is required');
    if (!url.trim()) return setError('URL is required');
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return setError('URL must use http or https');
      }
    } catch {
      return setError('Enter a valid URL');
    }
    if (events.length === 0) return setError('Select at least one event');

    createWebhook({
      projectId: project.id,
      name: name.trim(),
      url: url.trim(),
      secret: secret.trim() || undefined,
      events,
    });
    setName('');
    setUrl('');
    setSecret('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <WebhookIcon className="h-4 w-4" />
            Outbound webhooks
          </CardTitle>
          <CardDescription>
            POST JSON to external URLs when issues change in {project.name}. Deliveries run server-side
            with optional HMAC signing ({'`X-Jupiter-Signature`'}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hooks.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No webhooks yet. Add one below.
            </div>
          ) : (
            <ul className="space-y-2">
              {hooks.map((hook) => (
                <HookRow
                  key={hook.id}
                  hook={hook}
                  canEdit={canEdit}
                  onToggle={(enabled) => toggleWebhook(hook.id, enabled)}
                  onDelete={() => {
                    if (confirm(`Delete webhook "${hook.name}"?`)) deleteWebhook(hook.id);
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
              Add webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack bridge" />
            </Field>
            <Field label="Endpoint URL">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/hooks/jira"
                type="url"
              />
            </Field>
            <Field label="Signing secret (optional)">
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Shared secret for HMAC"
                type="password"
                autoComplete="off"
              />
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Events</p>
              <div className="flex flex-col gap-2">
                {ALL_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border cursor-pointer"
                      checked={events.includes(event)}
                      onChange={(e) => toggleEvent(event, e.target.checked)}
                    />
                    {WEBHOOK_EVENT_LABELS[event]}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="cursor-pointer gap-1.5" onClick={submit}>
                <Plus className="h-3.5 w-3.5" />
                Add webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HookRow({
  hook,
  canEdit,
  onToggle,
  onDelete,
}: {
  hook: ProjectWebhook;
  canEdit: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-md border bg-card p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{hook.name}</span>
          <Badge variant={hook.enabled ? 'default' : 'secondary'} className="text-[10px]">
            {hook.enabled ? 'On' : 'Off'}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground font-mono">{hook.url}</p>
        <div className="flex flex-wrap gap-1">
          {hook.events.map((e) => (
            <Badge key={e} variant="outline" className="text-[10px]">
              {WEBHOOK_EVENT_LABELS[e]}
            </Badge>
          ))}
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 cursor-pointer text-xs"
            onClick={() => onToggle(!hook.enabled)}
          >
            {hook.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-destructive"
            onClick={onDelete}
            aria-label="Delete webhook"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

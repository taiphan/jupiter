'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
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
import { useCustomFieldsStore } from '@/lib/custom-fields-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import {
  CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS,
} from '@/lib/types';
import type { CustomFieldType } from '@/lib/types';

export function FieldsView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const fields = useCustomFieldsStore((s) =>
    project ? s.getFieldsForProject(project.id) : [],
  );
  const createField = useCustomFieldsStore((s) => s.createField);
  const deleteField = useCustomFieldsStore((s) => s.deleteField);
  const reorderField = useCustomFieldsStore((s) => s.reorderField);
  const user = useAuthStore((s) => s.user);

  const canEdit = hasPermission(user?.role, 'projects.edit');

  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [error, setError] = useState('');

  if (!project) return null;

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Field name is required');
    if (type === 'select' && !optionsText.trim()) {
      return setError('Add at least one option for a dropdown');
    }
    createField({
      projectId: project.id,
      name: name.trim(),
      type,
      options:
        type === 'select'
          ? optionsText.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
    });
    setName('');
    setType('text');
    setOptionsText('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom fields</CardTitle>
          <CardDescription>
            Add fields that appear on every issue in this project. Values are editable from the
            issue panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No custom fields yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {fields.map((f, idx) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={idx === 0 || !canEdit}
                      onClick={() => reorderField(f.id, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={idx === fields.length - 1 || !canEdit}
                      onClick={() => reorderField(f.id, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.name}</p>
                    {f.type === 'select' && f.options && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.options.map((o) => (
                          <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Badge variant="outline" className="text-[10px]">
                    {CUSTOM_FIELD_TYPE_LABELS[f.type]}
                  </Badge>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete field "${f.name}"? Values on issues will be hidden.`)) {
                          deleteField(f.id);
                        }
                      }}
                      aria-label="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Field name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Severity" />
              </Field>
              <Field label="Type">
                <Select value={type} onValueChange={(v) => v && setType(v as CustomFieldType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOM_FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{CUSTOM_FIELD_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {type === 'select' && (
              <Field label="Options (comma-separated)">
                <Input
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Low, Medium, High"
                />
              </Field>
            )}
            <div className="flex justify-end">
              <Button className="cursor-pointer gap-1.5" onClick={submit}>
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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

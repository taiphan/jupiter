'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type { IssueFilters } from '@/lib/issues-store';
import { BUILTIN_QUICK_FILTERS, useQuickFiltersStore } from '@/lib/quick-filters-store';
import { hasPermission } from '@/lib/permissions';
import type { UserRole } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

interface QuickFilterBarProps {
  projectId: string;
  userId: string;
  userRole: UserRole;
  filters: IssueFilters;
  activeQuickId: string;
  onQuickChange: (id: string, filters: IssueFilters) => void;
}

export function QuickFilterBar({
  projectId, userId, userRole, filters, activeQuickId, onQuickChange,
}: QuickFilterBarProps) {
  const custom = useQuickFiltersStore((s) => s.forProject(projectId));
  const saveFilter = useQuickFiltersStore((s) => s.save);
  const removeFilter = useQuickFiltersStore((s) => s.remove);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const canManage = hasPermission(userRole, 'projects.edit');

  const chips: Array<{ id: string; name: string; filters: IssueFilters; custom?: boolean }> = [
    ...BUILTIN_QUICK_FILTERS,
    ...custom.map((c) => ({ id: c.id, name: c.name, filters: c.filters, custom: true })),
  ];

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    const saved = saveFilter({ projectId, name, filters, createdById: userId });
    onQuickChange(saved.id, saved.filters);
    setSaveName('');
    setSaveOpen(false);
  };

  const hasActiveFilters = Object.keys(filters).some((k) => {
    const v = filters[k as keyof IssueFilters];
    return v !== undefined && v !== 'all' && v !== '';
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
          <span key={chip.id} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onQuickChange(chip.id, chip.filters)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
                activeQuickId === chip.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {chip.name}
            </button>
            {chip.custom && canManage && (
              <button
                type="button"
                aria-label={`Remove ${chip.name} filter`}
                onClick={() => {
                  removeFilter(chip.id);
                  if (activeQuickId === chip.id) onQuickChange('__all', {});
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

      {canManage && hasActiveFilters && activeQuickId === '__custom' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px] cursor-pointer"
          onClick={() => setSaveOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Save filter
        </Button>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save quick filter</DialogTitle>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Filter name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Match current filters to a built-in/custom chip id, else __custom. */
export function matchQuickFilterId(
  projectId: string,
  filters: IssueFilters,
  custom: ReturnType<typeof useQuickFiltersStore.getState>['forProject'],
): string {
  const all = [...BUILTIN_QUICK_FILTERS, ...custom(projectId).map((c) => ({ id: c.id, name: c.name, filters: c.filters }))];
  const normalized = JSON.stringify(filters);
  const hit = all.find((c) => JSON.stringify(c.filters) === normalized);
  return hit?.id ?? '__custom';
}

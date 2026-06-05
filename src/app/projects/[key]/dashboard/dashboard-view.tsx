'use client';

import { useMemo } from 'react';
import { LayoutDashboard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useSprintsStore } from '@/lib/sprints-store';
import {
  useDashboardStore,
  DASHBOARD_WIDGET_LABELS,
  type DashboardWidgetId,
} from '@/lib/dashboard-store';
import {
  BurndownWidget,
  CfdWidget,
  VelocityWidget,
} from '@/components/reports/report-widgets';

const ALL_WIDGETS: DashboardWidgetId[] = ['velocity', 'burndown', 'cfd'];

export function DashboardView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const allIssues = useIssuesStore((s) => s.issues);
  const sprints = useSprintsStore((s) => (project ? s.getSprintsByProject(project.id) : []));
  const widgets = useDashboardStore((s) => (project ? s.getWidgets(project.id) : ALL_WIDGETS));
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const resetWidgets = useDashboardStore((s) => s.resetWidgets);

  const issues = useMemo(
    () => (project ? allIssues.filter((i) => i.projectId === project.id) : []),
    [allIssues, project],
  );

  const activeSprint = sprints.find((s) => s.state === 'active');

  if (!project) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm">Customize dashboard</CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1.5 text-xs"
            onClick={() => resetWidgets(project.id)}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset layout
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map((id) => {
              const active = widgets.includes(id);
              return (
                <Button
                  key={id}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className="cursor-pointer text-xs"
                  onClick={() => toggleWidget(project.id, id)}
                >
                  {DASHBOARD_WIDGET_LABELS[id]}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {widgets.includes('velocity') && (
          <VelocityWidget projectKey={project.key} sprints={sprints} issues={issues} compact />
        )}
        {widgets.includes('burndown') && (
          <BurndownWidget activeSprint={activeSprint} issues={issues} compact />
        )}
        {widgets.includes('cfd') && (
          <div className={widgets.length === 1 ? 'lg:col-span-2' : 'lg:col-span-2'}>
            <CfdWidget issues={issues} compact />
          </div>
        )}
      </div>
    </div>
  );
}

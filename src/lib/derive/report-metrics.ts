import type { Issue, IssueStatus, Sprint } from '@/lib/types';

export type VelocityRow = {
  name: string;
  committed: number;
  completed: number;
  issues: number;
  done: number;
  sprint: Sprint;
};

export type BurndownPoint = {
  date: string;
  label: string;
  ideal: number;
  remaining: number | null;
};

export type BurndownSeries = {
  totalPoints: number;
  points: BurndownPoint[];
  totalDays: number;
};

export function computeVelocityRows(
  sprints: Sprint[],
  issues: Issue[],
  projectKey: string,
): VelocityRow[] {
  return sprints
    .filter((s) => s.state === 'completed')
    .map((s) => {
      const inSprint = issues.filter((i) => i.sprintId === s.id);
      const committed = inSprint.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
      const completed = inSprint
        .filter((i) => i.status === 'done')
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
      return {
        name: s.name.replace(`${projectKey} `, ''),
        committed,
        completed,
        issues: inSprint.length,
        done: inSprint.filter((i) => i.status === 'done').length,
        sprint: s,
      };
    });
}

export function computeBurndown(activeSprint: Sprint | undefined, issues: Issue[]): BurndownSeries | null {
  if (!activeSprint?.startDate || !activeSprint.endDate) return null;

  const inSprint = issues.filter((i) => i.sprintId === activeSprint.id);
  const totalPoints = inSprint.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  const start = new Date(activeSprint.startDate);
  const end = new Date(activeSprint.endDate);
  const today = new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const points: BurndownPoint[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const cur = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    const ideal = Math.max(0, totalPoints - (totalPoints * d) / totalDays);
    const isPastOrToday = cur <= today;

    let remaining: number | null = null;
    if (isPastOrToday) {
      const burnt = inSprint
        .filter((i) => i.status === 'done' && new Date(i.updatedAt) <= cur)
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
      remaining = Math.max(0, totalPoints - burnt);
    }

    points.push({
      date: cur.toISOString().slice(0, 10),
      label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ideal: Math.round(ideal * 10) / 10,
      remaining,
    });
  }

  return { totalPoints, points, totalDays };
}

export type CfdPoint = { label: string; date: string } & Record<IssueStatus, number>;

export const CFD_STACK: IssueStatus[] = ['done', 'in-review', 'in-progress', 'todo', 'backlog'];

export function computeCfdPoints(
  issues: Pick<Issue, 'id' | 'status' | 'createdAt' | 'updatedAt'>[],
  days = 30,
): CfdPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: CfdPoint[] = [];

  for (let d = days; d >= 0; d--) {
    const cur = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
    const cutoff = cur.getTime() + 24 * 60 * 60 * 1000 - 1;

    const counts: Record<IssueStatus, number> = {
      backlog: 0,
      todo: 0,
      'in-progress': 0,
      'in-review': 0,
      done: 0,
    };

    for (const i of issues) {
      const created = new Date(i.createdAt).getTime();
      if (created > cutoff) continue;
      const updated = new Date(i.updatedAt).getTime();
      const effectiveStatus: IssueStatus = updated <= cutoff ? i.status : 'todo';
      counts[effectiveStatus] += 1;
    }

    points.push({
      label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: cur.toISOString().slice(0, 10),
      ...counts,
    });
  }

  return points;
}

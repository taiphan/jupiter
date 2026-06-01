import { Bookmark, Bug, CheckSquare, ListTree, Zap } from 'lucide-react';
import type { IssueType } from '@/lib/types';
import { ISSUE_TYPE_COLORS, ISSUE_TYPE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<IssueType, typeof Bookmark> = {
  epic: Zap,
  story: Bookmark,
  task: CheckSquare,
  bug: Bug,
  subtask: ListTree,
};

export function IssueTypeIcon({
  type,
  className,
}: {
  type: IssueType;
  className?: string;
}) {
  const Icon = ICONS[type];
  return (
    <Icon
      className={cn('h-3.5 w-3.5', className)}
      style={{ color: ISSUE_TYPE_COLORS[type] }}
      aria-label={ISSUE_TYPE_LABELS[type]}
    />
  );
}

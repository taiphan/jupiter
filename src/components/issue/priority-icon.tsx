import { ChevronUp, ChevronsUp, ChevronDown, ChevronsDown, Equal } from 'lucide-react';
import type { Priority } from '@/lib/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<Priority, typeof ChevronUp> = {
  highest: ChevronsUp,
  high: ChevronUp,
  medium: Equal,
  low: ChevronDown,
  lowest: ChevronsDown,
};

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const Icon = ICONS[priority];
  return (
    <Icon
      className={cn('h-3.5 w-3.5', PRIORITY_COLORS[priority], className)}
      aria-label={PRIORITY_LABELS[priority]}
    />
  );
}

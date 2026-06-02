'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold">Reports coming soon</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Velocity, burndown, and cumulative-flow reports will land alongside sprint planning.
          The Summary tab has high-level project metrics in the meantime.
        </p>
      </CardContent>
    </Card>
  );
}

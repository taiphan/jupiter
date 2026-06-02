'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function TimelinePlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold">Timeline coming soon</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Plan epics across weeks and quarters. We&apos;re shipping the timeline view in a future
          release. For now, organize your work in the Backlog or on the Board.
        </p>
      </CardContent>
    </Card>
  );
}

'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Breadcrumbs rendered above the title */
  breadcrumbs?: ReactNode;
  /** Heading text */
  title: ReactNode;
  /** Subtitle / description below the title */
  description?: ReactNode;
  /** Right-aligned action buttons */
  actions?: ReactNode;
  /** Tabs rendered below the title row (e.g. Board / Backlog / Reports) */
  tabs?: ReactNode;
  /** Sticky filters bar below the tabs (search, filter pills, etc.) */
  toolbar?: ReactNode;
}

export function PageHeader({
  breadcrumbs, title, description, actions, tabs, toolbar,
}: PageHeaderProps) {
  return (
    <div className="border-b bg-card px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl py-4">
        {breadcrumbs && <div className="mb-2 text-xs text-muted-foreground">{breadcrumbs}</div>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
      {tabs && <div className="mx-auto -mb-px max-w-7xl">{tabs}</div>}
      {toolbar && <div className="mx-auto max-w-7xl py-3">{toolbar}</div>}
    </div>
  );
}

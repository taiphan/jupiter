'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';

function NewIssueRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get('project') ?? undefined;
  const [open, setOpen] = useState(true);

  // When the dialog closes (via cancel or create), navigate back / to the issue
  return (
    <CreateIssueDialog
      open={open}
      onClose={() => {
        setOpen(false);
        router.back();
      }}
      defaultProjectId={projectId}
      onCreated={() => {
        // Stay on the previous page; the dialog body navigates the user via setOpenIssueId
        // Here we just go back to wherever they came from after creation.
        setOpen(false);
        router.back();
      }}
    />
  );
}

export default function NewIssuePage() {
  // Render a blank background while the dialog is open
  return (
    <Suspense>
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Opening new issue dialog…
      </div>
      <NewIssueRedirect />
    </Suspense>
  );
}

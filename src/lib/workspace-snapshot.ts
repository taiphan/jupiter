import type { WorkspaceSnapshot } from '@/lib/workspace-types';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssueLinksStore } from '@/lib/issue-links-store';
import { useCustomFieldsStore } from '@/lib/custom-fields-store';
import { useQuickFiltersStore } from '@/lib/quick-filters-store';
import { useVersionsStore } from '@/lib/versions-store';

export function collectWorkspaceSnapshot(): WorkspaceSnapshot {
  const projects = useProjectsStore.getState();
  const issues = useIssuesStore.getState();
  const sprints = useSprintsStore.getState();
  const links = useIssueLinksStore.getState();
  const fields = useCustomFieldsStore.getState();
  const quick = useQuickFiltersStore.getState();
  const versions = useVersionsStore.getState();

  return {
    projects: projects.projects,
    members: projects.members,
    issues: issues.issues,
    comments: issues.comments,
    activity: issues.activity,
    attachments: issues.attachments,
    sprints: sprints.sprints,
    issueLinks: links.links,
    customFields: fields.fields,
    quickFilters: quick.custom,
    versions: versions.versions,
  };
}

export function applyWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  useProjectsStore.setState({
    projects: snapshot.projects,
    members: snapshot.members,
  });
  useIssuesStore.setState({
    issues: snapshot.issues,
    comments: snapshot.comments,
    activity: snapshot.activity,
    attachments: snapshot.attachments,
  });
  useSprintsStore.setState({ sprints: snapshot.sprints });
  useIssueLinksStore.setState({ links: snapshot.issueLinks });
  useCustomFieldsStore.setState({ fields: snapshot.customFields });
  useQuickFiltersStore.setState({ custom: snapshot.quickFilters });
  useVersionsStore.setState({ versions: snapshot.versions ?? [] });
}

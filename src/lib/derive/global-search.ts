import type { Issue, Member, Project, ProjectVersion } from '../types';

export interface GlobalSearchLimits {
  issues: number;
  projects: number;
  members: number;
  labels: number;
}

const DEFAULT_LIMITS: GlobalSearchLimits = {
  issues: 6,
  projects: 4,
  members: 3,
  labels: 4,
};

export interface GlobalSearchResults {
  issues: Issue[];
  projects: Project[];
  members: Member[];
  labels: string[];
  totalIssueMatches: number;
}

function memberNameById(members: Member[], id?: string): string {
  if (!id) return '';
  return members.find((m) => m.id === id)?.name.toLowerCase() ?? '';
}

function issueMatchesQuery(issue: Issue, q: string, members: Member[]): boolean {
  if (issue.key.toLowerCase().includes(q)) return true;
  if (issue.summary.toLowerCase().includes(q)) return true;
  if (issue.description?.toLowerCase().includes(q)) return true;
  if ((issue.labels ?? []).some((l) => l.includes(q))) return true;
  if (memberNameById(members, issue.assigneeId).includes(q)) return true;
  if (memberNameById(members, issue.reporterId).includes(q)) return true;
  return false;
}

/** Workspace-wide quick search for nav ⌘K dropdown. */
export function runGlobalSearch(
  query: string,
  data: {
    issues: Issue[];
    projects: Project[];
    members: Member[];
    versions?: ProjectVersion[];
  },
  limits: Partial<GlobalSearchLimits> = {},
): GlobalSearchResults {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { issues: [], projects: [], members: [], labels: [], totalIssueMatches: 0 };
  }

  const cap = { ...DEFAULT_LIMITS, ...limits };
  const { issues, projects, members, versions = [] } = data;

  const allIssueMatches = issues.filter((i) => {
    if (issueMatchesQuery(i, q, members)) return true;
    return (i.fixVersionIds ?? []).some((vid) => {
      const ver = versions.find((v) => v.id === vid);
      return ver?.name.toLowerCase().includes(q);
    });
  });

  const issueResults = allIssueMatches.slice(0, cap.issues);

  const projectResults = projects
    .filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, cap.projects);

  const memberResults = members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    )
    .slice(0, cap.members);

  const labelSet = new Set<string>();
  for (const issue of allIssueMatches) {
    for (const label of issue.labels ?? []) {
      if (label.includes(q)) labelSet.add(label);
      if (labelSet.size >= cap.labels) break;
    }
    if (labelSet.size >= cap.labels) break;
  }

  return {
    issues: issueResults,
    projects: projectResults,
    members: memberResults,
    labels: [...labelSet],
    totalIssueMatches: allIssueMatches.length,
  };
}

import type { Project, Issue, Comment, ActivityEntry, Member } from './types';
import { DEMO_USERS } from './auth-store';

export const SEED_MEMBERS: Member[] = DEMO_USERS.map((u) => ({
  id: u.user.id,
  name: u.user.name,
  username: u.user.username,
  email: u.user.email,
  avatarColor: u.user.avatarColor,
  title: u.user.title,
}));

export const SEED_PROJECTS: Project[] = [
  {
    id: 'prj_web',
    key: 'WEB',
    name: 'Marketing Website',
    description: 'Public-facing site, blog, and landing pages.',
    type: 'kanban',
    leadId: 'usr_lead',
    memberIds: ['usr_admin', 'usr_lead', 'usr_member', 'usr_viewer'],
    createdAt: '2026-04-01T09:00:00.000Z',
    issueCounter: 8,
  },
  {
    id: 'prj_mobile',
    key: 'MOB',
    name: 'Mobile App',
    description: 'iOS and Android customer app.',
    type: 'kanban',
    leadId: 'usr_lead',
    memberIds: ['usr_lead', 'usr_member'],
    createdAt: '2026-04-15T09:00:00.000Z',
    issueCounter: 5,
  },
  {
    id: 'prj_platform',
    key: 'PLAT',
    name: 'Platform & Infra',
    description: 'Backend services, deploys, observability.',
    type: 'kanban',
    leadId: 'usr_admin',
    memberIds: ['usr_admin', 'usr_member'],
    createdAt: '2026-05-01T09:00:00.000Z',
    issueCounter: 4,
  },
];

const now = new Date('2026-06-02T10:00:00.000Z').toISOString();
const earlier = new Date('2026-05-28T10:00:00.000Z').toISOString();
const yesterday = new Date('2026-06-01T10:00:00.000Z').toISOString();

export const SEED_ISSUES: Issue[] = [
  // WEB
  {
    id: 'iss_web_1', key: 'WEB-1', projectId: 'prj_web', type: 'epic',
    summary: 'Q3 marketing site refresh',
    description: 'Refresh hero, pricing, and customer stories pages.',
    status: 'in-progress', priority: 'high',
    assigneeId: 'usr_lead', reporterId: 'usr_admin',
    labels: ['design', 'q3'], rank: 1000,
    createdAt: earlier, updatedAt: yesterday,
  },
  {
    id: 'iss_web_2', key: 'WEB-2', projectId: 'prj_web', type: 'story',
    summary: 'Redesign hero section',
    description: 'Update headline copy and visuals on homepage.',
    status: 'in-progress', priority: 'high',
    assigneeId: 'usr_member', reporterId: 'usr_lead',
    labels: ['design'], parentId: 'iss_web_1', storyPoints: 3, rank: 2000,
    createdAt: earlier, updatedAt: yesterday,
  },
  {
    id: 'iss_web_3', key: 'WEB-3', projectId: 'prj_web', type: 'task',
    summary: 'Audit current pricing page metrics',
    status: 'todo', priority: 'medium',
    assigneeId: 'usr_member', reporterId: 'usr_lead',
    labels: ['analytics'], storyPoints: 2, rank: 3000,
    createdAt: earlier, updatedAt: earlier,
  },
  {
    id: 'iss_web_4', key: 'WEB-4', projectId: 'prj_web', type: 'bug',
    summary: 'Mobile menu collapses incorrectly on iOS Safari',
    description: 'Tap target is unresponsive after closing once.',
    status: 'in-review', priority: 'highest',
    assigneeId: 'usr_member', reporterId: 'usr_admin',
    labels: ['mobile', 'safari'], storyPoints: 1, rank: 4000,
    createdAt: earlier, updatedAt: now,
  },
  {
    id: 'iss_web_5', key: 'WEB-5', projectId: 'prj_web', type: 'task',
    summary: 'Set up analytics events for CTA clicks',
    status: 'done', priority: 'low',
    assigneeId: 'usr_member', reporterId: 'usr_lead',
    labels: ['analytics'], storyPoints: 2, rank: 5000,
    createdAt: earlier, updatedAt: yesterday,
  },
  {
    id: 'iss_web_6', key: 'WEB-6', projectId: 'prj_web', type: 'story',
    summary: 'Customer story: Acme Logistics',
    status: 'backlog', priority: 'medium',
    reporterId: 'usr_lead',
    labels: ['content'], storyPoints: 5, rank: 6000,
    createdAt: earlier, updatedAt: earlier,
  },
  {
    id: 'iss_web_7', key: 'WEB-7', projectId: 'prj_web', type: 'task',
    summary: 'Optimize hero images for WebP',
    status: 'backlog', priority: 'low',
    reporterId: 'usr_member',
    labels: ['perf'], storyPoints: 2, rank: 7000,
    createdAt: earlier, updatedAt: earlier,
  },
  {
    id: 'iss_web_8', key: 'WEB-8', projectId: 'prj_web', type: 'bug',
    summary: 'Footer link 404 — privacy page',
    status: 'todo', priority: 'medium',
    assigneeId: 'usr_lead', reporterId: 'usr_viewer',
    labels: ['content'], rank: 8000,
    createdAt: earlier, updatedAt: earlier,
  },

  // MOB
  {
    id: 'iss_mob_1', key: 'MOB-1', projectId: 'prj_mobile', type: 'epic',
    summary: 'Onboarding redesign',
    status: 'in-progress', priority: 'high',
    assigneeId: 'usr_lead', reporterId: 'usr_admin',
    labels: ['onboarding'], rank: 1000,
    createdAt: earlier, updatedAt: now,
  },
  {
    id: 'iss_mob_2', key: 'MOB-2', projectId: 'prj_mobile', type: 'story',
    summary: 'New welcome carousel',
    status: 'todo', priority: 'medium',
    assigneeId: 'usr_member', reporterId: 'usr_lead',
    labels: ['onboarding'], parentId: 'iss_mob_1', storyPoints: 3, rank: 2000,
    createdAt: earlier, updatedAt: earlier,
  },
  {
    id: 'iss_mob_3', key: 'MOB-3', projectId: 'prj_mobile', type: 'bug',
    summary: 'App crashes on cold start (Android 13)',
    status: 'in-progress', priority: 'highest',
    assigneeId: 'usr_member', reporterId: 'usr_admin',
    labels: ['crash', 'android'], storyPoints: 5, rank: 3000,
    createdAt: earlier, updatedAt: now,
  },
  {
    id: 'iss_mob_4', key: 'MOB-4', projectId: 'prj_mobile', type: 'task',
    summary: 'Update SDK to latest minor version',
    status: 'done', priority: 'low',
    assigneeId: 'usr_member', reporterId: 'usr_member',
    labels: ['chore'], rank: 4000,
    createdAt: earlier, updatedAt: yesterday,
  },
  {
    id: 'iss_mob_5', key: 'MOB-5', projectId: 'prj_mobile', type: 'story',
    summary: 'Push notification preferences screen',
    status: 'backlog', priority: 'medium',
    reporterId: 'usr_lead',
    labels: ['notifications'], storyPoints: 5, rank: 5000,
    createdAt: earlier, updatedAt: earlier,
  },

  // PLAT
  {
    id: 'iss_plat_1', key: 'PLAT-1', projectId: 'prj_platform', type: 'task',
    summary: 'Migrate CI to GitHub Actions',
    status: 'in-progress', priority: 'high',
    assigneeId: 'usr_admin', reporterId: 'usr_admin',
    labels: ['ci'], storyPoints: 5, rank: 1000,
    createdAt: earlier, updatedAt: now,
  },
  {
    id: 'iss_plat_2', key: 'PLAT-2', projectId: 'prj_platform', type: 'task',
    summary: 'Add OpenTelemetry traces to API gateway',
    status: 'todo', priority: 'medium',
    assigneeId: 'usr_member', reporterId: 'usr_admin',
    labels: ['observability'], storyPoints: 3, rank: 2000,
    createdAt: earlier, updatedAt: earlier,
  },
  {
    id: 'iss_plat_3', key: 'PLAT-3', projectId: 'prj_platform', type: 'bug',
    summary: 'Webhook retries duplicating events',
    status: 'in-review', priority: 'high',
    assigneeId: 'usr_member', reporterId: 'usr_admin',
    labels: ['webhooks'], storyPoints: 3, rank: 3000,
    createdAt: earlier, updatedAt: yesterday,
  },
  {
    id: 'iss_plat_4', key: 'PLAT-4', projectId: 'prj_platform', type: 'story',
    summary: 'Self-serve API keys for customers',
    status: 'backlog', priority: 'medium',
    reporterId: 'usr_admin',
    labels: ['api'], storyPoints: 8, rank: 4000,
    createdAt: earlier, updatedAt: earlier,
  },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: 'cmt_1', issueId: 'iss_web_4', authorId: 'usr_lead',
    body: 'Reproduced on iPhone 14 / iOS 17. Pushing a fix today.',
    createdAt: yesterday,
  },
  {
    id: 'cmt_2', issueId: 'iss_web_4', authorId: 'usr_member',
    body: 'PR ready for review — mostly a CSS regression.',
    createdAt: now,
  },
  {
    id: 'cmt_3', issueId: 'iss_mob_3', authorId: 'usr_member',
    body: 'Looks like a race in the analytics SDK init. Investigating.',
    createdAt: now,
  },
];

export const SEED_ACTIVITY: ActivityEntry[] = [
  {
    id: 'act_1', issueId: 'iss_web_4', actorId: 'usr_admin',
    kind: 'created', message: 'Created this issue', createdAt: earlier,
  },
  {
    id: 'act_2', issueId: 'iss_web_4', actorId: 'usr_lead',
    kind: 'status', message: 'Status: To Do → In Progress', createdAt: yesterday,
  },
  {
    id: 'act_3', issueId: 'iss_web_4', actorId: 'usr_member',
    kind: 'status', message: 'Status: In Progress → In Review', createdAt: now,
  },
];

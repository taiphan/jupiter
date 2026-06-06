import { inArray } from 'drizzle-orm';
import type { WorkspaceSnapshot } from '@/lib/workspace-types';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import {
  mapUserToMember,
  mapProjectRow,
  mapIssueRow,
  mapSprintRow,
  mapCommentRow,
  mapActivityRow,
  mapAttachmentRow,
  mapCustomFieldRow,
  mapIssueLinkRow,
  mapQuickFilterRow,
  mapVersionRow,
  versionToInsert,
  mapAutomationRuleRow,
  automationRuleToInsert,
  mapProjectWebhookRow,
  projectWebhookToInsert,
  projectToInsert,
  issueToInsert,
  sprintToInsert,
} from '@/server/db/mappers';

export async function loadWorkspace(): Promise<WorkspaceSnapshot> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const [
    userRows,
    projectRows,
    memberRows,
    sprintRows,
    issueRows,
    commentRows,
    activityRows,
    attachmentRows,
    fieldRows,
    linkRows,
    quickFilterRows,
    versionRows,
    automationRows,
    webhookRows,
  ] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.projects),
    db.select().from(schema.projectMembers),
    db.select().from(schema.sprints),
    db.select().from(schema.issues),
    db.select().from(schema.comments),
    db.select().from(schema.activity),
    db.select().from(schema.attachments),
    db.select().from(schema.customFields),
    db.select().from(schema.issueLinks),
    db.select().from(schema.quickFilters),
    db.select().from(schema.projectVersions),
    db.select().from(schema.automationRules),
    db.select().from(schema.projectWebhooks),
  ]);

  const membersByProject = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = membersByProject.get(m.projectId) ?? [];
    list.push(m.userId);
    membersByProject.set(m.projectId, list);
  }

  return {
    members: userRows.map(mapUserToMember),
    projects: projectRows.map((p) =>
      mapProjectRow(p, membersByProject.get(p.id) ?? []),
    ),
    sprints: sprintRows.map(mapSprintRow),
    issues: issueRows.map(mapIssueRow),
    comments: commentRows.map(mapCommentRow),
    activity: activityRows.map(mapActivityRow),
    attachments: attachmentRows.map(mapAttachmentRow),
    customFields: fieldRows.map(mapCustomFieldRow),
    issueLinks: linkRows.map(mapIssueLinkRow),
    quickFilters: quickFilterRows.map(mapQuickFilterRow),
    versions: versionRows.map(mapVersionRow),
    automationRules: automationRows.map(mapAutomationRuleRow),
    projectWebhooks: webhookRows.map(mapProjectWebhookRow),
  };
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const projectIds = snapshot.projects.map((p) => p.id);
  const issueIds = snapshot.issues.map((i) => i.id);

  await db.transaction(async (tx) => {
    for (const p of snapshot.projects) {
      await tx
        .insert(schema.projects)
        .values(projectToInsert(p))
        .onConflictDoUpdate({
          target: schema.projects.id,
          set: {
            key: p.key,
            name: p.name,
            description: p.description ?? null,
            type: p.type,
            leadId: p.leadId,
            issueCounter: p.issueCounter,
            statusOverrides: p.statusOverrides ?? null,
            transitionRules: p.transitionRules ?? null,
          },
        });
    }

    if (projectIds.length > 0) {
      await tx.delete(schema.projectMembers).where(inArray(schema.projectMembers.projectId, projectIds));
    }
    const memberRows = snapshot.projects.flatMap((p) =>
      p.memberIds.map((userId) => ({ projectId: p.id, userId })),
    );
    if (memberRows.length > 0) {
      await tx.insert(schema.projectMembers).values(memberRows);
    }

    for (const s of snapshot.sprints) {
      await tx
        .insert(schema.sprints)
        .values(sprintToInsert(s))
        .onConflictDoUpdate({
          target: schema.sprints.id,
          set: {
            projectId: s.projectId,
            number: s.number,
            name: s.name,
            goal: s.goal ?? null,
            state: s.state,
            startDate: sprintToInsert(s).startDate,
            endDate: sprintToInsert(s).endDate,
            completedAt: sprintToInsert(s).completedAt,
          },
        });
    }

    for (const i of snapshot.issues) {
      await tx
        .insert(schema.issues)
        .values(issueToInsert(i))
        .onConflictDoUpdate({
          target: schema.issues.id,
          set: {
            key: i.key,
            projectId: i.projectId,
            type: i.type,
            summary: i.summary,
            description: i.description ?? null,
            status: i.status,
            priority: i.priority,
            assigneeId: i.assigneeId ?? null,
            reporterId: i.reporterId,
            labels: i.labels,
            parentId: i.parentId ?? null,
            sprintId: i.sprintId ?? null,
            storyPoints: i.storyPoints ?? null,
            startDate: i.startDate ?? null,
            dueDate: i.dueDate ?? null,
            fixVersionIds: i.fixVersionIds ?? [],
            customFields: i.customFields ?? null,
            watcherIds: i.watcherIds ?? [],
            rank: i.rank,
            updatedAt: issueToInsert(i).updatedAt,
          },
        });
    }

    for (const c of snapshot.comments) {
      await tx
        .insert(schema.comments)
        .values({
          id: c.id,
          issueId: c.issueId,
          authorId: c.authorId,
          body: c.body,
          createdAt: new Date(c.createdAt),
        })
        .onConflictDoUpdate({
          target: schema.comments.id,
          set: { body: c.body },
        });
    }

    for (const a of snapshot.activity) {
      await tx
        .insert(schema.activity)
        .values({
          id: a.id,
          issueId: a.issueId,
          actorId: a.actorId,
          kind: a.kind,
          message: a.message,
          createdAt: new Date(a.createdAt),
        })
        .onConflictDoNothing();
    }

    for (const att of snapshot.attachments) {
      await tx
        .insert(schema.attachments)
        .values({
          id: att.id,
          issueId: att.issueId,
          name: att.name,
          mime: att.mime,
          size: att.size,
          dataUrl: att.dataUrl,
          uploadedById: att.uploadedById,
          createdAt: new Date(att.createdAt),
        })
        .onConflictDoUpdate({
          target: schema.attachments.id,
          set: {
            name: att.name,
            mime: att.mime,
            size: att.size,
            dataUrl: att.dataUrl,
          },
        });
    }

    for (const f of snapshot.customFields) {
      await tx
        .insert(schema.customFields)
        .values({
          id: f.id,
          projectId: f.projectId,
          name: f.name,
          type: f.type,
          options: f.options ?? null,
          required: f.required ?? false,
          order: f.order,
        })
        .onConflictDoUpdate({
          target: schema.customFields.id,
          set: {
            name: f.name,
            type: f.type,
            options: f.options ?? null,
            required: f.required ?? false,
            order: f.order,
          },
        });
    }

    for (const l of snapshot.issueLinks) {
      await tx
        .insert(schema.issueLinks)
        .values({
          id: l.id,
          type: l.type,
          fromIssueId: l.fromIssueId,
          toIssueId: l.toIssueId,
          createdBy: l.createdBy,
          createdAt: new Date(l.createdAt),
        })
        .onConflictDoUpdate({
          target: schema.issueLinks.id,
          set: { type: l.type },
        });
    }

    for (const q of snapshot.quickFilters) {
      await tx
        .insert(schema.quickFilters)
        .values({
          id: q.id,
          projectId: q.projectId,
          name: q.name,
          filters: q.filters as Record<string, unknown>,
          createdById: q.createdById,
        })
        .onConflictDoUpdate({
          target: schema.quickFilters.id,
          set: { name: q.name, filters: q.filters as Record<string, unknown> },
        });
    }

    for (const v of snapshot.versions ?? []) {
      await tx
        .insert(schema.projectVersions)
        .values(versionToInsert(v))
        .onConflictDoUpdate({
          target: schema.projectVersions.id,
          set: {
            name: v.name,
            description: v.description ?? null,
            releaseDate: v.releaseDate ?? null,
            released: v.released,
            order: v.order,
          },
        });
    }

    for (const r of snapshot.automationRules ?? []) {
      await tx
        .insert(schema.automationRules)
        .values(automationRuleToInsert(r))
        .onConflictDoUpdate({
          target: schema.automationRules.id,
          set: {
            name: r.name,
            description: r.description ?? null,
            enabled: r.enabled,
            trigger: r.trigger,
            actions: r.actions,
            order: r.order,
          },
        });
    }

    for (const w of snapshot.projectWebhooks ?? []) {
      await tx
        .insert(schema.projectWebhooks)
        .values(projectWebhookToInsert(w))
        .onConflictDoUpdate({
          target: schema.projectWebhooks.id,
          set: {
            name: w.name,
            url: w.url,
            secret: w.secret ?? null,
            events: w.events,
            enabled: w.enabled,
          },
        });
    }

    // Remove rows deleted on the client (scoped to known project/issue ids)
    const snapshotCommentIds = new Set(snapshot.comments.map((c) => c.id));
    const snapshotLinkIds = new Set(snapshot.issueLinks.map((l) => l.id));
    const snapshotFieldIds = new Set(snapshot.customFields.map((f) => f.id));
    const snapshotQuickIds = new Set(snapshot.quickFilters.map((q) => q.id));
    const snapshotVersionIds = new Set((snapshot.versions ?? []).map((v) => v.id));
    const snapshotAutomationIds = new Set((snapshot.automationRules ?? []).map((r) => r.id));
    const snapshotWebhookIds = new Set((snapshot.projectWebhooks ?? []).map((w) => w.id));
    const snapshotSprintIds = new Set(snapshot.sprints.map((s) => s.id));

    if (issueIds.length > 0) {
      const existingComments = await tx
        .select({ id: schema.comments.id })
        .from(schema.comments)
        .where(inArray(schema.comments.issueId, issueIds));
      const toDeleteComments = existingComments
        .filter((r) => !snapshotCommentIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteComments.length > 0) {
        await tx.delete(schema.comments).where(inArray(schema.comments.id, toDeleteComments));
      }

      const existingLinks = await tx
        .select({ id: schema.issueLinks.id })
        .from(schema.issueLinks)
        .where(inArray(schema.issueLinks.fromIssueId, issueIds));
      const toDeleteLinks = existingLinks
        .filter((r) => !snapshotLinkIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteLinks.length > 0) {
        await tx.delete(schema.issueLinks).where(inArray(schema.issueLinks.id, toDeleteLinks));
      }
    }

    if (projectIds.length > 0) {
      const existingFields = await tx
        .select({ id: schema.customFields.id })
        .from(schema.customFields)
        .where(inArray(schema.customFields.projectId, projectIds));
      const toDeleteFields = existingFields
        .filter((r) => !snapshotFieldIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteFields.length > 0) {
        await tx.delete(schema.customFields).where(inArray(schema.customFields.id, toDeleteFields));
      }

      const existingQuick = await tx
        .select({ id: schema.quickFilters.id })
        .from(schema.quickFilters)
        .where(inArray(schema.quickFilters.projectId, projectIds));
      const toDeleteQuick = existingQuick
        .filter((r) => !snapshotQuickIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteQuick.length > 0) {
        await tx.delete(schema.quickFilters).where(inArray(schema.quickFilters.id, toDeleteQuick));
      }

      const existingVersions = await tx
        .select({ id: schema.projectVersions.id })
        .from(schema.projectVersions)
        .where(inArray(schema.projectVersions.projectId, projectIds));
      const toDeleteVersions = existingVersions
        .filter((r) => !snapshotVersionIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteVersions.length > 0) {
        await tx.delete(schema.projectVersions).where(inArray(schema.projectVersions.id, toDeleteVersions));
      }

      const existingAutomation = await tx
        .select({ id: schema.automationRules.id })
        .from(schema.automationRules)
        .where(inArray(schema.automationRules.projectId, projectIds));
      const toDeleteAutomation = existingAutomation
        .filter((r) => !snapshotAutomationIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteAutomation.length > 0) {
        await tx.delete(schema.automationRules).where(inArray(schema.automationRules.id, toDeleteAutomation));
      }

      const existingWebhooks = await tx
        .select({ id: schema.projectWebhooks.id })
        .from(schema.projectWebhooks)
        .where(inArray(schema.projectWebhooks.projectId, projectIds));
      const toDeleteWebhooks = existingWebhooks
        .filter((r) => !snapshotWebhookIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteWebhooks.length > 0) {
        await tx.delete(schema.projectWebhooks).where(inArray(schema.projectWebhooks.id, toDeleteWebhooks));
      }

      const existingSprints = await tx
        .select({ id: schema.sprints.id })
        .from(schema.sprints)
        .where(inArray(schema.sprints.projectId, projectIds));
      const toDeleteSprints = existingSprints
        .filter((r) => !snapshotSprintIds.has(r.id))
        .map((r) => r.id);
      if (toDeleteSprints.length > 0) {
        await tx.delete(schema.sprints).where(inArray(schema.sprints.id, toDeleteSprints));
      }

      const existingIssues = await tx
        .select({ id: schema.issues.id })
        .from(schema.issues)
        .where(inArray(schema.issues.projectId, projectIds));
      const snapshotIssueIdSet = new Set(issueIds);
      const toDeleteIssues = existingIssues
        .filter((r) => !snapshotIssueIdSet.has(r.id))
        .map((r) => r.id);
      if (toDeleteIssues.length > 0) {
        await tx.delete(schema.issues).where(inArray(schema.issues.id, toDeleteIssues));
      }
    }
  });
}

export async function workspaceIsEmpty(): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const rows = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
  return rows.length === 0;
}

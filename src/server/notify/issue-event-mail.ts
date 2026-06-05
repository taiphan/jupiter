import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { sendTransactionalEmail } from '@/server/auth/mailer';
import { getAuthSettings } from '@/server/auth/auth-settings';

export function isIssueEmailNotificationsEnabled(): boolean {
  const flag = process.env.ISSUE_EMAIL_NOTIFICATIONS?.trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

export async function sendIssueEventEmails(input: {
  issueKey: string;
  summary: string;
  message: string;
  actorName: string;
  recipientUserIds: string[];
}): Promise<number> {
  if (!isIssueEmailNotificationsEnabled()) return 0;
  if (input.recipientUserIds.length === 0) return 0;

  const db = getDb();
  if (!db) return 0;

  const settings = await getAuthSettings();
  const rows = await db
    .select({ email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(inArray(schema.users.id, input.recipientUserIds));

  const subject = `[${input.issueKey}] ${input.summary}`;
  const text = `${input.actorName} updated ${input.issueKey}:\n\n${input.message}\n\nOpen: ${settings.appUrl}/issues`;
  const html = `<p><strong>${input.actorName}</strong> updated <strong>${input.issueKey}</strong>:</p><p>${input.message}</p><p><a href="${settings.appUrl}/issues">View in Jupiter</a></p>`;

  let sent = 0;
  for (const user of rows) {
    if (!user.email) continue;
    try {
      await sendTransactionalEmail(user.email, subject, text, html);
      sent += 1;
    } catch {
      /* continue to other recipients */
    }
  }
  return sent;
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const db = getDb();
  if (!db) return 'Someone';
  const row = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return row[0]?.name ?? 'Someone';
}

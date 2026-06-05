import { z } from 'zod';
import { requireUser, json, error, isResponse } from '@/server/api-helpers';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';
import {
  getUserDisplayName,
  sendIssueEventEmails,
  isIssueEmailNotificationsEnabled,
} from '@/server/notify/issue-event-mail';

const bodySchema = z.object({
  issueKey: z.string().min(1).max(32),
  summary: z.string().min(1).max(500),
  message: z.string().min(1).max(2000),
  recipientUserIds: z.array(z.string().min(1)).max(50),
});

export async function POST(request: Request) {
  if (!isIssueEmailNotificationsEnabled()) {
    return json({ ok: true, skipped: true, reason: 'disabled' });
  }

  const user = await requireUser();
  if (isResponse(user)) return user;

  const ip = clientIp(request);
  const limit = checkRateLimit(`notify:issue:${user.id}:${ip}`, 30, 15 * 60 * 1000);
  if (!limit.allowed) return error('Too many notifications', 429);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return error('Invalid request body', 400);
  }

  const filteredRecipients = body.recipientUserIds.filter((id) => id !== user.id);
  const actorName = await getUserDisplayName(user.id);
  const sent = await sendIssueEventEmails({
    issueKey: body.issueKey,
    summary: body.summary,
    message: body.message,
    actorName,
    recipientUserIds: filteredRecipients,
  });

  return json({ ok: true, sent });
}

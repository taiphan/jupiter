import { z } from 'zod';
import { requireUser, json, error, isResponse } from '@/server/api-helpers';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';
import { isWebhookUrlAllowed } from '@/server/webhooks/url-policy';
import { signWebhookBody } from '@/server/webhooks/sign';

const bodySchema = z.object({
  url: z.string().url().max(2048),
  secret: z.string().max(256).optional(),
  payload: z.record(z.string(), z.unknown()),
});

const DELIVER_TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const ip = clientIp(request);
  const limit = checkRateLimit(`webhook:deliver:${user.id}:${ip}`, 60, 15 * 60 * 1000);
  if (!limit.allowed) return error('Too many webhook deliveries', 429);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return error('Invalid request body', 400);
  }

  if (!isWebhookUrlAllowed(body.url)) {
    return error('Webhook URL is not allowed', 400);
  }

  const rawBody = JSON.stringify(body.payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Jupiter-Webhooks/1.24',
  };
  if (body.secret) {
    headers['X-Jupiter-Signature'] = signWebhookBody(body.secret, rawBody);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVER_TIMEOUT_MS);

  try {
    const res = await fetch(body.url, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    return json({
      ok: res.ok,
      status: res.status,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delivery failed';
    return json({ ok: false, error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

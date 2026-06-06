import { createHmac } from 'node:crypto';

export function signWebhookBody(secret: string, body: string): string {
  const digest = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${digest}`;
}

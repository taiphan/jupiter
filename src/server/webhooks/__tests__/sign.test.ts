import { describe, expect, it } from 'vitest';
import { signWebhookBody } from '../sign';

describe('signWebhookBody', () => {
  it('returns sha256 HMAC prefix', () => {
    const sig = signWebhookBody('secret', '{"event":"test"}');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});

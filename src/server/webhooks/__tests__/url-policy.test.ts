import { describe, expect, it } from 'vitest';
import { isWebhookUrlAllowed } from '../url-policy';

describe('isWebhookUrlAllowed', () => {
  it('allows public https URLs', () => {
    expect(isWebhookUrlAllowed('https://hooks.example.com/jira')).toBe(true);
  });

  it('rejects localhost and private IPs', () => {
    expect(isWebhookUrlAllowed('http://localhost/hook')).toBe(false);
    expect(isWebhookUrlAllowed('http://127.0.0.1/hook')).toBe(false);
    expect(isWebhookUrlAllowed('http://192.168.1.1/hook')).toBe(false);
    expect(isWebhookUrlAllowed('http://10.0.0.1/hook')).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isWebhookUrlAllowed('ftp://example.com/hook')).toBe(false);
  });
});

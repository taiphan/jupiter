import { describe, expect, it } from 'vitest';
import { defaultsFromEnv } from '../auth-settings-types';

describe('auth email defaults', () => {
  it('uses taiphantuan@gmail.com as default test email', () => {
    const prev = { ...process.env };
    process.env.EMAIL_PROVIDER = 'console';
    delete process.env.EMAIL_FROM;
    delete process.env.SMTP_USER;
    const d = defaultsFromEnv();
    expect(d.testEmailTo).toBe('taiphantuan@gmail.com');
    expect(d.mailRedirectTo).toBe('taiphantuan@gmail.com');
    Object.assign(process.env, prev);
  });
});

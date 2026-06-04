import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildAuthEmail } from '../mail-templates';

vi.mock('../config', () => ({
  getAppUrl: () => 'https://app.example.com',
}));

describe('buildAuthEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds verify email with correct subject and link', () => {
    const email = buildAuthEmail('verify_email', 'abc123', 'https://app.example.com');
    expect(email.subject).toBe('Verify your Jupiter account');
    expect(email.text).toContain('https://app.example.com/api/auth/verify?token=abc123');
    expect(email.html).toContain('Verify your email');
    expect(email.subject).not.toContain('abc123');
  });

  it('builds reset email with reset-password path', () => {
    const email = buildAuthEmail('password_reset', 'reset-token', 'https://app.example.com');
    expect(email.subject).toBe('Reset your Jupiter password');
    expect(email.text).toContain('https://app.example.com/reset-password?token=reset-token');
  });
});

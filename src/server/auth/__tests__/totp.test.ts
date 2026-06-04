import { describe, expect, it } from 'vitest';
import { generateSecret, generateSync } from 'otplib';
import { maskTotpSecret, verifyTotpCode } from '../totp';

describe('verifyTotpCode', () => {
  it('accepts a valid code for the current window', () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    expect(verifyTotpCode(secret, token)).toBe(true);
  });

  it('rejects invalid codes', () => {
    const secret = generateSecret();
    expect(verifyTotpCode(secret, '000000')).toBe(false);
    expect(verifyTotpCode(secret, 'abc')).toBe(false);
  });
});

describe('maskTotpSecret', () => {
  it('masks long secrets', () => {
    const secret = generateSecret();
    expect(maskTotpSecret(secret)).toMatch(/^.{4}/);
    expect(maskTotpSecret(secret)).toContain('…');
  });
});

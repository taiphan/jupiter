import { describe, expect, it, vi, beforeEach } from 'vitest';
import { decryptAtRest, encryptAtRest } from '../crypto';

vi.mock('../config', () => ({
  getAuthSecret: () => 'test-auth-secret-for-unit-tests',
}));

describe('encryptAtRest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('round-trips a TOTP secret', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = encryptAtRest(plain);
    expect(enc).not.toContain(plain);
    expect(decryptAtRest(enc)).toBe(plain);
  });

  it('returns null for tampered ciphertext', () => {
    expect(decryptAtRest('aa:bb:cc')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeEmail, usernameFromEmail } from '../email-normalize';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Admin@Acme.dev ')).toBe('admin@acme.dev');
  });
});

describe('usernameFromEmail', () => {
  it('uses local part', () => {
    expect(usernameFromEmail('maya.chen@acme.dev')).toBe('maya_chen');
  });
});

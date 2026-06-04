import { describe, expect, it } from 'vitest';
import { loginBodySchema, registerBodySchema } from '../schemas';

describe('loginBodySchema', () => {
  it('accepts valid email', () => {
    const r = loginBodySchema.safeParse({ email: 'a@b.co', password: 'secret12' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('a@b.co');
  });

  it('rejects invalid email', () => {
    expect(loginBodySchema.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false);
  });
});

describe('registerBodySchema', () => {
  it('requires 8 char password', () => {
    expect(
      registerBodySchema.safeParse({ email: 'a@b.co', password: 'short', name: 'A' }).success,
    ).toBe(false);
  });
});

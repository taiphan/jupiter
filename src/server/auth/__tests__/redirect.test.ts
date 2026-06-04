import { describe, expect, it } from 'vitest';
import { sanitizePostAuthRedirect } from '../redirect';

describe('sanitizePostAuthRedirect', () => {
  it('allows root and projects', () => {
    expect(sanitizePostAuthRedirect('/')).toBe('/');
    expect(sanitizePostAuthRedirect('/projects')).toBe('/projects');
    expect(sanitizePostAuthRedirect('/projects/WEB')).toBe('/projects/WEB');
  });

  it('blocks external and protocol-relative', () => {
    expect(sanitizePostAuthRedirect('https://evil.com')).toBe('/');
    expect(sanitizePostAuthRedirect('//evil.com')).toBe('/');
  });

  it('blocks unknown paths', () => {
    expect(sanitizePostAuthRedirect('/admin/secret')).toBe('/');
  });
});

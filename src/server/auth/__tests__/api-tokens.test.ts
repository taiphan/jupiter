import { describe, expect, it } from 'vitest';
import { generateApiToken, hashToken, tokensMatch } from '../api-tokens';

describe('api-tokens', () => {
  it('generates jpt_ prefixed tokens and verifies hash', () => {
    const { raw, prefix, hash } = generateApiToken();
    expect(raw.startsWith('jpt_')).toBe(true);
    expect(prefix).toBe(raw.slice(0, 12));
    expect(tokensMatch(hash, raw)).toBe(true);
    expect(tokensMatch(hash, 'jpt_wrong')).toBe(false);
  });

  it('hashToken is stable', () => {
    const raw = 'jpt_testtoken123';
    expect(hashToken(raw)).toBe(hashToken(raw));
  });
});

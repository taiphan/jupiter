import { describe, expect, it } from 'vitest';
import { decodeAuditCursor, encodeAuditCursor } from '../audit';

describe('audit cursor codec', () => {
  it('round-trips issue source', () => {
    const encoded = encodeAuditCursor('2026-06-01T12:00:00.000Z', 'act_abc', 'issue');
    const decoded = decodeAuditCursor(encoded);
    expect(decoded?.source).toBe('issue');
    expect(decoded?.id).toBe('act_abc');
    expect(decoded?.createdAt.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('returns null for invalid cursor', () => {
    expect(decodeAuditCursor('not-valid')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  diffMentionRecipients,
  parseMentions,
  type MentionToken,
} from '../mentions';

// ─── Unit tests for parseMentions (Req 12.1, 12.5) ─────────────────────────

describe('parseMentions — examples', () => {
  it('returns an empty array for an empty body', () => {
    expect(parseMentions('')).toEqual([]);
  });

  it('returns an empty array when there are no @-tokens', () => {
    expect(parseMentions('Just a plain comment with no mentions.')).toEqual([]);
  });

  it('parses a simple lowercase @alice mention', () => {
    const body = 'hello @alice please review';
    const tokens = parseMentions(body);
    expect(tokens).toEqual<MentionToken[]>([
      { username: 'alice', offset: 6, length: 6 },
    ]);
    // The slice at offset/length recovers the original token.
    expect(body.slice(tokens[0].offset, tokens[0].offset + tokens[0].length)).toBe('@alice');
  });

  it('parses underscore and digit usernames like @bob_42', () => {
    const tokens = parseMentions('cc @bob_42 thanks');
    expect(tokens).toEqual<MentionToken[]>([
      { username: 'bob_42', offset: 3, length: 7 },
    ]);
  });

  it('parses hyphenated usernames like @user-name', () => {
    const tokens = parseMentions('hey @user-name');
    expect(tokens).toEqual<MentionToken[]>([
      { username: 'user-name', offset: 4, length: 10 },
    ]);
  });

  it('lowercases @Alice → alice (case-insensitive on input)', () => {
    const tokens = parseMentions('@Alice and @BOB_42');
    expect(tokens).toEqual<MentionToken[]>([
      { username: 'alice', offset: 0, length: 6 },
      { username: 'bob_42', offset: 11, length: 7 },
    ]);
  });

  it('rejects too-short usernames (< 2 chars): @a yields no tokens', () => {
    expect(parseMentions('hello @a there')).toEqual([]);
  });

  it('rejects too-long usernames (> 32 chars) outright', () => {
    // 33 valid characters after the @: should not match.
    const tooLong = 'a'.repeat(33);
    expect(parseMentions(`hello @${tooLong} there`)).toEqual([]);
  });

  it('accepts the boundary length of 32 characters', () => {
    const exactly32 = 'a'.repeat(32);
    const tokens = parseMentions(`hello @${exactly32}`);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].username).toBe(exactly32);
    expect(tokens[0].length).toBe(33);
  });

  it('skips email-like patterns: alice@example.com yields no mention', () => {
    expect(parseMentions('contact alice@example.com for details')).toEqual([]);
  });

  it('parses a mention right after newline or punctuation', () => {
    const tokens = parseMentions('Reviewers:\n@alice, @bob_42!');
    expect(tokens.map((t) => t.username)).toEqual(['alice', 'bob_42']);
  });

  it('parses a mention at the very start of the body', () => {
    const tokens = parseMentions('@alice fix this');
    expect(tokens).toEqual<MentionToken[]>([
      { username: 'alice', offset: 0, length: 6 },
    ]);
  });

  it('returns multiple tokens preserving offset and document order', () => {
    const body = '@alice review and @bob_42 and again @alice';
    const tokens = parseMentions(body);
    expect(tokens).toHaveLength(3);
    expect(tokens.map((t) => t.username)).toEqual(['alice', 'bob_42', 'alice']);
    // Offsets must be strictly increasing in document order.
    expect(tokens[0].offset).toBeLessThan(tokens[1].offset);
    expect(tokens[1].offset).toBeLessThan(tokens[2].offset);
    // And every offset/length pair recovers an `@username` substring.
    for (const token of tokens) {
      expect(body.slice(token.offset, token.offset + token.length)).toBe(`@${body.slice(token.offset + 1, token.offset + token.length)}`);
    }
  });

  it('does not double-fire on @@username', () => {
    // The second `@` is preceded by `@`, which the email guard treats as a
    // non-mention boundary. Only one mention should be emitted, starting
    // at the first `@`. But `@@` at the head means the first `@` is followed
    // by `@`, which is not a valid username start either, so the result is
    // simply: no mentions.
    const tokens = parseMentions('@@alice');
    expect(tokens).toEqual([]);
  });
});

// ─── Unit tests for diffMentionRecipients (Req 12.4, 12.6) ─────────────────

describe('diffMentionRecipients — examples', () => {
  // A minimal resolver: maps known usernames to ids; everything else is null.
  const resolver = (u: string): string | null => {
    const map: Record<string, string> = {
      alice: 'usr_alice',
      bob_42: 'usr_bob',
      carol: 'usr_carol',
    };
    return map[u] ?? null;
  };

  it('returns empty arrays for two empty bodies', () => {
    expect(diffMentionRecipients([], [], resolver)).toEqual({
      newlyMentionedIds: [],
      previouslyMentionedIds: [],
    });
  });

  it('treats a fresh creation (empty prev) as everyone-is-new', () => {
    const next = parseMentions('@alice and @bob_42');
    const result = diffMentionRecipients([], next, resolver);
    expect(result.previouslyMentionedIds).toEqual([]);
    expect(result.newlyMentionedIds).toEqual(['usr_alice', 'usr_bob']);
  });

  it('does not re-notify a user who was already mentioned in prev', () => {
    const prev = parseMentions('hi @alice');
    const next = parseMentions('hi @alice and @bob_42');
    const result = diffMentionRecipients(prev, next, resolver);
    expect(result.previouslyMentionedIds).toEqual(['usr_alice']);
    expect(result.newlyMentionedIds).toEqual(['usr_bob']);
  });

  it('drops unknown usernames from both sides (Req 12.5)', () => {
    const prev = parseMentions('hi @ghostuser');
    const next = parseMentions('hi @ghostuser and @alice');
    const result = diffMentionRecipients(prev, next, resolver);
    expect(result.previouslyMentionedIds).toEqual([]);
    expect(result.newlyMentionedIds).toEqual(['usr_alice']);
  });

  it('deduplicates recipients within next (alice mentioned twice → one id)', () => {
    const next = parseMentions('@alice please look at this @alice');
    const result = diffMentionRecipients([], next, resolver);
    expect(result.newlyMentionedIds).toEqual(['usr_alice']);
  });

  it('preserves document order in the returned id arrays', () => {
    const next = parseMentions('@carol then @alice then @bob_42');
    const result = diffMentionRecipients([], next, resolver);
    expect(result.newlyMentionedIds).toEqual(['usr_carol', 'usr_alice', 'usr_bob']);
  });

  it('removing a mention from next does not produce a "newly" entry for them', () => {
    const prev = parseMentions('@alice and @bob_42');
    const next = parseMentions('@alice only');
    const result = diffMentionRecipients(prev, next, resolver);
    expect(result.previouslyMentionedIds).toEqual(['usr_alice', 'usr_bob']);
    expect(result.newlyMentionedIds).toEqual([]);
  });
});

// ─── Property test (design.md Property 10) ─────────────────────────────────

describe('diffMentionRecipients — Property 10 (mention diff never re-notifies)', () => {
  // A small alphabet of usernames keeps the search space dense enough that
  // edits frequently overlap with prev mentions. Half of the names map to
  // ids; the other half remain unknown so we exercise Req 12.5 too.
  const KNOWN_NAMES = ['alice', 'bob_42', 'carol', 'dave-1', 'eve_'];
  const UNKNOWN_NAMES = ['ghost', 'phantom', 'nobody'];
  const ALL_NAMES = [...KNOWN_NAMES, ...UNKNOWN_NAMES];

  const resolver = (u: string): string | null => {
    const idx = KNOWN_NAMES.indexOf(u);
    if (idx === -1) return null;
    return `usr_${u}`;
  };

  // Build a body that interleaves random plain text with random mentions.
  // We construct the body from token strings so the resulting tokens are
  // guaranteed to parse — this keeps the property focused on the diff
  // helper rather than on parser edge cases (which have their own tests).
  type Segment = { kind: 'text'; text: string } | { kind: 'mention'; username: string };
  const segmentArb: fc.Arbitrary<Segment> = fc.oneof(
    // Non-empty text without `@`, bounded to keep bodies small.
    fc
      .string({ minLength: 1, maxLength: 12 })
      .map((s) => s.replace(/@/g, ''))
      .filter((s) => s.length > 0)
      .map((text) => ({ kind: 'text', text } as const)),
    fc.constantFrom(...ALL_NAMES).map((username) => ({ kind: 'mention', username } as const)),
  );

  function renderBody(segments: readonly Segment[]): string {
    // Insert a single space between segments so adjacent mentions don't
    // collapse into longer runs of valid username characters that would
    // change the tokenizer's behavior.
    return segments
      .map((s) => (s.kind === 'mention' ? `@${s.username}` : s.text))
      .join(' ');
  }

  /**
   * Validates: Requirements 12.4, 12.6 and design.md Property 10 — for any
   * pair of edits (prev, next) the diff helper returns a `newlyMentionedIds`
   * set that is disjoint from the recipient set computed from `prev` via
   * the same resolver.
   */
  it('newlyMentionedIds is disjoint from prev recipients across random edit pairs', () => {
    fc.assert(
      fc.property(
        fc.array(segmentArb, { maxLength: 16 }),
        fc.array(segmentArb, { maxLength: 16 }),
        (prevSegs, nextSegs) => {
          const prevTokens = parseMentions(renderBody(prevSegs));
          const nextTokens = parseMentions(renderBody(nextSegs));

          const { newlyMentionedIds, previouslyMentionedIds } = diffMentionRecipients(
            prevTokens,
            nextTokens,
            resolver,
          );

          // Property 10: disjointness.
          const prevSet = new Set(previouslyMentionedIds);
          for (const id of newlyMentionedIds) {
            if (prevSet.has(id)) return false;
          }

          // Two ancillary invariants the helper claims:
          //  (a) newlyMentionedIds are unique within themselves.
          if (new Set(newlyMentionedIds).size !== newlyMentionedIds.length) return false;
          //  (b) every id in newlyMentionedIds resolves from some token in next.
          const nextResolved = new Set<string>();
          for (const t of nextTokens) {
            const id = resolver(t.username);
            if (id !== null) nextResolved.add(id);
          }
          for (const id of newlyMentionedIds) {
            if (!nextResolved.has(id)) return false;
          }
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});

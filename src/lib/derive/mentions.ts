/**
 * Pure helpers for the mention parser and recipient diff (Req 12.1, 12.4,
 * 12.5, 12.6).
 *
 * `parseMentions` walks an Issue description or Comment body and returns
 * every recognized `@<username>` token in document order. Each token
 * preserves its offset and length so callers can render chips, highlight
 * unknown tokens (Req 12.5), or apply the 50-mention cap in document order
 * (Req 12.7) without re-scanning the body.
 *
 * `diffMentionRecipients` takes the parsed token arrays from the previous
 * and next saved versions of the same body, plus a `resolveUsername`
 * function that maps a canonical lowercase username to an active User id
 * (or `null` for unknown), and returns the recipient ids newly introduced
 * by the edit. The notification fan-out path (task 20, Req 12.6) consumes
 * `newlyMentionedIds`; the audit path can use `previouslyMentionedIds` to
 * surface "removed mention" hints.
 *
 * **Pure.** No I/O, no clock, no DOM. Both helpers run inside the Zustand
 * mutation path and inside `fast-check` property tests.
 *
 * **Document order.** Tokens are returned in the order their `@` sigil
 * appears in the body. Duplicates within the same body are preserved —
 * the renderer needs every chip position, and the cap-at-50 step in task
 * 20 reads the first 50 *distinct* recipient ids in document order. The
 * diff helper deduplicates recipients itself by walking `next`'s tokens in
 * order and skipping any id already accumulated.
 *
 * **Email guard.** A plain run-of-the-mill `@` after a word character is
 * the email-local-domain separator (e.g. `alice@example.com`). We refuse
 * to recognize such an `@` as a mention sigil. The rule is: the `@` must
 * be at the start of the body or follow a character that is neither a
 * word character (`[A-Za-z0-9_]`) nor another `@`.
 *
 * **Length guard.** Username matches are bounded on both sides. We refuse
 * partial matches that would truncate a longer run of valid username
 * characters — `@toolong<33+chars>` is rejected outright rather than
 * silently parsed as the first 32 characters. Callers therefore see a
 * clean "valid mention" / "no mention" decision.
 *
 * **Case-insensitivity.** Per Req 12.1 usernames are canonical lowercase.
 * The token returned by `parseMentions` is already lowercased so callers
 * pass it straight to `resolveUsername` without re-normalizing.
 */

/**
 * One `@username` token recognized in a body. The `username` is canonical
 * lowercase. `offset` is the index of the leading `@`. `length` is the
 * number of characters in the token including the `@` (so the matched
 * substring is `body.slice(offset, offset + length)`).
 */
export interface MentionToken {
  username: string;
  offset: number;
  length: number;
}

/**
 * Mention sigil + username pattern (Req 12.1).
 *
 * - `(?<=^|[^A-Za-z0-9_@])` — start of body, or a character that is neither
 *   a word character nor another `@`. This is the email guard:
 *   `alice@example.com` does not match because `@` is preceded by `e`, and
 *   `@@alice` does not double-fire because the second `@` sits behind an
 *   `@`.
 * - `@` — the literal sigil.
 * - `([A-Za-z0-9_-]{2,32})` — the username, 2–32 chars in the
 *   case-insensitive form of `[a-z0-9_-]{2,32}` from the requirement.
 * - `(?![A-Za-z0-9_-])` — the username must not be the prefix of a longer
 *   run of valid username characters; otherwise we'd silently truncate
 *   33+-char tokens to 32 and accept them.
 *
 * The `g` flag drives `String.prototype.matchAll` so we can iterate every
 * occurrence; the `u` flag enables proper Unicode handling for the
 * lookbehind/lookahead.
 */
const MENTION_PATTERN = /(?<=^|[^A-Za-z0-9_@])@([A-Za-z0-9_-]{2,32})(?![A-Za-z0-9_-])/gu;

/**
 * Parse every `@username` mention out of an Issue description or Comment
 * body, in document order, with duplicates preserved.
 *
 * @param body The raw body. May be empty.
 * @returns The list of recognized tokens. Empty when the body has no
 *   mentions, when every `@` is part of an email-like pattern, or when
 *   every candidate username is too short / too long to qualify.
 */
export function parseMentions(body: string): MentionToken[] {
  if (!body) return [];

  const tokens: MentionToken[] = [];
  // Reset lastIndex defensively even though MENTION_PATTERN is re-created
  // per module load — `matchAll` on a sticky/global regex is safe but the
  // explicit reset documents the intent.
  for (const match of body.matchAll(MENTION_PATTERN)) {
    if (match.index === undefined) continue;
    const captured = match[1];
    if (!captured) continue;
    tokens.push({
      username: captured.toLowerCase(),
      offset: match.index,
      length: 1 + captured.length, // +1 for the leading '@'
    });
  }
  return tokens;
}

/**
 * Compute the ordered, deduplicated set of recipient ids that the given
 * tokens resolve to under `resolveUsername`. Order follows first
 * occurrence in `tokens`. Tokens that resolve to `null` (unknown
 * username, Req 12.5) contribute nothing.
 */
function resolveRecipientIds(
  tokens: readonly MentionToken[],
  resolveUsername: (username: string) => string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const id = resolveUsername(token.username);
    if (id === null) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Diff the recipient sets of the previous and next saved versions of a
 * body and return the recipient ids that should receive a `mentioned`
 * Notification (Req 12.4, 12.6).
 *
 * The contract — Property 10 in design.md:
 *   newlyMentionedIds ∩ previouslyRecipientSet(prev, resolveUsername) = ∅
 *
 * Concretely: an edit can never re-notify a User who was already a
 * recipient under `prev`, even if their token was kept verbatim, moved,
 * duplicated, or surrounded by edits. The 50-recipient cap (Req 12.7) is
 * applied by the caller (task 20) on the returned `newlyMentionedIds`
 * list — this helper is independent of that cap so the same diff can
 * drive both the notification path and the audit path.
 *
 * Both returned arrays preserve document order:
 * - `newlyMentionedIds` follows first occurrence in `next`.
 * - `previouslyMentionedIds` follows first occurrence in `prev`.
 *
 * @param prev The mention tokens from the previously saved version of the
 *   body. Pass an empty array when the entity is being created.
 * @param next The mention tokens from the version being saved.
 * @param resolveUsername Maps a canonical lowercase username to an active
 *   User id, or returns `null` when the username does not resolve.
 *   Callers typically close over the active membership list.
 */
export function diffMentionRecipients(
  prev: readonly MentionToken[],
  next: readonly MentionToken[],
  resolveUsername: (username: string) => string | null,
): { newlyMentionedIds: string[]; previouslyMentionedIds: string[] } {
  const previouslyMentionedIds = resolveRecipientIds(prev, resolveUsername);
  const previouslySet = new Set(previouslyMentionedIds);
  const nextRecipients = resolveRecipientIds(next, resolveUsername);
  const newlyMentionedIds = nextRecipients.filter((id) => !previouslySet.has(id));
  return { newlyMentionedIds, previouslyMentionedIds };
}

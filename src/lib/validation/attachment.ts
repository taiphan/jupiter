/**
 * Attachment upload validation (Jupiter v1.1).
 *
 * Validates Requirements 5.3, 5.4, 11.2:
 *   - 5.3: Accepted MIME types are a fixed common subset.
 *   - 5.4: Max upload size is 25 MB per file.
 *   - 11.2: Reject mismatched extensions vs declared MIME type.
 *
 * Property 7 (design.md): the mime/size guard is total — every upload entry
 * point (drag-drop, picker, paste) routes through `validateUpload`. The
 * function is pure, never throws, and returns a discriminated union so
 * callers must handle the rejection branch explicitly.
 */

/** Maximum upload size per file: 25 MB (Req 5.4). */
export const MAX_BYTES = 25 * 1024 * 1024;

/** Allowed MIME types per Req 5.3. Frozen so callers can't mutate it. */
export const ALLOWED_MIME = Object.freeze(
  new Set<string>([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'application/zip',
  ]),
) as ReadonlySet<string>;

/**
 * Filename-extension → declared MIME mapping for the allowed set.
 * Each extension maps to the exact MIME its filename should declare.
 * Multiple extensions can share the same MIME (e.g. .jpg and .jpeg).
 */
const EXTENSION_TO_MIME: ReadonlyMap<string, string> = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['pdf', 'application/pdf'],
  ['txt', 'text/plain'],
  ['csv', 'text/csv'],
  ['md', 'text/markdown'],
  ['markdown', 'text/markdown'],
  ['json', 'application/json'],
  ['zip', 'application/zip'],
]);

export interface ValidateUploadInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export type ValidateUploadReason =
  | 'invalid_filename'
  | 'invalid_size'
  | 'file_too_large'
  | 'unsupported_mime'
  | 'extension_mime_mismatch';

export type ValidateUploadResult =
  | { ok: true }
  | { ok: false; reason: ValidateUploadReason };

/**
 * Extract the lowercase extension from a filename, or `null` if none is
 * present. Strips trailing dots and collapses leading paths so values like
 * `"some/dir/file.PNG"` and `"file.tar.gz"` are handled deterministically
 * (last extension wins, lowercased).
 */
function extractExtension(filename: string): string | null {
  // Take the basename only — defends against `"path/to/file.png"` confusing the lookup.
  const lastSlash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const basename = lastSlash >= 0 ? filename.slice(lastSlash + 1) : filename;

  const lastDot = basename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === basename.length - 1) {
    // No dot, dotfile (`.env`), or trailing dot (`file.`) — no usable extension.
    return null;
  }
  const ext = basename.slice(lastDot + 1).toLowerCase();
  return ext.length > 0 ? ext : null;
}

/**
 * Validate an attachment upload against the Jupiter v1.1 acceptance rules.
 *
 * Returns a discriminated union; callers MUST inspect `.ok` before reading
 * `.reason`. The function never throws — Property 7 (totality) requires that
 * any input pair `(filename, mimeType, sizeBytes)` produce a definite outcome.
 */
export function validateUpload(input: ValidateUploadInput): ValidateUploadResult {
  const { filename, mimeType, sizeBytes } = input;

  // 1) Filename presence and shape.
  if (typeof filename !== 'string' || filename.trim().length === 0) {
    return { ok: false, reason: 'invalid_filename' };
  }

  // 2) Size sanity: must be a finite positive integer.
  if (
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes) ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    return { ok: false, reason: 'invalid_size' };
  }

  // 3) Size cap (Req 5.4).
  if (sizeBytes > MAX_BYTES) {
    return { ok: false, reason: 'file_too_large' };
  }

  // 4) MIME allow-list (Req 5.3).
  if (typeof mimeType !== 'string' || !ALLOWED_MIME.has(mimeType)) {
    return { ok: false, reason: 'unsupported_mime' };
  }

  // 5) Extension must match the declared MIME (Req 11.2).
  const ext = extractExtension(filename);
  if (ext === null) {
    return { ok: false, reason: 'extension_mime_mismatch' };
  }
  const expectedMime = EXTENSION_TO_MIME.get(ext);
  if (expectedMime !== mimeType) {
    return { ok: false, reason: 'extension_mime_mismatch' };
  }

  return { ok: true };
}

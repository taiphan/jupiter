import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  ALLOWED_MIME,
  MAX_BYTES,
  validateUpload,
  type ValidateUploadResult,
} from '../attachment';

// Filename + matching MIME pairs for the full allowed set (Req 5.3).
const HAPPY_PATH_CASES: ReadonlyArray<{
  filename: string;
  mimeType: string;
}> = [
  { filename: 'screenshot.png', mimeType: 'image/png' },
  { filename: 'photo.jpg', mimeType: 'image/jpeg' },
  { filename: 'photo.jpeg', mimeType: 'image/jpeg' },
  { filename: 'animation.gif', mimeType: 'image/gif' },
  { filename: 'cover.webp', mimeType: 'image/webp' },
  { filename: 'spec.pdf', mimeType: 'application/pdf' },
  { filename: 'notes.txt', mimeType: 'text/plain' },
  { filename: 'export.csv', mimeType: 'text/csv' },
  { filename: 'README.md', mimeType: 'text/markdown' },
  { filename: 'manifest.markdown', mimeType: 'text/markdown' },
  { filename: 'payload.json', mimeType: 'application/json' },
  { filename: 'bundle.zip', mimeType: 'application/zip' },
];

describe('attachment validation constants', () => {
  it('exposes 25 MB as MAX_BYTES (Req 5.4)', () => {
    expect(MAX_BYTES).toBe(25 * 1024 * 1024);
  });

  it('exposes the exact allowed MIME set (Req 5.3)', () => {
    expect([...ALLOWED_MIME].sort()).toEqual(
      [
        'application/json',
        'application/pdf',
        'application/zip',
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/csv',
        'text/markdown',
        'text/plain',
      ].sort(),
    );
  });
});

describe('validateUpload — happy path per allowed mime (Req 5.3)', () => {
  for (const { filename, mimeType } of HAPPY_PATH_CASES) {
    it(`accepts ${filename} as ${mimeType}`, () => {
      expect(validateUpload({ filename, mimeType, sizeBytes: 1024 })).toEqual({
        ok: true,
      });
    });
  }

  it('accepts a file at exactly MAX_BYTES (boundary)', () => {
    expect(
      validateUpload({
        filename: 'big.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MAX_BYTES,
      }),
    ).toEqual({ ok: true });
  });
});

describe('validateUpload — rejection branches', () => {
  it('rejects empty filename with invalid_filename', () => {
    expect(
      validateUpload({ filename: '', mimeType: 'image/png', sizeBytes: 10 }),
    ).toEqual({ ok: false, reason: 'invalid_filename' });
  });

  it('rejects whitespace-only filename with invalid_filename', () => {
    expect(
      validateUpload({ filename: '   ', mimeType: 'image/png', sizeBytes: 10 }),
    ).toEqual({ ok: false, reason: 'invalid_filename' });
  });

  it('rejects zero size with invalid_size', () => {
    expect(
      validateUpload({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 0,
      }),
    ).toEqual({ ok: false, reason: 'invalid_size' });
  });

  it('rejects negative size with invalid_size', () => {
    expect(
      validateUpload({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: -1,
      }),
    ).toEqual({ ok: false, reason: 'invalid_size' });
  });

  it('rejects non-integer size with invalid_size', () => {
    expect(
      validateUpload({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 1.5,
      }),
    ).toEqual({ ok: false, reason: 'invalid_size' });
  });

  it('rejects NaN size with invalid_size', () => {
    expect(
      validateUpload({
        filename: 'a.png',
        mimeType: 'image/png',
        sizeBytes: Number.NaN,
      }),
    ).toEqual({ ok: false, reason: 'invalid_size' });
  });

  it('rejects size above MAX_BYTES with file_too_large (Req 5.4)', () => {
    expect(
      validateUpload({
        filename: 'huge.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MAX_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: 'file_too_large' });
  });

  it('rejects an unsupported MIME with unsupported_mime (Req 5.3)', () => {
    expect(
      validateUpload({
        filename: 'malware.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'unsupported_mime' });
  });

  it('rejects a known extension paired with the wrong MIME (Req 11.2)', () => {
    // .png filename declared as image/jpeg — both are individually allowed,
    // but the pair is mismatched.
    expect(
      validateUpload({
        filename: 'shot.png',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'extension_mime_mismatch' });
  });

  it('rejects a filename with no extension as extension_mime_mismatch', () => {
    expect(
      validateUpload({
        filename: 'README',
        mimeType: 'text/markdown',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'extension_mime_mismatch' });
  });

  it('rejects a filename ending in a dot as extension_mime_mismatch', () => {
    expect(
      validateUpload({
        filename: 'weird.',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'extension_mime_mismatch' });
  });

  it('rejects a dotfile (no real extension) as extension_mime_mismatch', () => {
    expect(
      validateUpload({
        filename: '.env',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'extension_mime_mismatch' });
  });

  it('treats extensions case-insensitively', () => {
    expect(
      validateUpload({
        filename: 'PHOTO.JPG',
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
      }),
    ).toEqual({ ok: true });
  });
});

describe('validateUpload — Property 7 (totality)', () => {
  // Generators that intentionally over-produce inputs that are mostly invalid
  // so the property exercises both branches of the discriminated union.
  const allowedMimeArb = fc.constantFrom(...ALLOWED_MIME);
  const arbitraryMimeArb = fc.oneof(
    allowedMimeArb,
    fc.constantFrom(
      'application/x-msdownload',
      'video/mp4',
      'audio/mpeg',
      'text/html',
      '',
    ),
    fc.string({ minLength: 1, maxLength: 30 }),
  );

  const filenameArb = fc.oneof(
    // Plausible filenames with a known extension.
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 16 }).filter((s) => !/[\\/.]/.test(s)),
      fc.constantFrom('png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'csv', 'md', 'markdown', 'json', 'zip', 'exe', 'bin'),
    ).map(([base, ext]) => `${base}.${ext}`),
    // Pathological cases the validator must still classify, not throw on.
    fc.constantFrom('', '   ', 'README', '.env', 'weird.', 'a/b/c.png', 'multi.tar.gz'),
    // Random strings.
    fc.string({ maxLength: 24 }),
  );

  const sizeArb = fc.oneof(
    fc.integer({ min: 1, max: MAX_BYTES }),
    fc.integer({ min: MAX_BYTES + 1, max: MAX_BYTES * 4 }),
    fc.integer({ min: -1000, max: 0 }),
    fc.double({ min: -10, max: 10, noNaN: false }),
  );

  /**
   * Validates: Requirements 5.3, 5.4, 11.2 (Property 7 — totality of the guard).
   * For any combination of inputs, validateUpload returns either
   * `{ ok: true }` or `{ ok: false, reason }` and never throws. The reason,
   * when present, is one of the documented literals.
   */
  it('returns a discriminated union for every input and never throws', () => {
    fc.assert(
      fc.property(filenameArb, arbitraryMimeArb, sizeArb, (filename, mimeType, sizeBytes) => {
        let result: ValidateUploadResult;
        try {
          result = validateUpload({ filename, mimeType, sizeBytes });
        } catch {
          // Totality violation: surface as a property failure.
          return false;
        }

        if (result.ok === true) {
          // Successful upload must exactly match the declared rules.
          if (typeof filename !== 'string' || filename.trim().length === 0) return false;
          if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) return false;
          if (sizeBytes > MAX_BYTES) return false;
          if (!ALLOWED_MIME.has(mimeType)) return false;
          return true;
        }

        // Rejection: reason must be one of the documented literals.
        return (
          result.reason === 'invalid_filename' ||
          result.reason === 'invalid_size' ||
          result.reason === 'file_too_large' ||
          result.reason === 'unsupported_mime' ||
          result.reason === 'extension_mime_mismatch'
        );
      }),
      { numRuns: 500 },
    );
  });
});

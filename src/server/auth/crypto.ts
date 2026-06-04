import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { getAuthSecret } from './config';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_SALT = 'jupiter-totp-v1';

function deriveKey(): Buffer {
  return scryptSync(getAuthSecret(), KEY_SALT, 32);
}

/** Encrypt a string for storage (format: iv:tag:ciphertext hex). */
export function encryptAtRest(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptAtRest(stored: string): string | null {
  const [ivHex, tagHex, dataHex] = stored.split(':');
  if (!ivHex || !tagHex || !dataHex) return null;
  try {
    const key = deriveKey();
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

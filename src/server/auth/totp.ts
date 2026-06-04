import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { getDb, schema } from '@/server/db/client';
import type { DbUser } from '@/server/db/schema';
import { encryptAtRest, decryptAtRest } from './crypto';
import { hashPassword, verifyPassword } from './password';

const ISSUER = 'Jupiter';
const BACKUP_CODE_COUNT = 10;

export function userHas2faEnabled(user: DbUser): boolean {
  return Boolean(user.totpEnabledAt && user.totpSecret);
}

export function maskTotpSecret(secret: string): string {
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function startTotpSetup(user: DbUser): Promise<{
  otpauthUrl: string;
  secretMasked: string;
  qrDataUrl: string;
  manualKey: string;
}> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const secret = generateSecret();
  const encrypted = encryptAtRest(secret);

  await db
    .update(schema.users)
    .set({ totpPendingSecret: encrypted })
    .where(eq(schema.users.id, user.id));

  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    otpauthUrl,
    secretMasked: maskTotpSecret(secret),
    qrDataUrl,
    manualKey: secret,
  };
}

function readPendingSecret(user: DbUser): string | null {
  if (!user.totpPendingSecret) return null;
  return decryptAtRest(user.totpPendingSecret);
}

function readActiveSecret(user: DbUser): string | null {
  if (!user.totpSecret) return null;
  return decryptAtRest(user.totpSecret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = verifySync({ secret, token: normalized, epochTolerance: 30 });
  return result.valid;
}

function newBackupCode(): string {
  const part = () => randomBytes(2).toString('hex').toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

export async function enableTotp(
  user: DbUser,
  code: string,
): Promise<{ backupCodes: string[] } | { error: string }> {
  const db = getDb();
  if (!db) return { error: 'Database not configured' };

  const pending = readPendingSecret(user);
  if (!pending) return { error: 'Start 2FA setup first' };
  if (!verifyTotpCode(pending, code)) return { error: 'Invalid code' };

  const encrypted = encryptAtRest(pending);
  await db
    .update(schema.users)
    .set({
      totpSecret: encrypted,
      totpPendingSecret: null,
      totpEnabledAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  await db.delete(schema.totpBackupCodes).where(eq(schema.totpBackupCodes.userId, user.id));

  const backupCodes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const plain = newBackupCode();
    backupCodes.push(plain);
    await db.insert(schema.totpBackupCodes).values({
      id: `tbc_${randomBytes(8).toString('hex')}`,
      userId: user.id,
      codeHash: await hashPassword(plain.replace(/-/g, '').toLowerCase()),
    });
  }

  return { backupCodes };
}

export async function verifyBackupCode(userId: string, raw: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const normalized = raw.replace(/\s/g, '').replace(/-/g, '').toLowerCase();
  if (normalized.length < 8) return false;

  const rows = await db
    .select()
    .from(schema.totpBackupCodes)
    .where(eq(schema.totpBackupCodes.userId, userId));

  for (const row of rows) {
    if (row.usedAt) continue;
    if (await verifyPassword(normalized, row.codeHash)) {
      await db
        .update(schema.totpBackupCodes)
        .set({ usedAt: new Date() })
        .where(eq(schema.totpBackupCodes.id, row.id));
      return true;
    }
  }
  return false;
}

export async function verifyUserTotpOrBackup(
  user: DbUser,
  input: { code?: string; backupCode?: string },
): Promise<boolean> {
  if (input.backupCode?.trim()) {
    return verifyBackupCode(user.id, input.backupCode.trim());
  }
  const secret = readActiveSecret(user);
  if (!secret || !input.code) return false;
  return verifyTotpCode(secret, input.code);
}

export async function disableTotp(
  user: DbUser,
  password: string,
  code: string,
  backupCode?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: 'Database not configured' };
  if (!user.passwordHash) return { ok: false, error: 'Set a password before disabling 2FA' };
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: 'Invalid password' };
  }
  if (!userHas2faEnabled(user)) return { ok: false, error: '2FA is not enabled' };

  const valid = await verifyUserTotpOrBackup(user, { code, backupCode });
  if (!valid) return { ok: false, error: 'Invalid authentication code' };

  await db
    .update(schema.users)
    .set({
      totpSecret: null,
      totpPendingSecret: null,
      totpEnabledAt: null,
    })
    .where(eq(schema.users.id, user.id));

  await db.delete(schema.totpBackupCodes).where(eq(schema.totpBackupCodes.userId, user.id));

  return { ok: true };
}

export async function regenerateBackupCodes(
  user: DbUser,
  password: string,
  code: string,
): Promise<{ backupCodes: string[] } | { error: string }> {
  const db = getDb();
  if (!db) return { error: 'Database not configured' };
  if (!user.passwordHash) return { error: 'Password required' };
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Invalid password' };
  }
  if (!userHas2faEnabled(user)) return { error: '2FA is not enabled' };
  const secret = readActiveSecret(user);
  if (!secret || !verifyTotpCode(secret, code)) return { error: 'Invalid code' };

  await db.delete(schema.totpBackupCodes).where(eq(schema.totpBackupCodes.userId, user.id));

  const backupCodes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const plain = newBackupCode();
    backupCodes.push(plain);
    await db.insert(schema.totpBackupCodes).values({
      id: `tbc_${randomBytes(8).toString('hex')}`,
      userId: user.id,
      codeHash: await hashPassword(plain.replace(/-/g, '').toLowerCase()),
    });
  }

  return { backupCodes };
}

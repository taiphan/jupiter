/**
 * Integration smoke test for v1.6–v1.10 auth (API + optional Gmail SMTP).
 * Usage:
 *   set -a && source .env.vercel.local && source .env.local && set +a
 *   npx tsx scripts/test-auth-integration.mts
 *
 * Set SMTP_PASS in .env.local to test real email delivery.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSecret, generateSync } from 'otplib';

const BASE = process.env.APP_URL ?? 'http://localhost:3100';

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile('.env.vercel.local');
loadEnvFile('.env.local');

type Json = Record<string, unknown>;

async function req(
  path: string,
  init?: RequestInit & { cookie?: string },
): Promise<{ status: number; json: Json; cookie: string }> {
  const headers = new Headers(init?.headers);
  if (init?.cookie) headers.set('Cookie', init.cookie);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie =
    setCookie.map((c) => c.split(';')[0]).join('; ') || init?.cookie || '';
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json, cookie };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function testConfig() {
  const { status, json } = await req('/api/auth/config');
  assert(status === 200, `config: expected 200 got ${status}`);
  assert(json.emailAuth === true, 'config: emailAuth');
  assert(json.twoFactorAuth === true, 'config: twoFactorAuth');
  console.log('✓ GET /api/auth/config');
}

async function testLogin2faFlow() {
  const email = 'taiphantuan+member@gmail.com';
  const password = 'member123';

  const login = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert(login.status === 200, `login: ${login.status} ${JSON.stringify(login.json)}`);
  assert(login.json.user != null, 'login: expected user');
  let cookie = login.cookie;
  console.log('✓ POST /api/auth/login (no 2FA)');

  const me = await req('/api/auth/me', { cookie });
  assert(me.status === 200 && me.json.user != null, 'me after login');
  console.log('✓ GET /api/auth/me');

  await req('/api/auth/logout', { method: 'POST', cookie });
  console.log('✓ POST /api/auth/logout');
}

async function testTotpEnrollment() {
  const email = 'taiphantuan@gmail.com';
  const password = 'admin123';

  const login = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let cookie = login.cookie;

  const setup = await req('/api/auth/2fa/setup', { method: 'POST', cookie });
  if (setup.status === 400 && String(setup.json.error).includes('already')) {
    console.log('○ 2FA already enabled — testing challenge path only');
    await req('/api/auth/logout', { method: 'POST', cookie });
    return;
  }
  assert(setup.status === 200, `2fa setup: ${setup.status} ${JSON.stringify(setup.json)}`);
  const manualKey = setup.json.manualKey as string;
  assert(Boolean(manualKey), 'setup: manualKey');
  const code = generateSync({ secret: manualKey });
  console.log('✓ POST /api/auth/2fa/setup');

  const enable = await req('/api/auth/2fa/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookie,
    body: JSON.stringify({ code }),
  });
  assert(enable.status === 200, `2fa enable: ${enable.status} ${JSON.stringify(enable.json)}`);
  assert(Array.isArray(enable.json.backupCodes), 'enable: backupCodes');
  console.log('✓ POST /api/auth/2fa/enable');

  await req('/api/auth/logout', { method: 'POST', cookie });

  const login2 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert(login2.json.requires2fa === true, 'login should require 2FA');
  cookie = login2.cookie;
  console.log('✓ POST /api/auth/login → requires2fa');

  const challengeCode = generateSync({ secret: manualKey });
  const challenge = await req('/api/auth/2fa/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookie,
    body: JSON.stringify({ code: challengeCode }),
  });
  assert(challenge.status === 200 && challenge.json.user != null, `challenge: ${challenge.status}`);
  console.log('✓ POST /api/auth/2fa/challenge');

  await req('/api/auth/logout', { method: 'POST', cookie: challenge.cookie });

  const login3 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  cookie = login3.cookie;
  const disableCode = generateSync({ secret: manualKey });
  await req('/api/auth/2fa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookie,
    body: JSON.stringify({ password, code: disableCode }),
  });
  console.log('✓ POST /api/auth/2fa/disable (test cleanup)');
}

async function testRegisterAndMail() {
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, '');
  if (!smtpPass) {
    console.log('○ Skipping live Gmail send — set SMTP_PASS in .env.local');
    return;
  }

  const { sendAuthEmail } = await import('../src/server/auth/mailer');
  const testTo = process.env.TEST_MAIL_TO ?? 'taiphantuan@gmail.com';
  await sendAuthEmail(testTo, 'verify_email', 'integration-test-token-do-not-use');
  console.log(`✓ Gmail SMTP sent verify email → ${testTo}`);

  const unique = `jupiter-test-${Date.now()}@example.com`;
  const reg = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: unique,
      password: 'testpass123',
      name: 'Auth Test',
    }),
  });
  assert(reg.status === 201, `register: ${reg.status} ${JSON.stringify(reg.json)}`);
  console.log(`✓ POST /api/auth/register (verify mail queued for ${unique})`);
}

async function main() {
  console.log(`Auth integration tests → ${BASE}\n`);

  try {
    await fetch(`${BASE}/api/auth/config`);
  } catch {
    console.error(`Cannot reach ${BASE} — run: npm run dev`);
    process.exit(1);
  }

  await testConfig();
  await testLogin2faFlow();
  await testTotpEnrollment();
  await testRegisterAndMail();

  console.log('\nAll auth integration checks passed.');
}

main().catch((err) => {
  console.error('\n✗', err instanceof Error ? err.message : err);
  process.exit(1);
});

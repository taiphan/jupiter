/** Clear TOTP for a user by email. Usage: npx tsx scripts/clear-user-2fa.mts alex@acme.dev */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/server/db/schema';

const email = process.argv[2] ?? 'alex@acme.dev';
const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('POSTGRES_URL required');
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
const user = rows[0];
if (!user) {
  console.error('User not found:', email);
  process.exit(1);
}

await db
  .update(schema.users)
  .set({ totpSecret: null, totpPendingSecret: null, totpEnabledAt: null })
  .where(eq(schema.users.id, user.id));
await db.delete(schema.totpBackupCodes).where(eq(schema.totpBackupCodes.userId, user.id));
console.log('Cleared 2FA for', email);
await client.end();

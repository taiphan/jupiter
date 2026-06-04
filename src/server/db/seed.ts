/**
 * Idempotent seed for demo users (OrbStack / Postgres deploy).
 * Run: npx tsx src/server/db/seed.ts
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { DEMO_ACCOUNTS } from '@/lib/demo-users';
import { hashPassword } from '@/server/auth/password';
import { resolveDatabaseUrl } from '@/server/env';
import * as schema from './schema';

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error('DATABASE_URL or POSTGRES_URL is required');
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  for (const { user, password } of DEMO_ACCOUNTS) {
    const passwordHash = await hashPassword(password);
    const verifiedAt = new Date();
    await db
      .insert(schema.users)
      .values({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        avatarColor: user.avatarColor,
        title: user.title,
        emailVerifiedAt: verifiedAt,
      })
      .onConflictDoUpdate({
        target: schema.users.username,
        set: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          avatarColor: user.avatarColor,
          title: user.title,
          emailVerifiedAt: verifiedAt,
        },
      });
    console.log(`seed: user ${user.email}`);
  }

  await client.end();
  console.log('seed: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

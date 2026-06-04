import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { resolveDatabaseUrl } from '@/server/env';
import { saveWorkspace } from '@/server/workspace/repository';
import { buildSeedWorkspaceSnapshot } from '@/server/workspace/seed-data';
import * as schema from './schema';

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error('DATABASE_URL or POSTGRES_URL is required');
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  drizzle(client, { schema });

  await saveWorkspace(buildSeedWorkspaceSnapshot());
  await client.end();
  console.log('seed-workspace: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

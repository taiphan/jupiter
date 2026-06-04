import { defineConfig } from 'drizzle-kit';
import { resolveMigrationDatabaseUrl } from './src/server/env';

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveMigrationDatabaseUrl() ?? '',
  },
  verbose: true,
  strict: true,
});

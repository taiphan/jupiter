import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest config for Jupiter v1.1 unit + property tests.
// Path alias mirrors tsconfig.json so tests can import via `@/...`.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
});

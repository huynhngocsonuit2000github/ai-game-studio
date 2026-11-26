import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['portal/tests/**/*.test.ts'] },
});

import { defineConfig } from '@playwright/test';

const base = '/ai-game-studio/';
const origin = 'http://127.0.0.1:4187';

export default defineConfig({
  testDir: './tests',
  testMatch: 'pages.spec.ts',
  outputDir: 'test-results/pages-browser',
  fullyParallel: true,
  workers: 2,
  timeout: 110_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: origin,
    launchOptions: { executablePath: process.env.STUDIO_CHROMIUM_PATH },
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: `pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4187 --strictPort --base ${base} --outDir ../deployment/dist`,
    cwd: new URL('../..', import.meta.url).pathname,
    url: origin + base,
    reuseExistingServer: false,
  },
});

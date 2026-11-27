import { defineConfig } from '@playwright/test';
import process from 'node:process';

const base = '/ai-game-studio/';
const origin = 'http://127.0.0.1:4189';

export default defineConfig({
  testDir: './tests',
  testMatch: 'pages.spec.ts',
  outputDir: 'test-results/pages-browser',
  timeout: 35_000,
  use: { baseURL: origin, launchOptions: { executablePath: process.env.STUDIO_CHROMIUM_PATH } },
  webServer: {
    command: `pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4189 --strictPort --base ${base} --outDir ../deployment/dist`,
    cwd: new URL('../..', import.meta.url).pathname,
    url: origin + base,
    reuseExistingServer: false,
  },
});

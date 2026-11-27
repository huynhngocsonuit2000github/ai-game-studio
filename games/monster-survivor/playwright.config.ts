import { defineConfig } from '@playwright/test';

const base = '/ai-game-studio/';
const origin = 'http://127.0.0.1:4183';

export default defineConfig({
  testDir: './tests',
  testMatch: ['assembled.spec.ts', 'campaign.spec.ts', 'kin.spec.ts'],
  outputDir: 'test-results/pages-browser',
  workers: 1,
  use: {
    baseURL: origin,
    launchOptions: { executablePath: process.env.STUDIO_CHROMIUM_PATH },
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: `pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4183 --strictPort --base ${base} --outDir ../deployment/dist`,
    cwd: new URL('../..', import.meta.url).pathname,
    url: origin + base,
    reuseExistingServer: false,
  },
});

import { defineConfig } from '@playwright/test';

const origin = 'http://127.0.0.1:4173';
const executablePath = process.env.STUDIO_CHROMIUM_PATH;

export default defineConfig({
  testDir: './portal/tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: origin,
    browserName: 'chromium',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4173 --strictPort --base /studio/',
    url: `${origin}/studio/`,
    reuseExistingServer: false,
  },
});

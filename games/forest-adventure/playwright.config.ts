import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:4181',
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    launchOptions: { executablePath: process.env.STUDIO_CHROMIUM_PATH },
  },
  webServer: {
    command: 'pnpm --filter @studio/portal dev --host 127.0.0.1 --port 4181 --strictPort --base /ai-game-studio/',
    cwd: new URL('../..', import.meta.url).pathname,
    url: 'http://127.0.0.1:4181/ai-game-studio/',
    reuseExistingServer: false,
  },
});

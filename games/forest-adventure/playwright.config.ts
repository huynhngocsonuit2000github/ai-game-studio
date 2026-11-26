import { defineConfig } from '@playwright/test';

const candidateSite = process.env.FOREST_CAMPAIGN_SITE;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: candidateSite ? 'test-results/campaign-browser' : 'test-results/browser',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:4181',
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    launchOptions: { executablePath: process.env.STUDIO_CHROMIUM_PATH },
  },
  webServer: {
    command: candidateSite
      ? 'pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4181 --strictPort --base /ai-game-studio/ --outDir ../games/forest-adventure/test-results/campaign-site/dist'
      : 'pnpm --filter @studio/portal dev --host 127.0.0.1 --port 4181 --strictPort --base /ai-game-studio/',
    cwd: new URL('../..', import.meta.url).pathname,
    url: 'http://127.0.0.1:4181/ai-game-studio/',
    reuseExistingServer: false,
  },
});

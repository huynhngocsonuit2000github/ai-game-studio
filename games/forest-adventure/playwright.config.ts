import { defineConfig } from '@playwright/test';

const candidateSite = process.env.FOREST_CAMPAIGN_SITE;
const target = process.env.FOREST_TEST_BROWSER;
const browserName = target === 'firefox' || target === 'webkit' ? target : 'chromium';
const executablePath = browserName === 'chromium' ? process.env.STUDIO_CHROMIUM_PATH : undefined;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: candidateSite ? 'test-results/campaign-browser' : 'test-results/browser',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:4181',
    browserName,
    viewport: { width: 1366, height: 768 },
    launchOptions: { executablePath },
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

import { defineConfig } from '@playwright/test';

const origin = 'http://127.0.0.1:4173';
const pagesBase = process.env.STUDIO_PAGES_BASE_PATH ?? '/studio/';
if (!/^\/(?:[a-z0-9_-]+\/)+$/i.test(pagesBase)) {
  throw new Error('STUDIO_PAGES_BASE_PATH must be a site subpath with leading and trailing slashes');
}
const previewOutput = process.env.STUDIO_TEST_ASSEMBLED_PAGES === '1' ? ' --outDir ../deployment/dist' : '';
const executablePath = process.env.STUDIO_CHROMIUM_PATH;

export default defineConfig({
  testDir: './portal/tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: origin,
    browserName: 'chromium',
    launchOptions: { executablePath },
  },
  webServer: [{
    command: `pnpm --filter @studio/portal preview --host 127.0.0.1 --port 4173 --strictPort --base ${pagesBase}${previewOutput}`,
    url: `${origin}${pagesBase}`,
    reuseExistingServer: false,
  }, {
    command: 'pnpm --filter @studio/portal dev --host 127.0.0.1 --port 4174 --strictPort --base /studio-dev/',
    url: 'http://127.0.0.1:4174/studio-dev/',
    reuseExistingServer: false,
  }],
});

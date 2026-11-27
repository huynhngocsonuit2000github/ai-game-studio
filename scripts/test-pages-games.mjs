import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'deployment/dist/release-manifest.json'), 'utf8'));
for (const { id } of manifest.games) {
  const config = `games/${id}/playwright.config.ts`;
  if (existsSync(resolve(root, config))) {
    execFileSync('pnpm', ['exec', 'playwright', 'test', '--config', config], {
      cwd: root,
      env: { ...process.env, STUDIO_TEST_ASSEMBLED_PAGES: '1' },
      stdio: 'inherit',
    });
  }
}

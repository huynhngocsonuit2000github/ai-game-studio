import { execSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import process from 'node:process';

const chromium = process.env.STUDIO_CHROMIUM_PATH;
if (chromium) accessSync(chromium, constants.X_OK);

execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
if (!chromium) execSync('pnpm exec playwright install chromium', { stdio: 'inherit' });

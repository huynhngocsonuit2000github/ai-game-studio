import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const temporary = await mkdtemp(join(import.meta.dirname, '.build-'));
try {
  const compiler = fileURLToPath(import.meta.resolve('typescript/bin/tsc'));
  execFileSync(process.execPath, [compiler, '-p', 'tsconfig.json', '--outDir', temporary], { stdio: 'inherit' });
  await cp('public', temporary, { recursive: true });
  await cp('index.html', join(temporary, 'index.html'));
  await rm('dist', { recursive: true, force: true });
  await rename(temporary, 'dist');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

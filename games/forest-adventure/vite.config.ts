import { copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const phaserPackage = require.resolve('phaser/package.json');
const eventEmitterPackage = createRequire(phaserPackage).resolve('eventemitter3/package.json');

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    assetsInlineLimit: 0,
    outDir: mode === 'campaign' ? 'test-results/campaign-site/dist/games/forest-adventure' : 'dist',
  },
  plugins: [{
    name: 'forest-adventure-public-media',
    enforce: 'pre',
    resolveId(source) {
      if (mode !== 'campaign' && (source === './preview-art.ts' || source === './audio.ts')) {
        return '\0forest-adventure-local-media';
      }
    },
    load(id) {
      if (id === '\0forest-adventure-local-media') return 'export const art = undefined, TrailAudio = undefined;';
    },
  }, {
    name: 'forest-adventure-static-files',
    apply: 'build',
    async writeBundle(options) {
      const destination = options.dir ?? 'dist';
      await Promise.all([
        copyFile(resolve(import.meta.dirname, 'assets/runtime/cover.webp'), resolve(destination, 'cover.webp')),
        copyFile(resolve(dirname(phaserPackage), 'LICENSE.md'), resolve(destination, 'phaser-license.txt')),
        copyFile(resolve(dirname(eventEmitterPackage), 'LICENSE'), resolve(destination, 'eventemitter3-license.txt')),
      ]);
    },
  }],
}));

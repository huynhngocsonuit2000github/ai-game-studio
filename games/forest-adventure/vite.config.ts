import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const phaserPackage = require.resolve('phaser/package.json');
const eventEmitterPackage = createRequire(phaserPackage).resolve('eventemitter3/package.json');

// The canonical Studio entry controls production activation. An unpacked game
// can still build the S01 preview and explicitly build the local campaign.
const registryFile = new URL('../../registry/games.json', import.meta.url);

// D14 clears the exact checked-in campaign runtime exports for the public preview.
const previewMedia = new URL('./production/PUBLIC_PREVIEW_MEDIA.json', import.meta.url);
async function verifyPublicPreviewMedia(destination: string, generated: string[]) {
  const manifest: Record<string, string> = JSON.parse(await readFile(previewMedia, 'utf8'));
  const approved = new Set(Object.values(manifest));
  if (!approved.size) throw new Error('Missing D14 public campaign media clearance.');

  const generatedFiles = new Set([
    ...generated,
    'phaser-license.txt',
    'eventemitter3-license.txt',
  ].map(name => resolve(destination, name)));
  const files = await readdir(destination, { recursive: true, withFileTypes: true });
  for (const entry of files) {
    if (entry.isDirectory()) continue;
    if (!entry.isFile()) throw new Error(`Non-regular file in Forest Adventure preview: ${entry.name}`);
    const file = resolve(entry.parentPath, entry.name);
    if (generatedFiles.has(file)) continue;
    const hash = createHash('sha256').update(await readFile(file)).digest('hex');
    if (!approved.delete(hash)) throw new Error(`Media outside D14 preview clearance: ${entry.name}`);
  }
  if (approved.size) throw new Error(`Missing ${approved.size} cleared campaign runtime files.`);
}

export default defineConfig(({ mode }) => {
  const registry: { games: { id: string; status: string; visibility: string }[] } | undefined =
    existsSync(registryFile) ? JSON.parse(readFileSync(registryFile, 'utf8')) : undefined;
  const publicEntry = registry?.games.find(game => game.id === 'forest-adventure' && game.visibility === 'public');
  const publicCampaignPreview = publicEntry?.status === 'development';
  const campaignEnabled = mode === 'campaign' || publicCampaignPreview || publicEntry?.status === 'released';

  return {
    define: { __FOREST_CAMPAIGN_ENABLED__: JSON.stringify(campaignEnabled) },
    base: './',
    build: {
      assetsInlineLimit: 0,
      outDir: mode === 'campaign' ? 'test-results/campaign-site/dist/games/forest-adventure' : 'dist',
    },
    plugins: [{
      name: 'forest-adventure-public-media',
      enforce: 'pre',
      resolveId(source) {
        if (!campaignEnabled && (source === './preview-art.ts' || source === './audio.ts')) {
          return '\0forest-adventure-local-media';
        }
      },
      load(id) {
        if (id === '\0forest-adventure-local-media') return 'export const art = undefined, TrailAudio = undefined;';
      },
    }, {
      name: 'forest-adventure-static-files',
      apply: 'build',
      async writeBundle(options, bundle) {
        const destination = options.dir ?? 'dist';
        await Promise.all([
          copyFile(resolve(import.meta.dirname, 'assets/runtime/cover.webp'), resolve(destination, 'cover.webp')),
          copyFile(resolve(dirname(phaserPackage), 'LICENSE.md'), resolve(destination, 'phaser-license.txt')),
          copyFile(resolve(dirname(eventEmitterPackage), 'LICENSE'), resolve(destination, 'eventemitter3-license.txt')),
        ]);
        if (publicCampaignPreview && mode !== 'campaign') {
          const generated = Object.values(bundle)
            .filter(output => output.type === 'chunk' || /\.(?:css|html)$/.test(output.fileName))
            .map(output => output.fileName);
          await verifyPublicPreviewMedia(destination, generated);
        }
      },
    }],
  };
});

import { defineConfig } from 'vite';
import catalog from '../registry/games.json' with { type: 'json' };
import { parseRegistry } from './src/registry.ts';

export default defineConfig(({ command }) => {
  parseRegistry(catalog);
  return { base: command === 'build' ? './' : '/' };
});

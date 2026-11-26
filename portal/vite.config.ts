import { defineConfig } from 'vite';
import catalog from '../registry/games.json' with { type: 'json' };
import { parseRegistry, publicGames } from './src/registry.ts';

export default defineConfig(({ command }) => {
  const games = publicGames(parseRegistry(catalog));
  return {
    base: command === 'build' ? './' : '/',
    define: { __STUDIO_PUBLIC_GAMES__: JSON.stringify(games) },
  };
});

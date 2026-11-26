import { defineConfig } from 'vite';
import catalog from '../registry/games.json' with { type: 'json' };
import { previewBuilds } from './preview-builds.ts';
import { developmentGames, parseRegistry, publicGames } from './src/registry.ts';

export default defineConfig(({ command, isPreview }) => {
  const registry = parseRegistry(catalog);
  const releases = publicGames(registry);
  const localDevelopment = command === 'serve' && !isPreview;
  const previews = localDevelopment ? developmentGames(registry) : [];
  return {
    base: command === 'build' ? './' : '/',
    define: {
      __STUDIO_PUBLIC_GAMES__: JSON.stringify(releases),
      __STUDIO_DEVELOPMENT_GAMES__: JSON.stringify(previews),
    },
    plugins: localDevelopment ? [previewBuilds([...releases, ...previews].map(({ id }) => id))] : [],
  };
});

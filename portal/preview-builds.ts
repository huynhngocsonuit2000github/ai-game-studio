import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.txt': 'text/plain',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2',
};

export function previewBuilds(ids: string[]): Plugin {
  return {
    name: 'studio-preview-builds',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const prefix = `${server.config.base}games/`;
        const pathname = request.url?.split('?')[0];
        if (!pathname?.startsWith(prefix) || !['GET', 'HEAD'].includes(request.method ?? '')) return next();

        try {
          const [id, ...segments] = decodeURIComponent(pathname.slice(prefix.length)).split('/');
          if (!id || !ids.includes(id) || !segments.length ||
              segments.some((segment) => !segment || segment.startsWith('.') || segment.includes('\\'))) {
            response.writeHead(404).end();
            return;
          }

          const gamesRoot = await realpath(resolve(import.meta.dirname, '..', 'games'));
          const dist = resolve(gamesRoot, id, 'dist');
          const realDist = await realpath(dist);
          const file = await realpath(resolve(dist, ...segments));
          if (realDist !== dist || !file.startsWith(dist + sep) || !(await stat(file)).isFile()) {
            response.writeHead(404).end();
            return;
          }
          response.setHeader('Content-Type', contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream');
          if (request.method === 'HEAD') response.end();
          else createReadStream(file).on('error', () => response.destroy()).pipe(response);
        } catch {
          response.writeHead(404).end();
        }
      });
    },
  };
}

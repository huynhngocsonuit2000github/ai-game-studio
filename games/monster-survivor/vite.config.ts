import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'library-cover',
    closeBundle() {
      copyFileSync('assets/runtime/art/library-card.webp', 'dist/cover.webp');
    },
  }],
});

import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative base by default so assets load correctly on any GitHub Pages subpath
  // or custom domain without breaking when repository name changes. Can be overridden via BASE_URL.
  base: process.env.BASE_URL || './',
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 4096,
  },
});

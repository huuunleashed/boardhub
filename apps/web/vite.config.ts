import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const serverTarget = process.env.BOARDHUB_SERVER ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@boardhub/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      '@boardhub/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: serverTarget, changeOrigin: true },
      '/socket.io': { target: serverTarget, ws: true, changeOrigin: true },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});

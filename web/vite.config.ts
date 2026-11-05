import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Shared types live outside this folder. They are type-only, so nothing is bundled.
    alias: { '@smartpod/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
  },
  server: { port: 5173, host: true },
});

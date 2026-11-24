import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, the browser calls "/api/..." on the web server and Vite forwards
    // it to the backend. Same address for both means no CORS setup is needed.
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});

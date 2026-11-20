import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3100,
    // The preview proxy may serve this under a sandboxed host; keep origin checks permissive.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3100,
    allowedHosts: true,
  },
});

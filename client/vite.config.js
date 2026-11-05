import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// During development the React app (port 5173) forwards every /api request to the
// Express server (port 4000). The browser only ever talks to one origin, so the
// same relative URLs ("/api/events") work locally and when deployed.
const apiProxy = { '/api': 'http://localhost:4000' };

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // also reachable from a phone on the same Wi-Fi, to show a pass on it
    proxy: apiProxy,
  },
  preview: { proxy: apiProxy },
});

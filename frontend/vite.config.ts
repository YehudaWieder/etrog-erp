import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all requests to /api/* to the NestJS backend
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/inventory': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/seasons': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/harvests': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/customers': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/partners': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/classifications': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/system-config': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/fields': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { networkApiMiddleware } from './server/networkDiagnostics.js';

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'network-api-middleware',
      configureServer(server) {
        server.middlewares.use(networkApiMiddleware);
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/backend-api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

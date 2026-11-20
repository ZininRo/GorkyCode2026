import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': process.env.GORKY_DEV_BACKEND ?? 'http://localhost:8080' },
  },
});

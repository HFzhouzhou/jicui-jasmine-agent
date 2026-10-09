import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    } },
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${env.PORT || 3001}` } },
    },
    build: { outDir: 'dist/client', emptyOutDir: true },
  };
});

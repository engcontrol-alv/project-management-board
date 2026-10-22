/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Cloudflare Pages serve o app na raiz do domínio.
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas estáveis em chunks próprios (cache entre versões); Recharts já é carregado sob demanda.
        manualChunks: {
          // dexie-react-hooks importa React: no chunk `data` criaria o ciclo react → data → react.
          react: ['react', 'react-dom', 'react-router-dom', 'dexie-react-hooks'],
          data: ['dexie', 'zod'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Telas com IndexedDB renderizam bem abaixo de 1 s isoladas, mas a suíte paralela pode passar dos 5 s padrão.
    testTimeout: 15_000,
  },
});

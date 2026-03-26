import { defineConfig } from 'vite';

export default defineConfig({
  base: '/operacao-aniversario/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});

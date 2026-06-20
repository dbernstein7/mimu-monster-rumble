import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/@firebase')) return 'firebase';
        },
      },
    },
  },
});

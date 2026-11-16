import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@dimforge/rapier3d-compat/')) return 'physics';
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/vue/') || id.includes('/node_modules/pinia/')) return 'framework';
        },
      },
    },
  },
});

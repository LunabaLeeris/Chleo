import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/user-data/**', '**/src/user-data/**', '**/*.json'],
    },
  },
});

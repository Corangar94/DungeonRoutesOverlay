import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      external: ['electron', 'electron-store', 'electron-squirrel-startup']
    }
  }
});

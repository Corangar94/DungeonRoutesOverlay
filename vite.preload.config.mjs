import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        lib: {
            entry: 'src/preload.mjs',
            formats: ['es'],
            fileName: 'preload'
        },
        rollupOptions: {
            external: ['electron'],
            output: {
                entryFileNames: '[name].mjs'
            }
        }
    }
});

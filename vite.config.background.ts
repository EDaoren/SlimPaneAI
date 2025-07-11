import { defineConfig } from 'vite'
import { resolve } from 'path'

// Separate config for background script
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/background/service-worker.ts'),
      name: 'background',
      fileName: 'background',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'background.js',
        extend: true
      }
    },
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})

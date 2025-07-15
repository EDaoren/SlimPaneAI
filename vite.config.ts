import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    svelte(),
    UnoCSS()
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Side panel
        panel: resolve(__dirname, 'src/panel/index.html'),
        // Options page
        options: resolve(__dirname, 'src/options/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
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

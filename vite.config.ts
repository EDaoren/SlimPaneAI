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
        options: resolve(__dirname, 'src/options/index.html'),
        // Background service worker
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        // Content script
        content: resolve(__dirname, 'src/content/content-script.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId?.includes('service-worker')) {
            return 'background.js'
          }
          if (facadeModuleId?.includes('content-script')) {
            return 'content.js'
          }
          return '[name].js'
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            // Map HTML files to root directory with correct names
            if (assetInfo.name === 'index.html') {
              // This is a bit tricky, we need to determine which index.html this is
              // We'll handle this in the build script instead
              return '[name].[ext]'
            }
            return '[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})

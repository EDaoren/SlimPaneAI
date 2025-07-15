import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false, // 不清空目录，因为其他文件已经构建好了
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content-script.ts')
      },
      output: {
        entryFileNames: 'content.js',
        format: 'iife', // 使用IIFE格式避免模块语法问题
        inlineDynamicImports: true // 内联所有动态导入
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

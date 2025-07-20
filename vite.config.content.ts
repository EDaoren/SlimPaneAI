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
        inlineDynamicImports: true, // 内联所有动态导入
        globals: {
          '@mozilla/readability': 'Readability'
        }
      },
      external: [] // 不排除任何依赖，全部打包进去
    },
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/], // 包含 node_modules 中的 CommonJS 模块
      transformMixedEsModules: true // 转换混合的 ES 模块
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
})

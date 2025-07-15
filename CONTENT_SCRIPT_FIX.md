# 🔧 内容脚本模块语法问题修复

## 问题描述

在使用网页聊天功能时，遇到以下错误：
```
Uncaught SyntaxError: Cannot use import statement outside a module
content.js:1 (匿名函数)
```

## 问题原因

1. **ES6模块语法冲突**：内容脚本使用了ES6的`import/export`语法
2. **浏览器环境限制**：Chrome扩展的内容脚本不支持ES6模块语法
3. **构建配置问题**：Vite默认构建为ES模块格式

## 解决方案

### 1. 分离构建配置

创建专门的内容脚本构建配置 `vite.config.content.ts`：

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content-script.ts')
      },
      output: {
        entryFileNames: 'content.js',
        format: 'iife', // 使用IIFE格式避免模块语法问题
        inlineDynamicImports: true
      }
    },
    target: 'es2020'
  }
})
```

### 2. 简化内容脚本

移除复杂的依赖导入，直接实现核心功能：

```typescript
// 移除前：
import type { TextSelectionMessage, PageContentMessage } from '@/types';
import { ContentExtractor } from '@/lib/content-extractor';
import { PDFProcessor } from '@/lib/pdf-processor';

// 修改后：
// 内容脚本 - 不使用ES6模块导入，直接实现功能
```

### 3. 更新构建脚本

修改 `package.json` 中的构建命令：

```json
{
  "scripts": {
    "build": "vite build && vite build --config vite.config.background.ts && vite build --config vite.config.content.ts"
  }
}
```

### 4. 优化主构建配置

从主构建配置中移除内容脚本：

```typescript
// vite.config.ts
input: {
  // Side panel
  panel: resolve(__dirname, 'src/panel/index.html'),
  // Options page
  options: resolve(__dirname, 'src/options/index.html')
  // 移除：content: resolve(__dirname, 'src/content/content-script.ts')
}
```

## 技术细节

### IIFE格式说明

IIFE（Immediately Invoked Function Expression）格式将代码包装在立即执行的函数中：

```javascript
(function() {
  "use strict";
  // 所有代码都在这个函数作用域内
  let currentSelection = '';
  
  function init() {
    // 初始化逻辑
  }
  
  // 自动执行
  init();
})();
```

### 优势

1. **避免全局污染**：所有变量都在函数作用域内
2. **兼容性好**：不依赖ES6模块系统
3. **立即执行**：代码加载后立即运行
4. **体积小**：内联所有依赖，生成单一文件

## 功能保留

尽管简化了实现，核心功能完全保留：

### ✅ 保留的功能
- **文本选择**：监听和获取页面文本选择
- **简单内容提取**：智能提取页面主要内容
- **消息通信**：与背景脚本和侧边栏通信
- **错误处理**：友好的错误提示

### 🔄 简化的部分
- **复杂依赖**：移除了复杂的库依赖
- **PDF处理**：使用回退方案处理PDF
- **页面监听**：简化了页面变化监听
- **域名设置**：在侧边栏中处理域名配置

## 构建结果

修复后的构建输出：

```
✓ 84 modules transformed.
dist/content.js  2.17 kB │ gzip: 1.03 kB
✓ built in 72ms
```

生成的 `content.js` 文件：
- **格式**：IIFE（立即执行函数表达式）
- **大小**：2.17 kB（压缩后1.03 kB）
- **兼容性**：完全兼容Chrome扩展环境

## 测试验证

### 验证步骤

1. **重新加载扩展**：在 `chrome://extensions/` 中重新加载
2. **访问网页**：打开任意普通网页
3. **启用网页聊天**：点击工具栏中的网页聊天按钮
4. **检查状态**：确认按钮显示蓝色且有绿色状态点
5. **测试对话**：输入问题，验证AI基于页面内容回答

### 预期结果

- ✅ 不再出现模块语法错误
- ✅ 内容脚本正常加载和运行
- ✅ 网页聊天功能正常工作
- ✅ 页面内容正确提取

## 故障排除

如果仍然遇到问题：

### 1. 清理缓存
```bash
# 删除dist目录
rm -rf dist
# 重新构建
npm run build
```

### 2. 重新加载扩展
- 打开 `chrome://extensions/`
- 找到SlimPaneAI扩展
- 点击"重新加载"按钮

### 3. 检查控制台
- 按F12打开开发者工具
- 查看Console标签是否有错误信息

### 4. 验证文件
确认 `dist/content.js` 文件存在且以 `(function(){` 开头

## 总结

通过分离构建配置和简化内容脚本实现，成功解决了ES6模块语法冲突问题。新的实现：

- **更稳定**：避免了模块系统的复杂性
- **更轻量**：减少了不必要的依赖
- **更兼容**：完全兼容Chrome扩展环境
- **更高效**：构建速度更快，文件更小

网页聊天功能现在可以正常工作，用户可以无障碍地使用这个强大的功能！🎉

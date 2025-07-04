# 样式调试指南

## 🔍 问题诊断

如果 AI 模型配置部分的样式出现问题，请按以下步骤进行调试：

### 1. 检查浏览器开发者工具

1. 打开 Chrome 扩展的 options.html 页面
2. 按 F12 打开开发者工具
3. 在 Elements 标签页中检查模型卡片的 HTML 结构
4. 在 Styles 面板中查看应用的 CSS 规则

### 2. 常见问题和解决方案

#### 问题 1: 模型卡片布局混乱
**可能原因**: Flexbox 或 Grid 样式未正确加载
**解决方案**: 
- 检查 `.flex`, `.items-center`, `.justify-between` 等类是否存在
- 确认 `.grid`, `.md:grid-cols-2`, `.gap-4` 等类正常工作

#### 问题 2: 按钮样式异常
**可能原因**: 按钮样式类缺失或被覆盖
**解决方案**:
- 检查 `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` 类
- 确认 `.text-xs` 类正确应用

#### 问题 3: 徽章颜色不正确
**可能原因**: 徽章样式类未正确定义
**解决方案**:
- 检查 `.model-badge-openai`, `.model-badge-claude` 等类
- 确认颜色值正确设置

#### 问题 4: 间距问题
**可能原因**: 边距和间距类缺失
**解决方案**:
- 检查 `.mb-1`, `.mb-2`, `.mb-3`, `.gap-1`, `.gap-2`, `.gap-4` 等类
- 确认 padding 和 margin 值正确

### 3. 手动修复步骤

如果样式仍有问题，可以手动添加以下 CSS 到页面：

```css
/* 基础布局 */
.flex { display: flex; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }

/* 网格布局 */
.grid { display: grid; }
.md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* 间距 */
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }

/* 字体 */
.font-semibold { font-weight: 600; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }

/* 颜色 */
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-900 { color: #111827; }

/* 模型卡片 */
.model-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.model-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* 徽章 */
.model-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.model-badge-openai {
  background: #dbeafe;
  color: #1e40af;
}

.model-badge-claude {
  background: #f3e8ff;
  color: #7c3aed;
}

.model-badge-gemini {
  background: #fef3c7;
  color: #d97706;
}

.model-badge-custom {
  background: #f0f9ff;
  color: #0369a1;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-danger {
  background: #ef4444;
  color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
```

### 4. 验证修复

修复后，检查以下元素是否正常显示：

- ✅ 模型卡片有正确的边框和圆角
- ✅ 卡片内容垂直对齐正确
- ✅ 按钮有正确的颜色和悬停效果
- ✅ 徽章有正确的背景色和文字颜色
- ✅ 网格布局在桌面端显示为两列
- ✅ 间距和字体大小正确

### 5. 重新构建

如果手动修复有效，可以将修复的样式添加到源代码中：

```bash
# 重新构建扩展
npm run package

# 重新加载扩展
# 在 chrome://extensions/ 中点击刷新按钮
```

### 6. 联系支持

如果问题仍然存在，请提供以下信息：

1. Chrome 版本
2. 扩展版本
3. 开发者工具中的错误信息
4. 问题截图
5. 受影响的具体元素

---

**注意**: 样式问题通常是由于 CSS 类缺失或冲突导致的。通过开发者工具可以快速定位和解决大部分问题。

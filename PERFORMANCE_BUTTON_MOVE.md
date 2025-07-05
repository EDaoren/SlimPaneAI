# 性能按钮移至右侧工具栏

## 修改概述

将原本固定在右下角的性能调试按钮移动到右侧工具栏中，提供更统一的界面体验。

## 修改内容

### 1. Toolbar组件更新 (`src/panel/components/Toolbar.svelte`)

#### 新增功能
- 添加了性能调试按钮到工具栏
- 使用图表图标表示性能调试功能
- 保持与其他按钮一致的样式和交互

#### 代码变更
```typescript
// 新增性能调试器控制属性
export let onTogglePerformanceDebugger: () => void;

// 新增性能调试器处理函数
function handlePerformanceDebugger() {
  onTogglePerformanceDebugger();
}
```

#### 按钮布局
```svelte
<!-- 性能调试 -->
<button
  class="toolbar-button"
  on:click={handlePerformanceDebugger}
  title="性能调试器 (Ctrl+Shift+D)"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
</button>
```

### 2. PerformanceDebugger组件重构 (`src/panel/components/PerformanceDebugger.svelte`)

#### 移除固定按钮
- 删除了固定在右下角的圆形调试按钮
- 移除了相关的CSS样式
- 保留了调试面板的完整功能

#### 接口变更
```typescript
// 将isVisible改为可导出的属性
export let isVisible = false;

// 将toggleDebugger改为可导出的函数
export function toggleDebugger() {
  isVisible = !isVisible;
  if (isVisible) {
    updateStats();
    updateInterval = setInterval(updateStats, 1000);
  } else {
    clearInterval(updateInterval);
  }
}
```

#### 移除的样式
```css
/* 删除了以下样式 */
.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  /* ... */
}
```

### 3. ChatPanel组件集成 (`src/panel/components/ChatPanel.svelte`)

#### 新增导入和引用
```typescript
import PerformanceDebugger from './PerformanceDebugger.svelte';

let performanceDebugger: PerformanceDebugger;
```

#### 新增控制函数
```typescript
function handleTogglePerformanceDebugger() {
  if (performanceDebugger) {
    performanceDebugger.toggleDebugger();
  }
}
```

#### 组件集成
```svelte
<!-- Right Toolbar -->
<Toolbar onTogglePerformanceDebugger={handleTogglePerformanceDebugger} />

<!-- Performance Debugger -->
<PerformanceDebugger bind:this={performanceDebugger} />
```

### 4. App组件清理 (`src/panel/App.svelte`)

#### 移除重复引用
- 从App.svelte中移除了PerformanceDebugger的导入
- 删除了重复的性能调试器组件实例

## 界面布局变化

### 修改前
```
┌─────────────────────────────────────┬──┐
│                                     │  │
│ Main Content Area                   │🔧│ ← 右侧工具栏
│ - Welcome Screen / Chat Messages    │  │
│                                     │  │
├─────────────────────────────────────┤  │
│ Model Selector                      │  │
├─────────────────────────────────────┤  │
│ Input Area                          │  │
└─────────────────────────────────────┴──┘
                                    🔧 ← 固定的性能按钮
```

### 修改后
```
┌─────────────────────────────────────┬──┐
│                                     │  │
│ Main Content Area                   │📊│ ← 性能调试按钮
│ - Welcome Screen / Chat Messages    │🔧│   集成到工具栏
│                                     │  │
├─────────────────────────────────────┤  │
│ Model Selector                      │  │
├─────────────────────────────────────┤  │
│ Input Area                          │  │
└─────────────────────────────────────┴──┘
```

## 工具栏按钮顺序

现在右侧工具栏的按钮从上到下排列为：

1. **新建对话** (+) - 创建新的对话会话
2. **清空对话** (🗑️) - 清空当前对话
3. **导出对话** (📥) - 导出对话记录（预留）
4. **性能调试** (📊) - 打开性能调试器
5. **设置** (⚙️) - 打开设置页面

## 功能保持

### 保留的功能
- ✅ 键盘快捷键 `Ctrl+Shift+D` 仍然有效
- ✅ 性能调试面板的所有功能完整保留
- ✅ 实时性能监控和统计
- ✅ 内存使用监控
- ✅ 数学公式缓存统计

### 改进的体验
- ✅ 按钮位置更加统一和直观
- ✅ 与其他工具栏按钮样式一致
- ✅ 工具提示显示快捷键信息
- ✅ 悬停效果和动画保持一致

## 技术细节

### 组件通信
使用了Svelte的组件绑定和函数传递机制：

```typescript
// ChatPanel中绑定PerformanceDebugger实例
<PerformanceDebugger bind:this={performanceDebugger} />

// 通过函数调用控制调试器
function handleTogglePerformanceDebugger() {
  if (performanceDebugger) {
    performanceDebugger.toggleDebugger();
  }
}

// 将控制函数传递给Toolbar
<Toolbar onTogglePerformanceDebugger={handleTogglePerformanceDebugger} />
```

### 样式一致性
性能调试按钮使用与其他工具栏按钮相同的样式：

```css
.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
```

## 兼容性

- ✅ 保持所有原有功能
- ✅ 键盘快捷键继续工作
- ✅ 性能监控功能完整
- ✅ 向后兼容

## 用户体验提升

### 1. 界面统一性
- 所有功能按钮集中在右侧工具栏
- 消除了界面上的孤立元素
- 提供更清洁的视觉体验

### 2. 操作便利性
- 性能调试功能更容易发现
- 与其他工具功能逻辑分组
- 工具提示提供清晰的功能说明

### 3. 空间利用
- 释放了右下角的固定空间
- 更好地利用工具栏空间
- 为未来功能扩展预留空间

## 总结

这次修改成功将性能调试按钮集成到右侧工具栏中：

- ✅ **界面统一** - 所有工具按钮集中管理
- ✅ **功能完整** - 保留所有性能调试功能
- ✅ **体验优化** - 更直观的按钮位置和样式
- ✅ **代码清理** - 移除重复组件引用

现在用户可以在右侧工具栏中方便地访问性能调试功能，界面更加统一和专业。

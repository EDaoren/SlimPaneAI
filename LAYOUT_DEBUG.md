# 布局调试指南

## 🔍 当前问题

用户反馈布局没有修复，仍然显示：
- 用户消息在左边（应该在右边）
- AI消息在右边（应该在左边）
- AI消息没有头像图标

## 🧪 调试步骤

### 1. 确认扩展重新加载
1. 打开Chrome扩展管理页面 `chrome://extensions/`
2. 找到SlimPaneAI扩展
3. 点击"重新加载"按钮
4. 确保扩展已经使用最新的构建文件

### 2. 检查浏览器缓存
1. 在侧边栏右键选择"检查"
2. 打开开发者工具
3. 右键刷新按钮，选择"清空缓存并硬性重新加载"
4. 或者按 Ctrl+Shift+R 强制刷新

### 3. 验证代码逻辑
当前MessageItem.svelte的逻辑应该是：

```svelte
{#if message.type === 'assistant'}
  <!-- AI消息 - 左侧 -->
  <div class="flex gap-2">
    <div class="w-8 h-8 bg-gray-600 rounded-full">
      <!-- AI头像图标 -->
    </div>
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1">
        <span>{getModelDisplayName(message.model)}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>
      <div class="assistant-message-bubble">
        <!-- AI消息内容 -->
      </div>
    </div>
  </div>
{:else}
  <!-- 用户消息 - 右侧 -->
  <div class="flex justify-end gap-2">
    <div class="max-w-[75%]">
      <div class="user-message-bubble">
        <!-- 用户消息内容 -->
      </div>
    </div>
    <div class="w-8 h-8 bg-blue-500 rounded-full">
      <!-- 用户头像图标 -->
    </div>
  </div>
{/if}
```

### 4. 检查CSS样式
确保以下CSS类存在：

```css
.user-message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
}

.assistant-message-bubble {
  background-color: #f8fafc;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
}
```

## 🔧 可能的解决方案

### 方案1：强制刷新
1. 完全关闭Chrome浏览器
2. 重新打开Chrome
3. 重新加载扩展
4. 测试聊天功能

### 方案2：检查构建文件
1. 检查 `dist/panel.js` 文件是否包含最新代码
2. 搜索文件中是否包含 `message.type === 'assistant'`
3. 确认条件判断顺序正确

### 方案3：添加调试日志
在MessageItem.svelte中添加调试信息：

```svelte
<script>
  // 添加调试日志
  $: console.log('Message type:', message.type, 'Content:', message.content.substring(0, 50));
</script>
```

### 方案4：检查消息数据
确认消息对象的type字段正确：
- 用户消息：`message.type === 'user'`
- AI消息：`message.type === 'assistant'`

## 📋 测试清单

- [ ] 扩展已重新加载
- [ ] 浏览器缓存已清理
- [ ] 构建文件已更新
- [ ] CSS样式正确应用
- [ ] 消息类型判断正确
- [ ] AI头像图标显示
- [ ] 用户消息右对齐
- [ ] AI消息左对齐

## 🎯 预期结果

修复后应该看到：

```
[🤖] gpt-4o  14:40          |                    你好  [👤]
     AI回复内容...           |                   14:40
```

左侧：AI消息 + 头像 + 模型名
右侧：用户消息 + 头像

## 📞 如果仍然有问题

如果按照以上步骤仍然没有解决，请：
1. 提供浏览器开发者工具的Console日志
2. 检查是否有JavaScript错误
3. 确认扩展是否正确加载了最新的构建文件
4. 尝试在无痕模式下测试扩展

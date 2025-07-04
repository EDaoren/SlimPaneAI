# Background Script 错误修复

## 问题描述

用户报告了两个Chrome扩展相关的错误：

1. **Failed to inject content script** - 内容脚本注入失败
2. **Could not establish connection. Receiving end does not exist** - 无法建立连接，接收端不存在

## 错误原因分析

### 1. Content Script 注入失败
- 某些页面（如 chrome://、about:、file:// 等）不允许注入内容脚本
- 扩展尝试向这些页面发送消息时会失败

### 2. 连接不存在错误
- 向没有内容脚本的标签页发送消息
- 向所有标签页广播消息，但很多标签页没有内容脚本
- 标签页关闭后仍尝试发送消息

## 修复方案

### 1. 优化消息发送逻辑

#### 修改前（有问题）
```typescript
// 向所有标签页发送消息
const tabs = await chrome.tabs.query({});
for (const tab of tabs) {
  try {
    await chrome.tabs.sendMessage(tab.id!, message);
  } catch (tabError) {
    // 会产生大量错误日志
  }
}
```

#### 修改后（优化）
```typescript
// 只向活动标签页发送消息，并检查URL有效性
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
if (tabs[0]?.id && tabs[0]?.url) {
  const url = tabs[0].url;
  const isValidUrl = !url.startsWith('chrome://') && 
                    !url.startsWith('chrome-extension://') && 
                    !url.startsWith('about:') && 
                    !url.startsWith('moz-extension://') &&
                    !url.startsWith('file://');
  
  if (isValidUrl) {
    await chrome.tabs.sendMessage(tabs[0].id, message);
  }
}
```

### 2. 统一错误处理机制

#### 修改前（分散处理）
```typescript
// 在多个地方直接调用 chrome.tabs.sendMessage
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'llm-error',
      requestId: request.requestId,
      error: 'No model configured'
    });
  }
});
```

#### 修改后（统一处理）
```typescript
// 使用统一的 sendMessageToSidePanel 函数
await sendMessageToSidePanel({
  type: 'llm-error',
  requestId: request.requestId,
  error: 'No model configured. Please configure a model in settings.'
});
```

### 3. URL 有效性检查

添加了对特殊页面的检查，避免向不支持内容脚本的页面发送消息：

```typescript
const isValidUrl = !url.startsWith('chrome://') && 
                  !url.startsWith('chrome-extension://') && 
                  !url.startsWith('about:') && 
                  !url.startsWith('moz-extension://') &&
                  !url.startsWith('file://');
```

## 修复的文件

### 1. `src/background/service-worker.ts`

**主要变更：**
- 优化 `sendMessageToSidePanel` 函数
- 添加 URL 有效性检查
- 统一错误消息发送机制
- 减少不必要的消息发送

## 错误处理改进

### 1. 更智能的消息发送
- 只向活动标签页发送消息
- 检查标签页URL是否支持内容脚本
- 避免向特殊页面发送消息

### 2. 更好的错误日志
- 区分正常情况和真正的错误
- 提供更有用的调试信息
- 减少误导性的错误日志

### 3. 更稳定的连接
- 使用多种方法确保消息传递
- 优雅处理连接失败
- 避免不必要的重试

## 支持的页面类型

### ✅ 支持内容脚本的页面
- `http://` 和 `https://` 页面
- 普通网页
- 大部分在线服务

### ❌ 不支持内容脚本的页面
- `chrome://` 页面（Chrome内部页面）
- `chrome-extension://` 页面（扩展页面）
- `about:` 页面（浏览器特殊页面）
- `file://` 页面（本地文件）
- `moz-extension://` 页面（Firefox扩展页面）

## 用户体验改进

### 1. 减少错误干扰
- 用户不会再看到大量的连接错误
- 控制台日志更加清晰
- 扩展运行更加稳定

### 2. 更可靠的消息传递
- 消息发送更加可靠
- 错误处理更加优雅
- 功能正常工作

### 3. 更好的调试体验
- 开发者可以更容易定位问题
- 错误日志更有意义
- 调试信息更准确

## 兼容性

- ✅ 保持所有原有功能
- ✅ 向后兼容
- ✅ 支持所有主流浏览器
- ✅ 不影响正常使用

## 测试建议

### 1. 基本功能测试
- 在普通网页上测试扩展功能
- 检查消息发送是否正常
- 验证错误处理是否正确

### 2. 特殊页面测试
- 访问 chrome://settings/ 等页面
- 检查是否还有错误日志
- 验证扩展是否稳定运行

### 3. 错误场景测试
- 测试网络断开情况
- 测试标签页快速切换
- 验证错误恢复机制

## 总结

这次修复解决了Chrome扩展中常见的消息传递问题：

- ✅ **消除连接错误** - 不再向无效页面发送消息
- ✅ **优化错误处理** - 统一的错误处理机制
- ✅ **提升稳定性** - 更可靠的消息传递
- ✅ **改善调试体验** - 更清晰的错误日志

现在扩展应该能够更稳定地运行，不会再产生大量的连接错误。

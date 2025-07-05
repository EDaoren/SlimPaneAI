# 设置状态同步修复

## 问题描述

用户反馈：配置了服务商模型后，界面仍然提示"No model configured. Please configure a model in settings."，但重新打开插件后问题消失。

## 问题根因

这是一个典型的跨页面状态同步问题：
1. **设置页面**：用户在选项页面配置模型，数据保存到Chrome存储
2. **侧边栏页面**：侧边栏的`settingsStore`状态没有实时更新，仍然使用旧的空配置
3. **重新打开后正常**：重新加载时会从存储中读取最新配置，所以显示正常

## 修复方案

### 1. 添加Chrome存储变化监听

在`settingsStore`中添加`chrome.storage.onChanged`监听器：

```typescript
// Listen for storage changes to sync across different contexts
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      console.log('🔄 [Settings] Storage changed, reloading settings...');
      loadSettingsInternal();
    }
  });
}
```

### 2. 改进设置保存方法

将所有设置保存方法改为异步，确保保存完成：

```typescript
async addModelConfig(id: string, config: any) {
  try {
    // 先更新本地状态
    const newModelSettings = await new Promise<any>((resolve) => {
      update(state => {
        const newSettings = { ...state.modelSettings, [id]: config };
        resolve(newSettings);
        return { ...state, modelSettings: newSettings };
      });
    });
    
    // 再保存到存储
    await chrome.runtime.sendMessage({
      type: 'set-storage',
      payload: { modelSettings: newModelSettings },
    });
    
    console.log('✅ [Settings] Model config added successfully:', id);
  } catch (error) {
    console.error('Failed to add model config:', error);
    throw error;
  }
}
```

### 3. 后台脚本广播存储更新

在后台脚本中，当存储更新时广播通知：

```typescript
case 'set-storage':
  await setStorageData(message.payload);
  
  // Notify all contexts about storage update
  try {
    // Send to all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'storage-updated',
          payload: message.payload
        }).catch(() => {});
      }
    }
    
    // Send to side panel
    chrome.runtime.sendMessage({
      type: 'storage-updated',
      payload: message.payload
    }).catch(() => {});
  } catch (error) {
    console.log('Failed to notify about storage update:', error);
  }
  
  sendResponse({ success: true });
  break;
```

### 4. 前端监听存储更新消息

在面板和选项页面中监听存储更新消息：

```typescript
function handleMessage(message: ExtensionMessage) {
  switch (message.type) {
    case 'storage-updated':
      console.log('💾 Storage updated, refreshing settings...');
      settingsStore.forceRefresh();
      break;
    // ... other cases
  }
}
```

### 5. 添加强制刷新方法

在`settingsStore`中添加强制刷新方法：

```typescript
// Force refresh settings from storage
async forceRefresh() {
  console.log('🔄 [Settings] Force refreshing settings...');
  return loadSettingsInternal();
}
```

## 修复效果

### 修复前的流程
1. 用户在选项页面配置模型 → 保存到存储
2. 侧边栏状态未更新 → 仍显示"No model configured"
3. 用户重新打开插件 → 重新加载，显示正常

### 修复后的流程
1. 用户在选项页面配置模型 → 保存到存储
2. 后台脚本广播存储更新消息 → 所有页面收到通知
3. 侧边栏接收消息 → 立即刷新设置状态
4. 界面实时更新 → 立即显示模型选择器

## 测试验证

### 测试步骤
1. 打开侧边栏，确认显示"No model configured"
2. 打开选项页面，配置一个AI模型
3. 保存配置后，立即切换回侧边栏
4. 验证侧边栏是否立即显示模型选择器

### 预期结果
- ✅ 配置保存后，侧边栏立即更新
- ✅ 不需要重新打开插件
- ✅ 模型选择器立即可用
- ✅ 可以正常发送消息

### 调试信息
在浏览器控制台中应该看到：
```
🔄 [Settings] Storage changed, reloading settings...
💾 Storage updated, refreshing settings...
✅ [Settings] Settings loaded successfully
✅ [Settings] Model config added successfully: [model-id]
```

## 兼容性

- ✅ 向后兼容，不影响现有功能
- ✅ 支持所有Chrome扩展API
- ✅ 适用于侧边栏和选项页面
- ✅ 处理网络错误和异常情况

## 总结

这次修复解决了跨页面状态同步问题，确保：
1. **实时同步**：配置保存后立即在所有页面生效
2. **可靠性**：多重机制确保状态同步
3. **用户体验**：无需重新打开插件即可使用新配置
4. **调试友好**：详细的日志便于问题排查

现在用户配置模型后应该能立即在侧边栏中看到更新，不再需要重新打开插件。

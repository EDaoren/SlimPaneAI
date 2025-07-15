# 网页聊天流程重新设计

## 概述

重新设计了网页聊天功能，支持用户自定义系统prompt，并将网站内容作为系统消息，用户问题作为用户消息。这样的设计更加灵活和合理。

## 主要改进

### 1. 消息角色分离
- **系统消息**: 包含自定义系统prompt + 网页内容
- **用户消息**: 只包含用户的问题
- **助手消息**: AI的回复

### 2. 自定义系统Prompt
- 用户可以在设置页面自定义系统提示词
- 默认提示词：`你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。要求：1. 仔细阅读和理解网页内容；2. 基于内容事实进行回答，不要编造信息；3. 如果问题无法从内容中找到答案，请明确说明；4. 回答要准确、简洁、有条理。`

### 3. 消息构建流程

#### 旧流程（已废弃）
```
用户问题 + 网页内容 → 单个用户消息 → AI
```

#### 新流程
```
自定义系统prompt + 网页内容 → 系统消息
用户问题 → 用户消息
→ AI处理
```

## 技术实现

### 1. 类型定义更新
- `UserPreferences` 添加 `pageChatSystemPrompt` 字段
- `ChatInput` 事件类型更新，支持 `systemPrompt` 和 `pageContent` 分离

### 2. 消息处理逻辑
```typescript
// ChatInput.svelte
if (pageChatState.enabled && pageChatState.currentPageContent) {
  systemPrompt = userPreferences.pageChatSystemPrompt;
  pageContent = `网页标题: ${title}\n网页链接: ${url}\n\n网页内容:\n${content}`;
}

dispatch('send', {
  message: userMessage,
  systemPrompt: systemPrompt,
  pageContent: pageContent,
  isPageChat: true
});
```

```typescript
// chat.ts
if (options?.isPageChat && options?.systemPrompt && options?.pageContent) {
  // 添加系统消息
  const systemMessage: Message = {
    type: 'system',
    content: `${options.systemPrompt}\n\n${options.pageContent}`,
  };
  
  messagesToSend = [systemMessage, ...messagesToSend];
  messagesToSend.push(userMessage); // 用户问题作为用户消息
}
```

### 3. 设置界面
在设置页面添加了"网页聊天设置"部分，包含：
- 自定义系统提示词文本区域
- 实时保存功能
- 使用说明

## 使用方法

### 1. 配置自定义系统Prompt
1. 打开设置页面
2. 找到"网页聊天设置"部分
3. 在"自定义系统提示词"文本框中输入你的prompt
4. 系统会自动保存

### 2. 使用网页聊天
1. 在任意网页上打开侧边栏
2. 点击页面聊天切换按钮启用网页聊天模式
3. 等待页面内容提取完成
4. 输入你的问题（只需要问题本身，不需要包含网页内容）
5. AI会基于你的自定义系统prompt和网页内容来回答

## 优势

### 1. 更灵活的Prompt控制
- 用户可以根据需要自定义系统prompt
- 支持不同的分析角度和回答风格
- 可以针对特定领域或任务优化prompt

### 2. 更清晰的消息结构
- 系统消息和用户消息职责明确
- 聊天记录更简洁，只显示用户问题和AI回答
- 便于后续的对话管理和历史记录

### 3. 更好的扩展性
- 可以轻松添加更多系统级配置
- 支持多种prompt模板
- 便于集成其他内容处理功能

## 示例

### 自定义系统Prompt示例

**学术分析模式**:
```
你是一个学术研究助手。请基于提供的网页内容进行学术性分析。要求：1. 使用学术语言和专业术语；2. 提供引用和参考；3. 分析内容的可信度和来源；4. 给出批判性思考。
```

**简化解释模式**:
```
你是一个友好的解释助手。请用简单易懂的语言基于网页内容回答问题。要求：1. 使用通俗语言；2. 避免专业术语；3. 提供具体例子；4. 确保内容易于理解。
```

**事实核查模式**:
```
你是一个事实核查专家。请基于网页内容进行事实验证和分析。要求：1. 识别关键事实和数据；2. 评估信息的准确性；3. 指出可能的偏见或不准确之处；4. 提供客观的分析结果。
```

## 向后兼容性

- 保留了原有的 `generateWebQAPrompt` 函数（暂时未使用）
- 现有的聊天记录和设置不受影响
- 升级后会自动使用默认的系统prompt

## 后续计划

1. 添加预设的prompt模板供用户选择
2. 支持基于网站域名的自动prompt选择
3. 添加prompt效果的评估和优化建议
4. 支持多语言的prompt模板

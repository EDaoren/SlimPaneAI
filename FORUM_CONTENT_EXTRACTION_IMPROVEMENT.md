# 网页内容提取优化：论坛评论保留改进

## 问题描述

在网页聊天功能中，当用户浏览论坛类网站时，内容提取过程存在以下问题：

1. **用户昵称被过滤**：论坛帖子中的用户昵称被错误地识别为噪声并被移除
2. **楼层结构混乱**：保留了楼层号但缺少发帖人信息，导致上下文不完整
3. **评论结构丢失**：无法区分不同用户的评论，内容混在一起

## 解决方案

我们对内容提取逻辑进行了全面优化，主要改进包括：

### 1. 网站类型智能检测

添加了网站类型检测功能，可以自动识别不同类型的网站：

```typescript
function detectSiteType(url: string, domain: string): 'forum' | 'blog' | 'news' | 'social' | 'general' {
  // 论坛类网站
  const forumIndicators = [
    'forum', 'bbs', 'community', 'discuss', 'thread', 'topic',
    'reddit.com', 'stackoverflow.com', 'zhihu.com', 'tieba.baidu.com',
    'v2ex.com', 'douban.com', 'weibo.com'
  ];
  
  // 检测逻辑...
  
  return 'forum'; // 或其他类型
}
```

### 2. 类型特定的过滤策略

根据网站类型使用不同的过滤策略：

```typescript
function getNoisySelectors(siteType: string): string[] {
  // 基础选择器（所有网站通用）
  const baseSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    '.advertisement', '.ads', '.ad', '.sidebar', '.menu',
    '.navigation', '.popup', '[role="banner"]', '[role="navigation"]'
  ];
  
  switch (siteType) {
    case 'forum':
      // 论坛类网站：保留评论和用户信息，但移除其他噪声
      return [
        ...baseSelectors,
        '.social', '.share-buttons', '.related-posts',
        '.breadcrumb', '.pagination-top'
      ];
    
    // 其他网站类型...
  }
}
```

### 3. 用户信息保留

特别处理用户名和评论相关元素：

```typescript
function isUserOrCommentElement(element: Element): boolean {
  // 用户名和评论相关的关键词
  const userKeywords = ['user', 'author', 'name', 'nickname', 'username', '楼主', '用户', '昵称'];
  const commentKeywords = ['comment', 'reply', 'post', 'message', 'content', '评论', '回复', '帖子'];
  
  // 检查逻辑...
  
  return isUserElement || isCommentElement;
}
```

### 4. 评论结构优化

在HTML转文本过程中保留评论结构：

```typescript
// 处理用户名和作者信息
const userElements = div.querySelectorAll('.username, .user, .author, .nickname, .post-author, .comment-author');
userElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text) {
    el.textContent = `【${text}】`;
  }
});

// 处理楼层信息
const floorElements = div.querySelectorAll('.floor, .post-number, .comment-number, [class*="floor"], [class*="楼"]');
floorElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text) {
    el.textContent = `[${text}] `;
  }
});
```

### 5. 调试工具

添加了测试函数，方便在控制台调试内容提取效果：

```typescript
// 将测试函数暴露到全局作用域，方便在控制台调用
(window as any).testSlimPaneContentExtraction = testContentExtraction;
```

## 技术实现细节

### 1. 网站类型检测

我们通过URL和域名分析来检测网站类型，支持以下几种类型：

- **论坛** (forum): 如Reddit、Stack Overflow、知乎、贴吧等
- **博客** (blog): 如WordPress、Medium、简书、CSDN等
- **新闻** (news): 如CNN、BBC、新华网、人民网等
- **社交媒体** (social): 如Twitter、Facebook、微博等
- **通用** (general): 其他类型网站

### 2. 智能噪声过滤

针对不同类型的网站，我们调整了噪声过滤策略：

- **论坛网站**：保留评论区和用户信息，移除社交分享按钮等
- **博客网站**：保留文章内容，可选择性移除评论区
- **新闻网站**：保留文章内容，移除相关推荐和广告
- **社交媒体**：保留用户内容和互动，移除推荐和广告

### 3. 用户信息保留

我们通过以下方式保留用户信息：

1. **降低文本长度阈值**：对论坛和社交网站，将最小文本长度从20降至5
2. **保留特定元素**：保留包含用户名、昵称等关键词的元素
3. **结构化处理**：使用特殊格式标记用户名和楼层信息

### 4. 评论结构优化

为了保留评论结构，我们：

1. 使用【用户名】格式标记用户信息
2. 使用[楼层号]格式标记楼层信息
3. 对论坛类网站的评论添加分隔符：`--- 评论 ---` 和 `--- 评论结束 ---`

## 使用方法

### 开发者测试

在浏览器控制台中，可以使用以下命令测试内容提取效果：

```javascript
// 测试内容提取
const result = testSlimPaneContentExtraction();
console.log(result.rawText); // 查看提取的文本内容
```

### 用户体验

用户无需进行任何操作，网页聊天功能会自动使用优化后的内容提取逻辑。现在，当用户在论坛类网站上使用网页聊天功能时：

1. 用户昵称会被保留，格式为【用户名】
2. 楼层信息会被保留，格式为[楼层号]
3. 评论结构会更加清晰，便于理解上下文

## 效果对比

### 优化前

```
这是一个很好的问题 1楼

确实如此 2楼

我不同意上面的观点 3楼
```

### 优化后

```
【用户A】[1楼] 这是一个很好的问题

【用户B】[2楼] 确实如此

【用户C】[3楼] 我不同意上面的观点
```

## 后续优化方向

1. **网站特定规则**：为常见论坛网站添加更精确的选择器
2. **评论树结构**：保留评论的层级关系，如回复关系
3. **用户头像**：考虑提取用户头像URL信息
4. **引用内容**：优化对引用内容的处理
5. **机器学习辅助**：使用机器学习模型辅助识别内容结构

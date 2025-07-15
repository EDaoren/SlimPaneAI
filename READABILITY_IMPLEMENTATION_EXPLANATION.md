# Readability 实现说明

## 问题背景

在代码中发现了一个有趣的情况：项目的 `package.json` 中引入了 Mozilla 的 Readability 库（`@mozilla/readability`），但实际代码中并没有使用这个库，而是实现了一个自定义的内容提取算法。这引发了关于为什么同时存在两种实现的疑问。

## 原因分析

### 1. 开发过程中的演进

项目最初可能计划使用 Mozilla Readability 库，但在开发过程中决定实现自己的版本，原因可能包括：

- **需求特殊性**：网页聊天功能需要保留更多结构信息（如用户名、评论等）
- **性能考虑**：Mozilla Readability 库可能对于浏览器扩展来说过于庞大
- **兼容性问题**：在 content script 环境中可能存在兼容性问题

### 2. 浏览器扩展的限制

浏览器扩展的 content script 环境有特殊限制：

- **DOM 访问限制**：content script 的 DOM 访问方式与普通网页不同
- **安全策略**：浏览器的内容安全策略(CSP)可能限制某些库的功能
- **资源限制**：扩展需要保持轻量，避免不必要的依赖

### 3. 功能需求差异

Mozilla Readability 主要用于创建类似浏览器阅读模式的体验，而我们的需求是：

- 提取内容用于 AI 分析，需要保留更多语义信息
- 针对不同类型网站（论坛、博客、新闻等）进行优化
- 特别关注用户评论、昵称等在论坛类网站中的重要信息

## 解决方案

我们采取了以下措施来解决这个问题：

### 1. 移除未使用的依赖

从 `package.json` 中移除了未使用的 `@mozilla/readability` 依赖：

```diff
  "dependencies": {
    "katex": "^0.16.9",
    "svelte-i18n": "^4.0.0",
    "pdfjs-dist": "^4.0.0",
-   "@mozilla/readability": "^0.5.0",
    "turndown": "^7.1.3"
  }
```

### 2. 更新代码注释

更新了代码中的注释，使其更准确地反映实际实现：

```diff
/**
 * 专业的网页内容处理器
- * 基于 Mozilla Readability 和自定义算法进行内容提取和预处理
+ * 基于 Readability 思想的自定义算法进行内容提取和预处理
+ * 针对不同类型网站（论坛、博客、新闻等）进行了优化
 */
```

### 3. 重命名相关函数

将函数名称更改为更准确的描述：

```diff
- private static tryReadability(): string | null {
+ private static trySmartExtraction(): string | null {
```

```diff
- private static simpleReadability(doc: Document): Element | null {
+ private static smartContentExtraction(doc: Document): Element | null {
```

## 自定义实现的优势

我们的自定义实现相比 Mozilla Readability 有以下优势：

### 1. 网站类型感知

```typescript
function detectSiteType(url: string, domain: string): 'forum' | 'blog' | 'news' | 'social' | 'general' {
  // 根据URL和域名特征检测网站类型
  // ...
}
```

可以根据网站类型应用不同的内容提取策略，特别适合论坛、博客等不同类型的网站。

### 2. 保留用户信息

```typescript
// 处理用户名和作者信息
const userElements = div.querySelectorAll('.username, .user, .author, .nickname');
userElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text) {
    el.textContent = `【${text}】`;
  }
});
```

特别关注用户昵称、评论等信息，这些在 Mozilla Readability 中通常会被过滤掉。

### 3. 结构化处理

```typescript
// 论坛特殊处理：保留评论结构
if (siteType === 'forum') {
  const comments = div.querySelectorAll('.comment, .post, .reply');
  comments.forEach(comment => {
    // 保留评论结构
  });
}
```

针对不同类型的内容元素进行特殊处理，保留更多语义结构。

### 4. 轻量级实现

自定义实现只包含必要的功能，避免了引入完整库的开销，更适合浏览器扩展环境。

## 结论

虽然 Mozilla Readability 是一个优秀的内容提取库，但对于我们的特定需求，自定义实现提供了更大的灵活性和针对性。通过移除未使用的依赖并更新代码注释，我们使代码库更加清晰和一致。

自定义的内容提取算法虽然借鉴了 Readability 的思想，但更专注于我们的特定场景：保留论坛用户信息、评论结构，并针对不同类型的网站进行优化。这种方法更好地满足了网页聊天功能的需求，提供了更好的用户体验。

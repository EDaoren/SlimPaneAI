# Mozilla Readability + CSS 黑名单实施方案

## 深度理解设计方案

基于 `readability_css_blacklist_guide.md` 的设计方案，我深度理解了以下核心要点：

### 1. 核心思想
- **先清理，后提取**：必须先用 CSS 黑名单移除噪声元素，再交给 Readability 处理
- **组合优势**：Readability 算法 + 站点特定黑名单 = 准确率从 80% 提升到 95%
- **轻量高效**：毫秒级处理，适合浏览器扩展环境

### 2. 处理流程
```
HTML/DOM → CSS黑名单过滤 → isProbablyReaderable检查 → Readability.parse → 安全过滤 → 输出
```

### 3. 黑名单策略
- **两层架构**：全局黑名单 + 站点特定规则
- **批量处理**：`querySelectorAll(selectors.join(","))` 一次性查询
- **增量更新**：支持用户反馈和数据驱动的规则优化

### 4. 性能优化
- 批量查询比逐条循环快 1.8 倍
- 增量处理新内容（适用于 SPA 和无限滚动）
- 异步渲染和安全过滤

## 实施进展

### ✅ 已完成

1. **恢复 Mozilla Readability 依赖**
   - 重新添加 `@mozilla/readability` 到 package.json
   - 安装依赖成功

2. **创建基于设计方案的提取器**
   - 实现了 `src/lib/readability-extractor/index.ts`
   - 包含全局黑名单和站点特定规则
   - 支持批量查询和错误处理

3. **更新 Content Script**
   - 重构了 `processCurrentPageContent` 函数
   - 添加了 Readability 提取逻辑
   - 实现了回退机制

4. **黑名单规则库**
   - 全局黑名单：广告、导航、弹窗、社交分享等
   - 站点特定规则：微博、知乎、CSDN、Stack Overflow 等

### 🔄 需要完成

1. **Readability 库加载**
   - 需要将 Mozilla Readability 库正确加载到浏览器环境
   - 更新构建配置以包含 Readability 库
   - 确保在 content script 中可用

2. **构建配置优化**
   - 更新 Vite 配置以处理 Readability 库
   - 确保库在浏览器扩展环境中正确工作

3. **测试和调试**
   - 在实际网站上测试提取效果
   - 优化黑名单规则
   - 性能测试和优化

## 技术实现细节

### 1. 黑名单应用

```typescript
function applyBlacklist(doc: Document, host?: string): void {
  const selectors = [
    ...GLOBAL_BLACKLIST,
    ...(SITE_RULES[host] ?? [])
  ];
  
  const elementsToRemove = doc.querySelectorAll(selectors.join(','));
  elementsToRemove.forEach((el) => el.remove());
}
```

### 2. Readability 集成

```typescript
function extractContentWithReadability() {
  // 1. 检查页面是否适合处理
  if (!isProbablyReaderable(document)) return null;
  
  // 2. 创建文档副本
  const clonedDoc = document.cloneNode(true) as Document;
  
  // 3. 应用黑名单
  applyReadabilityBlacklist(clonedDoc);
  
  // 4. 使用 Readability 提取
  const reader = new Readability(clonedDoc);
  return reader.parse();
}
```

### 3. 回退机制

```typescript
function processCurrentPageContent() {
  const extractedContent = extractContentWithReadability();
  
  if (!extractedContent) {
    // 回退到基础提取
    return fallbackContentExtraction();
  }
  
  return formatExtractedContent(extractedContent);
}
```

## 黑名单规则设计

### 全局黑名单
- **广告相关**：`.ad`, `.ads`, `.advertisement`, `.sponsored`
- **导航结构**：`nav`, `header`, `footer`, `aside`, `.sidebar`
- **弹窗模态**：`.popup`, `.modal`, `.overlay`, `.cookie-notice`
- **社交分享**：`.social`, `.share-buttons`, `.social-media`
- **推荐内容**：`.related-posts`, `.recommended`, `.trending`

### 站点特定规则
- **微博**：`.WB_footer`, `.wb_feed_nav`, `.WB_global_nav`
- **知乎**：`.Post-SideActions`, `.Recommended`, `.Card-section`
- **CSDN**：`.tool-box`, `.recommend-box`, `.aside-box`
- **Stack Overflow**：`.js-sidebar`, `.s-sidebarwidget`, `.module`

## 优势分析

### 1. 相比自定义实现
- **更高准确率**：Mozilla Readability 经过大量网站测试优化
- **更好兼容性**：支持各种复杂的网页结构
- **持续更新**：Mozilla 团队持续维护和改进

### 2. 相比纯 Readability
- **更精准过滤**：站点特定黑名单移除 Readability 无法识别的噪声
- **更好的论坛支持**：可以保留或移除评论区，根据需要调整
- **可定制性**：可以根据具体需求调整黑名单规则

### 3. 性能优势
- **批量处理**：一次性查询所有选择器
- **增量更新**：只处理新增内容
- **轻量级**：相比复杂的机器学习方案更轻量

## 下一步计划

1. **解决库加载问题**
   - 配置 Vite 正确打包 Readability 库
   - 确保在浏览器扩展环境中可用

2. **测试和优化**
   - 在各种网站上测试提取效果
   - 收集用户反馈优化黑名单规则
   - 性能测试和优化

3. **功能增强**
   - 添加用户自定义黑名单功能
   - 实现规则的动态更新机制
   - 添加提取质量评估

4. **集成到网页聊天**
   - 替换现有的自定义提取逻辑
   - 确保与现有聊天功能兼容
   - 测试用户体验

这个方案完全符合 `readability_css_blacklist_guide.md` 的设计思想，将为网页聊天功能提供更高质量的内容提取能力。

# Mozilla Readability 回退策略重新设计

## 问题背景

您正确地指出了一个重要问题：当前的回退机制使用的是自定义实现的基础提取，这与我们使用 Mozilla Readability 的设计目标不一致。

### 原有问题
```typescript
// 原有的回退逻辑
if (!extractedContent) {
  // 如果 Readability 失败，回退到基础提取
  return fallbackContentExtraction(); // ❌ 这是自定义实现
}
```

这种设计存在以下问题：
1. **维护两套逻辑**：需要同时维护 Mozilla Readability 和自定义提取逻辑
2. **不一致的结果**：两种方法可能产生不同质量的结果
3. **违背设计原则**：与使用 Mozilla Readability 的目标不符

## 解决方案

我们重新设计了回退策略，完全基于 Mozilla Readability，但使用不同的配置参数。

### 新的回退流程

```typescript
// 新的回退逻辑
if (!extractedContent) {
  // 尝试更宽松的 Readability 配置
  const fallbackContent = tryFallbackReadability();
  
  if (!fallbackContent) {
    // 如果所有 Readability 尝试都失败，返回空结果
    return createEmptyResult();
  }
  
  return formatReadabilityResult(fallbackContent);
}
```

### 三层回退策略

#### 1. 主要 Readability 配置（默认）
```typescript
const reader = new window.Readability(clonedDoc, {
  debug: false,
  maxElemsToParse: 0,
  nbTopCandidates: 5,
  charThreshold: 500,
  classesToPreserve: ['highlight', 'code', 'pre']
});
```

#### 2. 宽松 Readability 配置（回退）
```typescript
const reader = new window.Readability(clonedDoc, {
  debug: false,
  maxElemsToParse: 0,
  nbTopCandidates: 10,    // 增加候选数量
  charThreshold: 100,     // 降低字符阈值
  classesToPreserve: ['highlight', 'code', 'pre', 'content', 'main', 'article'],
  keepClasses: true       // 保留更多类名
});
```

#### 3. 空结果（最终回退）
如果所有 Readability 配置都失败，返回一个空的结果对象，而不是使用自定义提取。

## 技术实现

### 1. 移除自定义回退函数

删除了以下自定义实现的函数：
- `fallbackContentExtraction()` - 自定义回退提取
- `extractBasicMetadata()` - 基础元数据提取
- `extractBasicContent()` - 基础内容提取

### 2. 新增 Readability 专用函数

#### `tryFallbackReadability()`
```typescript
function tryFallbackReadability() {
  // 使用更宽松的 Readability 配置
  const reader = new window.Readability(clonedDoc, {
    nbTopCandidates: 10,
    charThreshold: 100,
    classesToPreserve: ['highlight', 'code', 'pre', 'content', 'main', 'article'],
    keepClasses: true
  });
  
  return reader.parse();
}
```

#### `formatReadabilityResult()`
```typescript
function formatReadabilityResult(extractedContent: any) {
  // 统一处理 Readability 结果
  // 包括文本清理、元数据构建、内容分块
}
```

#### `createEmptyResult()`
```typescript
function createEmptyResult() {
  // 返回空的结果对象，保持接口一致性
}
```

### 3. 统一的结果处理

所有 Readability 结果都通过 `formatReadabilityResult()` 函数处理，确保：
- 文本清理（移除多余换行）
- 元数据构建
- 内容分块
- 一致的数据格式

## 优势

### 1. 设计一致性
- **单一技术栈**：完全基于 Mozilla Readability
- **统一的结果质量**：所有提取都使用相同的算法
- **简化维护**：只需要维护一套逻辑

### 2. 更好的回退策略
- **渐进式降级**：从严格配置到宽松配置
- **保持质量**：即使是回退也使用专业的提取算法
- **明确失败**：如果无法提取，明确返回空结果

### 3. 符合设计原则
- **遵循 readability_css_blacklist_guide.md**：完全基于 Mozilla Readability
- **避免重复实现**：不再维护自定义提取逻辑
- **专业化**：使用经过验证的内容提取算法

## 配置参数说明

### `nbTopCandidates`
- **默认**: 5
- **回退**: 10
- **作用**: 增加候选内容区域的数量，提高找到内容的概率

### `charThreshold`
- **默认**: 500
- **回退**: 100
- **作用**: 降低内容长度要求，允许提取较短的内容

### `classesToPreserve`
- **默认**: `['highlight', 'code', 'pre']`
- **回退**: `['highlight', 'code', 'pre', 'content', 'main', 'article']`
- **作用**: 保留更多可能包含内容的类名

### `keepClasses`
- **默认**: false
- **回退**: true
- **作用**: 在回退模式下保留更多类名信息

## 错误处理

### 1. Readability 库不可用
```typescript
if (typeof window.Readability === 'undefined') {
  console.warn('SlimPaneAI: Readability library not available');
  return createEmptyResult();
}
```

### 2. 页面不适合 Readability
```typescript
if (!window.isProbablyReaderable(document)) {
  console.warn('SlimPaneAI: Page is not readerable');
  return createEmptyResult();
}
```

### 3. 所有配置都失败
```typescript
if (!fallbackContent) {
  console.error('SlimPaneAI: All Readability attempts failed');
  return createEmptyResult();
}
```

## 测试和调试

测试函数已更新，可以在控制台中调用：
```javascript
// 测试完整的提取流程
const result = testSlimPaneContentExtraction();
```

测试会显示：
- 使用的 Readability 配置
- 提取成功/失败的信息
- 内容长度和质量统计
- 文本清理效果

## 后续优化

1. **动态配置调整**：根据网站类型调整 Readability 参数
2. **质量评估**：评估提取结果的质量，决定是否需要回退
3. **用户反馈**：收集用户反馈，优化配置参数
4. **性能监控**：监控不同配置的性能表现

这个重新设计完全符合您的要求，移除了自定义实现，完全基于 Mozilla Readability，同时提供了合理的回退策略。

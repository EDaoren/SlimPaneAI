# 内容提取配置重构方案

## 重构背景

原始设计中的 `preserve` 配置在实际使用中存在以下问题：
1. Readability 只能保留 CSS 类名，不能保留具体内容结构
2. 最终输出为纯文本给 GPT 处理，CSS 类名信息会丢失
3. preserve 配置的实际效果有限，增加了配置复杂度

## 重构目标

1. **简化配置结构** - 移除意义不大的 preserve 配置
2. **增强文本提取** - 通过元信息提取补充有用信息  
3. **改进用户体验** - 降低配置复杂度，提供更直观的配置选项
4. **保持向后兼容** - 渐进式重构，确保现有功能正常

## 核心改动

### 1. 移除 preserve 相关配置

#### 需要删除的配置项：
```javascript
// 全局配置中删除
"preserve": [...],

// 域名配置中删除  
"domains": {
  "example.com": {
    "preserve": [...], // 删除
  }
}

// Readability 选项中删除
"readabilityOptions": {
  "classesToPreserve": [...], // 删除
  "keepClasses": true, // 改为 false
  "preserveLinks": false // 纯文本场景改为 false
}
```

### 2. 新增 metadata 元信息提取配置

#### 全局 metadata 配置结构：
```javascript
"metadata": {
  "enabled": true,
  "selectors": {
    "author": ".author, .username, .byline, [rel='author']",
    "date": ".date, .time, .published, time[datetime], .post-date", 
    "tags": ".tag, .category, .label, .hashtag",
    "title": "h1, .title, .post-title, .article-title"
  },
  "format": {
    "template": "作者: {author}\n发布时间: {date}\n标签: {tags}\n\n---\n\n{content}",
    "separator": ", ",
    "includeEmpty": false
  }
}
```

#### 域名特定 metadata 配置示例：
```javascript
"domains": {
  "zhihu.com": {
    "metadata": {
      "selectors": {
        "author": ".AuthorInfo-name, .UserLink-link",
        "date": ".ContentItem-time, .PublishDate", 
        "tags": ".Tag, .TopicLink",
        "votes": ".VoteButton-count"
      },
      "format": {
        "template": "作者: {author}\n发布时间: {date}\n点赞数: {votes}\n话题: {tags}\n\n---\n\n{content}"
      }
    }
  },
  "csdn.net": {
    "metadata": {
      "selectors": {
        "author": ".nick-name, .follow-nickName",
        "date": ".time, .post-time",
        "tags": ".tags-box a, .tag-link", 
        "views": ".read-count",
        "category": ".type-title"
      }
    }
  }
}
```

### 3. 更新模板配置结构

#### 技术博客模板：
```javascript
"templates": {
  "tech-blog": {
    "name": "技术博客通用",
    "description": "适用于技术博客和文档站点",
    "config": {
      "remove": [".sidebar", ".widget", "aside", ".ad"],
      "metadata": {
        "enabled": true,
        "selectors": {
          "author": ".author, .by-author, .post-author",
          "date": ".date, .post-date, .publish-date",
          "tags": ".tag, .tags a, .post-tags a", 
          "category": ".category, .post-category"
        }
      }
    }
  }
}
```

#### 新闻网站模板：
```javascript
"news": {
  "name": "新闻网站",
  "description": "适用于新闻门户网站",
  "config": {
    "remove": [".ad", ".sidebar", ".related", ".hot-news"],
    "metadata": {
      "enabled": true,
      "selectors": {
        "author": ".author, .reporter, .journalist",
        "date": ".publish-time, .news-time, .date",
        "source": ".source, .media-source", 
        "location": ".dateline, .location"
      },
      "format": {
        "template": "记者: {author}\n来源: {source}\n时间: {date}\n地点: {location}\n\n---\n\n{content}"
      }
    }
  }
}
```

## 界面配置更新

### 新的基础配置区域
```
🔄 提取方式选择
○ 纯文本提取（保留所有文本）
○ 智能提取（推荐，Readability + 元信息增强）

📝 噪音过滤  
┌─────────────────────────────────────────────────┐
│ .ad, .sidebar, nav, footer, .comment           │
│ [常用: 广告] [导航] [评论] [侧边栏]            │
└─────────────────────────────────────────────────┘

📋 元信息提取（智能提取模式时显示）
☑ 启用元信息提取

作者信息: ┌─────────────────────────────────────┐
         │ .author, .username, .byline        │
         └─────────────────────────────────────┘

发布时间: ┌─────────────────────────────────────┐  
         │ .date, .time, .published           │
         └─────────────────────────────────────┘

标签分类: ┌─────────────────────────────────────┐
         │ .tag, .category, .label            │
         └─────────────────────────────────────┘
```

### 输出格式配置
```
📄 输出格式模板
┌─────────────────────────────────────────────────┐
│ 作者: {author}                                 │
│ 发布时间: {date}                               │
│ 标签: {tags}                                   │
│                                                 │
│ ---                                             │
│                                                 │
│ {content}                                       │
└─────────────────────────────────────────────────┘

可用变量: {author} {date} {tags} {title} {votes} {views} {source} {location}
```

## 实现逻辑

### 核心提取函数
```javascript
function enhancedExtraction(document, config) {
  // 1. Readability 提取主要内容
  const readabilityResult = readability.parse(document.cloneNode(true));
  const mainContent = readabilityResult.textContent;
  
  // 2. 提取元信息
  let enhancedContent = mainContent;
  
  if (config.metadata && config.metadata.enabled) {
    const metadata = extractMetadata(document, config.metadata.selectors);
    enhancedContent = formatContent(metadata, mainContent, config.metadata.format);
  }
  
  return enhancedContent;
}

function extractMetadata(dom, selectors) {
  const metadata = {};
  
  Object.entries(selectors).forEach(([key, selector]) => {
    if (key === 'tags') {
      // 处理多个标签
      const elements = dom.querySelectorAll(selector);
      if (elements.length > 0) {
        metadata[key] = Array.from(elements).map(el => el.textContent.trim());
      }
    } else {
      // 处理单个元素
      const element = dom.querySelector(selector);
      if (element) {
        metadata[key] = element.textContent.trim() || 
                       element.getAttribute('datetime') || 
                       element.getAttribute('title');
      }
    }
  });
  
  return metadata;
}

function formatContent(metadata, content, formatConfig) {
  if (!formatConfig || !formatConfig.template) {
    // 默认格式
    return buildDefaultFormat(metadata, content);
  }
  
  let result = formatConfig.template;
  
  // 替换变量
  Object.entries(metadata).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      if (Array.isArray(value)) {
        const separator = formatConfig.separator || ', ';
        result = result.replace(placeholder, value.join(separator));
      } else {
        result = result.replace(placeholder, value || '');
      }
    }
  });
  
  // 处理内容占位符
  result = result.replace('{content}', content);
  
  // 移除空行（如果配置了不包含空字段）
  if (formatConfig.includeEmpty === false) {
    result = result.replace(/^.*: \s*$/gm, '').replace(/\n{3,}/g, '\n\n');
  }
  
  return result;
}
```

### 配置合并逻辑
```javascript
function mergeConfigs(globalConfig, domainConfig) {
  const merged = { ...globalConfig };
  
  if (domainConfig) {
    // 合并 remove 规则
    if (domainConfig.remove) {
      merged.remove = [...(globalConfig.remove || []), ...domainConfig.remove];
    }
    
    // 域名特定的元信息配置优先
    if (domainConfig.metadata) {
      merged.metadata = {
        ...globalConfig.metadata,
        ...domainConfig.metadata,
        selectors: {
          ...globalConfig.metadata?.selectors,
          ...domainConfig.metadata.selectors
        }
      };
    }
    
    // Readability 选项合并
    if (domainConfig.readabilityOptions) {
      merged.readabilityOptions = {
        ...globalConfig.readabilityOptions,
        ...domainConfig.readabilityOptions
      };
    }
  }
  
  return merged;
}
```

## 迁移步骤

### 阶段 1：数据结构更新
1. 更新配置文件 JSON Schema
2. 添加 metadata 配置支持  
3. 保留现有 preserve 配置以确保向后兼容

### 阶段 2：功能实现
1. 实现 metadata 提取逻辑
2. 实现内容格式化功能
3. 更新配置合并逻辑

### 阶段 3：界面更新  
1. 移除 preserve 相关 UI 组件
2. 添加 metadata 配置界面
3. 更新预设模板

### 阶段 4：测试与优化
1. 测试主流网站的提取效果
2. 优化元信息提取准确率
3. 完善错误处理

## 配置示例

### 完整的新配置文件结构
```javascript
{
  "version": "2.0",
  "mode": "readability",
  "global": {
    "remove": [".ad", ".sidebar", "nav", "footer", ".comment-section"],
    "metadata": {
      "enabled": true,
      "selectors": {
        "author": ".author, .username, .byline",
        "date": ".date, .time, .published", 
        "tags": ".tag, .category, .label",
        "title": "h1, .title, .post-title"
      },
      "format": {
        "template": "标题: {title}\n作者: {author}\n发布时间: {date}\n标签: {tags}\n\n---\n\n{content}",
        "separator": ", ",
        "includeEmpty": false
      }
    },
    "readabilityOptions": {
      "charThreshold": 50,
      "keepClasses": false,
      "preserveLinks": false,
      "maxElemsToDivide": 5
    }
  },
  "domains": {
    "zhihu.com": {
      "name": "知乎", 
      "remove": [".RichContent-ad", ".Sticky"],
      "metadata": {
        "selectors": {
          "author": ".AuthorInfo-name",
          "date": ".ContentItem-time",
          "tags": ".Tag",
          "votes": ".VoteButton-count"
        },
        "format": {
          "template": "作者: {author}\n时间: {date}\n点赞: {votes}\n话题: {tags}\n\n---\n\n{content}"
        }
      }
    }
  }
}
```

## 预期效果

### 重构前输出：
```
JavaScript中的异步编程模式

在现代前端开发中，异步编程是一个重要的概念...
```

### 重构后输出：
```  
标题: JavaScript中的异步编程模式
作者: 张三
发布时间: 2024-01-15 14:30
标签: JavaScript, 异步编程, 前端开发

---

JavaScript中的异步编程模式

在现代前端开发中，异步编程是一个重要的概念...
```

通过这次重构，用户将获得更实用的配置选项和更丰富的文本内容，同时降低了配置的复杂度。
# 内容提取配置功能设计文档

## 功能概述

提供可配置的网页内容提取功能，支持纯文本提取和Readability智能提取两种模式，允许用户自定义过滤和保留规则，并支持特定域名的个性化配置。

## 界面设计

### 基础配置区

#### 提取方式选择
```
🔄 提取方式选择
○ 纯文本提取（保留所有文本，简单粗暴）
  - 适合：简单页面、个人博客、纯文本内容
  - 特点：速度快、无遗漏、但可能包含噪音
  
○ Readability 智能提取（推荐，适合大多数文章）
  - 适合：新闻网站、技术文章、复杂页面
  - 特点：智能识别主要内容、过滤广告导航
```

#### 通用过滤配置
```
📝 通用过滤配置

移除元素（CSS选择器）
┌─────────────────────────────────────────────────┐
│ .ad, .sidebar, .navigation, footer, .comment    │
│                                                 │
│ [提示: 多个选择器用逗号分隔，支持CSS选择器语法]   │
│ [常用: .ad, nav, footer, .sidebar, .popup]      │
└─────────────────────────────────────────────────┘

🎯 保留元素（CSS选择器，仅Readability模式）
┌─────────────────────────────────────────────────┐
│ .author, .username, .post-meta, .date, .tags    │
│                                                 │
│ [提示: 强制保留这些元素，避免被Readability过滤]  │
│ [常用: .author, .time, .tags, .category]        │
└─────────────────────────────────────────────────┘
```

### 高级配置区（可折叠）

```
⚙️ 高级配置 [展开/收起]

📍 域名特定规则
┌─ 域名规则管理 ─────────────────────────────────────┐
│                                                   │
│ 域名: zhihu.com                    [删除] [编辑]   │
│ └─ 移除: .RichContent-ad, .Sticky                 │
│ └─ 保留: .AuthorInfo-name, .ContentItem-time      │
│                                                   │
│ 域名: csdn.net                     [删除] [编辑]   │
│ └─ 移除: .tool-box, .comment-box                  │
│ └─ 保留: .nick-name, .time                        │
│                                                   │
│ [+ 添加新域名规则]                                │
└───────────────────────────────────────────────────┘

🔧 Readability参数调整
┌─ 基础参数 ─────────────────────────────────────────┐
│ □ 保留CSS类名 (keepClasses)                        │
│ □ 保留短文本元素 (charThreshold: 0)               │
│ □ 保留链接结构 (preserveLinks)                     │
│                                                   │
│ 字符阈值: [50] (小于此长度的段落将被移除)          │
│ 最大元素分割数: [5] (控制内容分析深度)             │
└───────────────────────────────────────────────────┘

📋 预设模板
┌─ 网站类型预设 ─────────────────────────────────────┐
│ [知乎专用] [CSDN技术] [简书博客] [新闻网站]        │
│ [技术文档] [论坛社区] [个人博客] [购物网站]        │
│                                                   │
│ 自定义模板: [保存当前配置] [导入配置]             │
└───────────────────────────────────────────────────┘
```

## 配置数据结构

```javascript
{
  "version": "1.0",
  "mode": "readability", // "text" | "readability"
  "global": {
    "remove": [
      ".ad", 
      ".sidebar", 
      "nav", 
      "footer",
      ".comment-section",
      ".related-posts"
    ],
    "preserve": [
      ".author", 
      ".username", 
      ".date",
      ".tags",
      ".category"
    ],
    "readabilityOptions": {
      "charThreshold": 50,
      "keepClasses": true,
      "preserveLinks": false,
      "maxElemsToDivide": 5,
      "classesToPreserve": []  // 基于preserve数组生成
    }
  },
  "domains": {
    "zhihu.com": {
      "name": "知乎",
      "remove": [
        ".RichContent-ad", 
        ".Sticky",
        ".TopstoryPageHeader",
        ".Card-ad"
      ],
      "preserve": [
        ".AuthorInfo-name", 
        ".ContentItem-time",
        ".VoteButton",
        ".Tag"
      ],
      "readabilityOptions": {
        "charThreshold": 20
      }
    },
    "csdn.net": {
      "name": "CSDN",
      "remove": [
        ".tool-box", 
        ".comment-box",
        "#recommend-box",
        ".csdn-side-toolbar"
      ],
      "preserve": [
        ".nick-name", 
        ".time",
        ".tags",
        ".article-info-box"
      ]
    },
    "jianshu.com": {
      "name": "简书",
      "remove": [
        ".note-promotion",
        ".side-tool",
        ".recommended-notes"
      ],
      "preserve": [
        ".author",
        ".publish-time",
        ".wordage"
      ]
    }
  },
  "templates": {
    "news": {
      "name": "新闻网站通用",
      "description": "适用于新闻门户网站",
      "global": {
        "remove": [".ad", ".sidebar", ".related", ".hot-news"],
        "preserve": [".author", ".publish-time", ".source"]
      }
    },
    "blog": {
      "name": "个人博客",
      "description": "适用于个人博客和技术博客",
      "global": {
        "remove": [".widget", ".sidebar", "aside"],
        "preserve": [".author", ".date", ".categories", ".tags"]
      }
    }
  }
}
```

## 功能特性

### 1. 实时预览功能
```
🔍 测试提取效果
┌─ 测试URL ──────────────────────────────────────────┐
│ https://example.com/article/123                   │
└───────────────────────────────────────────────────┘

[测试提取] [使用当前页面]

提取结果预览:
┌─ 标题: 文章标题示例 ──────────────────────────────┐
│ 作者: 张三 | 时间: 2025-07-21                     │
│                                                   │
│ 这里是文章的主要内容预览...                       │
│ （显示前500字符）                                 │
└───────────────────────────────────────────────────┘

[查看完整结果] [应用此配置]
```

### 2. 智能建议功能
- 根据当前域名自动推荐配置
- 分析页面结构，建议可能的移除/保留选择器
- 提供常见网站的最佳实践配置

### 3. 配置管理
- 导入/导出JSON配置文件
- 配置版本管理和回滚
- 配置分享（生成分享链接）

## 界面交互细节

### 基础操作
1. **模式切换**: 提供明确的使用场景说明
2. **选择器输入**: 
   - 语法高亮显示
   - 常用选择器快速插入按钮
   - 实时语法验证
3. **测试功能**: 一键测试当前配置效果
4. **重置选项**: 恢复默认配置，确认对话框

### 高级功能
1. **域名规则编辑器**: 
   - 弹窗编辑界面
   - 支持正则表达式匹配域名
   - 继承全局配置选项
2. **批量操作**: 
   - 批量导入域名规则
   - 批量应用模板配置
3. **配置验证**: 
   - 检查选择器有效性
   - 配置冲突提醒

## 预设模板详情

### 常用网站配置

#### 知乎 (zhihu.com)
```javascript
{
  "remove": [".RichContent-ad", ".Sticky", ".TopstoryPageHeader", ".Card-ad"],
  "preserve": [".AuthorInfo-name", ".ContentItem-time", ".VoteButton", ".Tag"],
  "readabilityOptions": {"charThreshold": 20}
}
```

#### CSDN (csdn.net)
```javascript
{
  "remove": [".tool-box", ".comment-box", "#recommend-box", ".csdn-side-toolbar"],
  "preserve": [".nick-name", ".time", ".tags", ".article-info-box"]
}
```

#### 简书 (jianshu.com)
```javascript
{
  "remove": [".note-promotion", ".side-tool", ".recommended-notes"],
  "preserve": [".author", ".publish-time", ".wordage"]
}
```

#### 博客园 (cnblogs.com)
```javascript
{
  "remove": [".sidebar", ".footer", ".ad", "#blog-nav"],
  "preserve": [".postTitle", ".postDesc", ".postBody"]
}
```

### 分类模板

#### 技术文档类
- 适用于：GitHub Pages、GitBook、文档站点
- 特点：保留代码块、保留目录结构

#### 新闻媒体类
- 适用于：新浪、网易、腾讯新闻等
- 特点：保留发布时间、来源、作者信息

#### 论坛社区类
- 适用于：贴吧、论坛、问答网站
- 特点：保留用户信息、回复结构、投票信息

## 技术实现要点

### 1. 配置解析优先级
```
域名特定配置 > 全局配置 > 默认配置
```

### 2. 选择器合并策略
- remove选择器：域名配置 + 全局配置
- preserve选择器：域名配置优先，全局配置补充
- Readability参数：域名配置覆盖全局配置

### 3. 性能优化
- 配置缓存机制
- 选择器预编译
- 分步骤处理大型页面

### 4. 错误处理
- 无效选择器降级处理
- 提取失败时的备用方案
- 用户友好的错误提示

## 用户使用流程

### 新用户
1. 选择提取方式（推荐Readability）
2. 使用默认配置或选择预设模板
3. 在当前页面测试效果
4. 根据需要微调配置

### 高级用户
1. 创建域名特定规则
2. 调整Readability参数
3. 保存为自定义模板
4. 导出配置文件备份

### 开发者
1. 导入现有配置文件
2. 批量测试多个URL
3. 调试复杂选择器
4. 分享最佳实践配置

## 后续扩展方向

1. **AI辅助配置**: 基于页面结构自动生成配置建议
2. **社区配置库**: 用户共享和评价配置模板
3. **配置统计**: 分析最受欢迎的配置模式
4. **A/B测试**: 对比不同配置的提取效果
5. **API接口**: 提供配置管理的API接口

---

## 开发优先级

### MVP版本 (必需功能)
- [ ] 基础模式选择（纯文本/Readability）
- [ ] 全局移除/保留配置
- [ ] 基础Readability参数调整
- [ ] 配置保存/加载

### V1.0版本 (完整功能)
- [ ] 域名特定规则
- [ ] 预设模板系统
- [ ] 实时预览功能
- [ ] 配置导入/导出

### V1.1版本 (增强功能)
- [ ] 智能配置建议
- [ ] 批量操作功能
- [ ] 配置分享功能
- [ ] 高级调试工具
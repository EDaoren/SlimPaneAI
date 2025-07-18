/**
 * 网页内容提取配置
 */

// 提取配置
export const EXTRACTION_CONFIG = {
  // Readability 配置
  READABILITY_CHAR_THRESHOLD: 500,
  READABILITY_CHAR_THRESHOLD_LENIENT: 150,
  READABILITY_TOP_CANDIDATES: 5,
  READABILITY_TOP_CANDIDATES_LENIENT: 15,
  
  // 内容阈值
  MIN_CONTENT_LENGTH: 50,
  MAX_CHUNK_SIZE: 3000,
  
  // 超时配置
  SPA_WAIT_TIMEOUT: 5000,
  SPA_CONTENT_THRESHOLD: 1000,
} as const;

// 广告 & 弹窗等强噪声 —— 首轮就删
export const AD_NOISE = [
  '.ad', '.ads', '.advertisement', '.promo', '.promotion', '.sponsor',
  '.banner', '.popup', '.modal', '.overlay',
  '.social', '.share', '.sharing', '.follow', '.subscribe',
  '.social-media', '.social-buttons',
  '.loading', '.spinner', '.placeholder', '.skeleton',
  'iframe[src*="ads"]'
] as const;


// 导航 / 侧栏 / 页眉脚 —— 第二轮才删
export const LAYOUT_NOISE = [
  'nav', 'header', 'footer', '.navbar', '.nav', '.menu', '.navigation',
  '.header', '.footer', '.sidebar', '.aside',
  '.breadcrumb', '.tags-sidebar', '.category-sidebar'
] as const;

// 站点特定规则
export const SITE_RULES: Record<string, string[]> = {
  // 微博
  'weibo.com': [
    '.WB_footer', '.wb_feed_nav', '.WB_global_nav',
    '.layer_menu_list', '.WB_right_module'
  ],

  // 知乎
  'zhihu.com': [
    '.Post-SideActions', '.Recommended', '.Card-section',
    '.ContentItem-actions', '.RichContent-actions',
    '.Question-sideColumn', '.Card', '.Recommendations',
    '.VoteButton'
  ],

  // 百度贴吧
  'tieba.baidu.com': [
    '.left_section', '.right_section', '.nav_wrap',
    '.footer_wrap', '.aside_wrap'
  ],

  // CSDN
  'csdn.net': [
    '.tool-box', '.recommend-box', '.aside-box',
    '.comment-box', '.toolbar-advert',
    '.side-toolbar'
  ],

  // 简书
  'jianshu.com': [
    '.note-bottom', '.follow-detail', '.recommended-notes',
    '.side-tool', '.note-author'
  ],

  // 掘金
  'juejin.cn': [
    '.sidebar', '.recommended-area', '.author-info-block',
    '.article-suspended-panel', '.follow-button',
    '.recommend'
  ],

  // Stack Overflow
  'stackoverflow.com': [
    '.js-sidebar', '.s-sidebarwidget', '.module',
    '.bottom-notice', '.js-dismissable-hero',
    '.js-zone-container', '.question-stats', '.vote'
  ],

  // Reddit
  'reddit.com': [
    '.sidebar', '.side', '.promotedlink',
    '.footer-parent', '.premium-banner'
  ],

  // GitHub
  'github.com': [
    '.Header', '.footer', '.js-header-wrapper',
    '.BorderGrid-cell--secondary', '.Layout-sidebar'
  ],

  // SegmentFault
  'segmentfault.com': [
    '.widget-links', '.recommend', '.sidebar',
    '.article-widget'
  ]
} as const;

// 内容选择器（按优先级排序）
export const CONTENT_SELECTORS = [
  // 标准语义化选择器
  'main', 'article', '[role="main"]',
  
  // 通用内容选择器
  '.main-content', '.content', '.post-content',
  '.article-content', '.entry-content', '.post-body',
  '.article-body', '#content', '#main-content',
  
  // 论坛特有选择器
  '.topic-post', '.post-stream', '.cooked', '.topic-body',
  '.post', '.message', '.discussion', '.thread',
  '.forum-post',
  
  // Discourse 特有选择器
  '.topic-area', '.post-article', '.regular.contents',
  
  // 其他常见选择器
  '.summary', '.para', '.body-wrapper', '.content-wrapper'
] as const;

// 特殊页面检测
export const SPECIAL_PAGE_PATTERNS = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^about:/,
  /^file:\/\//,
  /\/settings$/,
  /\/preferences$/,
  /\/config$/
] as const;

// SPA 应用检测
export const SPA_INDICATORS = [
  'react', 'vue', 'angular', 'ember', 'backbone',
  'spa', 'single-page', 'app-root', 'ng-app'
] as const;

// 保护的CSS类名（不会被移除）
export const PROTECTED_CLASSES = [
  'highlight', 'code', 'pre', 'math', 'formula',
  'important', 'note', 'warning', 'tip'
] as const;

// 文本清理配置
export const TEXT_CLEANING = {
  // 保留的换行模式
  PRESERVE_PATTERNS: [
    /^\s*[-*+]\s/,           // 列表项
    /^\s*\d+\.\s/,           // 编号列表
    /^#+\s/,                 // 标题
    /^>\s/,                  // 引用
    /^```/,                  // 代码块
    /^    /,                 // 缩进代码
  ],
  
  // 需要合并的换行模式
  MERGE_PATTERNS: [
    /[^.!?。！？]\n[^A-Z\u4e00-\u9fff]/,  // 句子中间的换行
  ],
  
  // 清理规则
  REMOVE_PATTERNS: [
    /\n{3,}/g,               // 多余的空行
    /[ \t]{2,}/g,            // 多余的空格
    /^\s+|\s+$/gm,           // 行首行尾空格
  ]
} as const;

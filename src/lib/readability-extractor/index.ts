/**
 * 基于 Mozilla Readability + CSS 黑名单的内容提取器
 * 按照 readability_css_blacklist_guide.md 设计方案实现
 */

import { Readability, isProbablyReaderable } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline?: string;
  dir?: string;
  siteName?: string;
  lang?: string;
}

export interface ExtractionOptions {
  url?: string;
  host?: string;
  enableBlacklist?: boolean;
  customBlacklist?: string[];
}

/* ---------- 1. 黑名单规则 ---------- */

// 全局黑名单：通用的噪声元素
const GLOBAL_BLACKLIST = [
  // 广告相关
  '.ad', '.ads', '.advert', '.advertisement', '.adsense', '.ad-container',
  '.google-ads', '.banner-ad', '.sponsored', '.promo',
  
  // 导航和页面结构
  'nav', 'header', 'footer', 'aside',
  '.navigation', '.nav', '.navbar', '.menu', '.sidebar',
  '.breadcrumb', '.breadcrumbs',
  
  // 弹窗和模态框
  '.popup', '.modal', '.overlay', '.lightbox',
  '.subscribe-modal', '.newsletter-popup', '.cookie-notice',
  
  // 社交和分享
  '.social', '.social-share', '.share-buttons', '.social-media',
  '.follow-us', '.social-links',
  
  // 评论（可选，根据需要调整）
  '#comments', '.comments', '.comment-section', '.disqus',
  
  // 其他噪声
  '.related-posts', '.recommended', '.trending', '.most-read',
  '.pagination', '.tags', '.categories', '.author-bio',
  '.newsletter', '.subscription', '.signup'
];

// 站点特定规则：针对特定网站的黑名单
const SITE_RULES: Record<string, string[]> = {
  // 微博
  'weibo.com': [
    '.WB_footer', '.wb_feed_nav', '.WB_global_nav',
    '.layer_menu_list', '.WB_right_module'
  ],
  
  // 知乎
  'zhihu.com': [
    '.Post-SideActions', '.Recommended', '.Card-section',
    '.ContentItem-actions', '.RichContent-actions'
  ],
  
  // 百度贴吧
  'tieba.baidu.com': [
    '.left_section', '.right_section', '.nav_wrap',
    '.footer_wrap', '.aside_wrap'
  ],
  
  // CSDN
  'csdn.net': [
    '.tool-box', '.recommend-box', '.aside-box',
    '.comment-box', '.toolbar-advert'
  ],
  
  // 简书
  'jianshu.com': [
    '.note-bottom', '.follow-detail', '.recommended-notes',
    '.side-tool', '.note-author'
  ],
  
  // 掘金
  'juejin.cn': [
    '.sidebar', '.recommended-area', '.author-info-block',
    '.article-suspended-panel', '.follow-button'
  ],
  
  // Stack Overflow
  'stackoverflow.com': [
    '.js-sidebar', '.s-sidebarwidget', '.module',
    '.bottom-notice', '.js-dismissable-hero'
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
  ]
};

/* ---------- 2. 应用黑名单 ---------- */

/**
 * 应用 CSS 黑名单移除噪声元素
 */
function applyBlacklist(doc: Document, host?: string): void {
  if (!host) {
    try {
      host = new URL(doc.URL).hostname.replace(/^www\./, '');
    } catch {
      host = '';
    }
  }

  const selectors = [
    ...GLOBAL_BLACKLIST,
    ...(SITE_RULES[host] ?? [])
  ];

  if (!selectors.length) return;

  try {
    // 批量查询并移除元素
    const elementsToRemove = doc.querySelectorAll(selectors.join(','));
    elementsToRemove.forEach((el) => {
      try {
        el.remove();
      } catch (error) {
        console.warn('Failed to remove element:', error);
      }
    });
    
    console.log(`SlimPaneAI: Removed ${elementsToRemove.length} noise elements using blacklist`);
  } catch (error) {
    console.warn('SlimPaneAI: Failed to apply blacklist:', error);
  }
}

/* ---------- 3. 正文提取核心 ---------- */

/**
 * 使用 Mozilla Readability + CSS 黑名单提取网页正文
 */
export function extractCleanContent(
  doc: Document, 
  options: ExtractionOptions = {}
): ExtractedContent | null {
  const { enableBlacklist = true, customBlacklist = [] } = options;

  try {
    // 创建文档副本以避免修改原始 DOM
    const clonedDoc = doc.cloneNode(true) as Document;

    // ① 应用黑名单移除噪声元素
    if (enableBlacklist) {
      applyBlacklist(clonedDoc, options.host);
      
      // 应用自定义黑名单
      if (customBlacklist.length > 0) {
        try {
          const customElements = clonedDoc.querySelectorAll(customBlacklist.join(','));
          customElements.forEach(el => el.remove());
          console.log(`SlimPaneAI: Removed ${customElements.length} elements using custom blacklist`);
        } catch (error) {
          console.warn('SlimPaneAI: Failed to apply custom blacklist:', error);
        }
      }
    }

    // ② 检查页面是否适合 Readability 处理
    if (!isProbablyReaderable(clonedDoc)) {
      console.warn('SlimPaneAI: Page is not probably readerable');
      return null;
    }

    // ③ 使用 Readability 提取内容
    const reader = new Readability(clonedDoc, {
      debug: false,
      maxElemsToParse: 0, // 不限制元素数量
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['highlight', 'code', 'pre'] // 保留重要的类名
    });

    const article = reader.parse();

    if (!article) {
      console.warn('SlimPaneAI: Readability failed to parse article');
      return null;
    }

    // ④ 返回提取的内容
    return {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent || '',
      length: article.length || 0,
      excerpt: article.excerpt || '',
      byline: article.byline || undefined,
      dir: article.dir || undefined,
      siteName: article.siteName || undefined,
      lang: article.lang || undefined
    };

  } catch (error) {
    console.error('SlimPaneAI: Content extraction failed:', error);
    return null;
  }
}

/**
 * 检查页面是否可能包含可读内容
 */
export function isPageReaderable(doc: Document): boolean {
  try {
    return isProbablyReaderable(doc);
  } catch (error) {
    console.warn('SlimPaneAI: Failed to check if page is readerable:', error);
    return false;
  }
}

/**
 * 获取站点特定的黑名单规则
 */
export function getSiteBlacklist(host: string): string[] {
  const normalizedHost = host.replace(/^www\./, '');
  return SITE_RULES[normalizedHost] || [];
}

/**
 * 添加站点特定的黑名单规则
 */
export function addSiteRule(host: string, selectors: string[]): void {
  const normalizedHost = host.replace(/^www\./, '');
  if (!SITE_RULES[normalizedHost]) {
    SITE_RULES[normalizedHost] = [];
  }
  SITE_RULES[normalizedHost].push(...selectors);
}

/**
 * 获取全局黑名单
 */
export function getGlobalBlacklist(): string[] {
  return [...GLOBAL_BLACKLIST];
}

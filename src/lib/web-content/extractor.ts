/**
 * 网页内容提取器
 * 基于 Mozilla Readability + CSS 黑名单的清洁实现
 */

import {
  AD_NOISE,
  LAYOUT_NOISE,
  SITE_RULES,
  EXTRACTION_CONFIG,
  SPECIAL_PAGE_PATTERNS,
  SPA_INDICATORS
} from './config';
import type { ExtractedContent, ExtractionOptions, ExtractionResult } from './types';

// 动态导入 Readability（在浏览器环境中可能不可用）
let Readability: any = null;
let isProbablyReaderable: any = null;

// 尝试加载 Readability
async function loadReadability() {
  try {
    // 检查是否已经在全局作用域中
    if (typeof window !== 'undefined' && (window as any).Readability) {
      Readability = (window as any).Readability;
      isProbablyReaderable = (window as any).isProbablyReaderable;
      return true;
    }

    // 尝试动态导入
    const readabilityModule = await import('@mozilla/readability');
    Readability = readabilityModule.Readability;
    isProbablyReaderable = readabilityModule.isProbablyReaderable;
    return true;
  } catch (error) {
    return false;
  }
}

export class WebContentExtractor {
  /**
   * 提取当前页面内容
   */
  static async extractCurrentPage(options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 检查特殊页面
      if (this.isSpecialPage()) {
        return {
          success: false,
          content: null,
          error: '特殊页面不支持内容提取'
        };
      }

      // 等待 SPA 内容加载
      if (this.isSPAApplication()) {
        await this.waitForSPAContent();
      }

      // 尝试使用 Readability 提取
      const readabilityResult = await this.extractWithReadability(options);
      if (readabilityResult) {
        return {
          success: true,
          content: readabilityResult,
          method: 'readability'
        };
      }

      // 降级到简单提取
      if (options.enableFallback !== false) {
        const fallbackResult = this.extractWithFallback(options);
        if (fallbackResult) {
          return {
            success: true,
            content: fallbackResult,
            method: 'fallback'
          };
        }
      }

      return {
        success: false,
        content: null,
        error: '内容提取失败'
      };

    } catch (error) {
      console.error('SlimPaneAI: Content extraction error:', error);
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 使用 Mozilla Readability 提取内容
   */
  private static async extractWithReadability(options: ExtractionOptions): Promise<ExtractedContent | null> {
    try {
      // 尝试加载 Readability
      const readabilityLoaded = await loadReadability();
      if (!readabilityLoaded || !Readability || !isProbablyReaderable) {
        console.warn('SlimPaneAI: Readability not available, falling back to simple extraction');
        return null;
      }

      // 创建文档副本
      const clonedDoc = document.cloneNode(true) as Document;

      this.applyBlacklist(clonedDoc, options, false);

      // 尝试标准配置
      let article = this.tryReadabilityExtraction(clonedDoc, false);

      if (this.isTooShort(article)) article = null;

      // 如果失败，尝试宽松配置
      if (!article) {
        const clonedDoc2 = document.cloneNode(true) as Document;
        this.applyBlacklist(clonedDoc2, options, true);
        article = this.tryReadabilityExtraction(clonedDoc2, true);
      }

      if (!article) {
        return null;
      }

      // console.log(`SlimPaneAI: Readability extraction successful - Title: "${article.title}", Length: ${article.textContent.length}`);
      console.log(`SlimPaneAI: Readability extraction successful - content："`, article);

      return {
        title: article.title || '',
        content: article.content || '',
        textContent: article.textContent || '',
        length: article.length || 0,
        excerpt: article.excerpt || '',
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName,
        lang: article.lang
      };

    } catch (error) {
      console.error('SlimPaneAI: Readability extraction failed:', error);
      return null;
    }
  }

  /**
   * 尝试 Readability 提取
   */
  private static tryReadabilityExtraction(doc: Document, lenient: boolean) {
    if (!Readability) {
      console.warn('SlimPaneAI: Readability not available');
      return null;
    }

    try {
      const config = this.createReadabilityConfig(lenient);
      const reader = new Readability(doc, config);
      return reader.parse();
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建Readability配置
   */
  private static createReadabilityConfig(lenient: boolean) {
    const baseConfig = {
      debug: false,
      maxElemsToParse: 0,
      keepClasses: true,
    };

    const codeClasses = [
      /^language-/,
      /^highlight/,
      /^prism-/,
    ];

    if (lenient) {
      return {
        ...baseConfig,
        nbTopCandidates: EXTRACTION_CONFIG.READABILITY_TOP_CANDIDATES_LENIENT,
        charThreshold: EXTRACTION_CONFIG.READABILITY_CHAR_THRESHOLD_LENIENT,
        classesToPreserve: [
          ...codeClasses,
          /^lazy-/, /^wp-/, /^zoomable/, /^gallery/, /^figure/, /^video-/,
          /^comment/, /^reply/, /^post-body/, /^user/,
          /^author/,
          /^poster/,
          /^username/,
          /^nickname/,
          /^full-name/
        ]
      };
    }

    return {
      ...baseConfig,
      nbTopCandidates: EXTRACTION_CONFIG.READABILITY_TOP_CANDIDATES,
      charThreshold: EXTRACTION_CONFIG.READABILITY_CHAR_THRESHOLD,
      classesToPreserve: codeClasses
    };
  }

  /**
   * 应用 CSS 黑名单
   */
  private static applyBlacklist(doc: Document, options: ExtractionOptions, aggressive = false ): void {
    const host = options.host || this.getHostFromDoc(doc);
    
    const selectors = [
      ...AD_NOISE,                               // 首轮必删
      ...(aggressive ? LAYOUT_NOISE : []),       // 失败时再删
      ...(SITE_RULES[host] || []),
      ...(options.customBlacklist || [])
    ];

    if (selectors.length === 0) return;

    try {
      const elementsToRemove = doc.querySelectorAll(selectors.join(','));
      elementsToRemove.forEach(el => {
        try {
          el.remove();
        } catch (error) {
          // 忽略移除失败的元素
        }
      });
    } catch (error) {
      // 静默处理黑名单应用失败
    }
  }

  /**
   * 降级提取方法
   */
  private static extractWithFallback(options: ExtractionOptions): ExtractedContent | null {
    try {
      const title = document.title || this.extractTitleFromContent();
      const textContent = this.extractTextContent();
      
      if (!textContent || textContent.length < (options.minContentLength || EXTRACTION_CONFIG.MIN_CONTENT_LENGTH)) {
        return null;
      }

      return {
        title,
        content: '', // 降级方法不提供 HTML
        textContent,
        length: textContent.length,
        excerpt: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''),
        siteName: this.extractSiteName(),
        lang: this.detectLanguage()
      };
    } catch (error) {
      console.error('SlimPaneAI: Fallback extraction failed:', error);
      return null;
    }
  }

  /**
   * 检查是否为特殊页面
   */
  private static isSpecialPage(): boolean {
    const url = window.location.href;
    return SPECIAL_PAGE_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * 检查是否为 SPA 应用
   */
  private static isSPAApplication(): boolean {
    const bodyClasses = document.body.className.toLowerCase();
    const htmlClasses = document.documentElement.className.toLowerCase();
    const allClasses = bodyClasses + ' ' + htmlClasses;

    // 检查通用SPA指示器
    const hasGeneralSPA = SPA_INDICATORS.some(indicator => allClasses.includes(indicator));

    // 检查Discourse特有标识
    const isDiscourse = this.isDiscourseApplication();

    // 检查其他常见SPA框架
    const hasFrameworkIndicators = this.hasFrameworkIndicators();

    return hasGeneralSPA || isDiscourse || hasFrameworkIndicators;
  }

  /**
   * 检查是否为Discourse应用
   */
  private static isDiscourseApplication(): boolean {
    const bodyClasses = document.body.className.toLowerCase();
    const htmlClasses = document.documentElement.className.toLowerCase();

    // Discourse特有的类名和元素
    const hasDiscourseClass = bodyClasses.includes('discourse') || htmlClasses.includes('discourse');
    const hasEmberApp = document.querySelector('.ember-application, #main-outlet');
    const hasDiscourseElements = document.querySelector('.topic-list, .topic-post, .post-stream');
    const hasDiscourseMetaTag = document.querySelector('meta[name="generator"][content*="Discourse"]');

    return !!(hasDiscourseClass || hasEmberApp || hasDiscourseElements || hasDiscourseMetaTag);
  }

  /**
   * 检查是否有其他框架指示器
   */
  private static hasFrameworkIndicators(): boolean {
    // 检查常见的SPA框架标识
    const frameworkSelectors = [
      '[ng-app]', '[data-ng-app]', // Angular
      '[data-reactroot]', '#root', '#app', // React
      '[data-server-rendered]', // Vue.js
      '.ember-application', // Ember.js
      '[data-turbo-root]', // Turbo (Rails)
    ];

    return frameworkSelectors.some(selector => document.querySelector(selector));
  }

  /**
   * 等待 SPA 内容加载
   */
  private static async waitForSPAContent(): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const isDiscourse = this.isDiscourseApplication();

      // 根据应用类型调整参数
      const timeout = isDiscourse ? 8000 : EXTRACTION_CONFIG.SPA_WAIT_TIMEOUT;
      const threshold = isDiscourse ? 500 : EXTRACTION_CONFIG.SPA_CONTENT_THRESHOLD;

      let observer: MutationObserver | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let intervalId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };

      const checkContent = () => {
        const currentLength = document.body.textContent?.length || 0;
        const elapsed = Date.now() - startTime;

        if (currentLength > threshold) {
          cleanup();
          resolve(true);
          return true;
        }

        if (elapsed > timeout) {
          cleanup();
          resolve(false);
          return true;
        }

        return false;
      };

      // 立即检查一次
      if (checkContent()) return;

      // 设置MutationObserver监听DOM变化
      try {
        const targetElement = isDiscourse ?
          (document.querySelector('#main-outlet, .ember-application') || document.body) :
          (document.querySelector('main, [role="main"], .content, .main-content') || document.body);

        observer = new MutationObserver((mutations) => {
          let hasSignificantChange = false;

          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              const addedNodes = Array.from(mutation.addedNodes);
              hasSignificantChange = addedNodes.some(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (isDiscourse) {
                    // Discourse特有的内容检查
                    return element.matches('.topic-post, .post-stream, .cooked, .topic-body, .topic-list') ||
                           element.querySelector('.topic-post, .post-stream, .cooked, .topic-body, .topic-list');
                  } else {
                    // 通用内容检查
                    return element.matches('article, .content, .main-content, p, div') ||
                           element.querySelector('article, .content, .main-content, p');
                  }
                }
                return false;
              });
            }
          });

          if (hasSignificantChange) {
            // 延迟检查，让内容完全渲染
            setTimeout(() => {
              checkContent();
            }, 200);
          }
        });

        observer.observe(targetElement, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
      } catch (error) {
        // 静默处理MutationObserver设置失败
      }

      // 设置超时兜底
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);

      // 定期检查作为备用机制
      intervalId = setInterval(() => {
        if (checkContent()) {
          clearInterval(intervalId!);
          intervalId = null;
        }
      }, 300);
    });
  }

  /**
   * 辅助方法
   */
  private static getHostFromDoc(doc: Document): string {
    try {
      return new URL(doc.URL).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  private static extractTitleFromContent(): string {
    const h1 = document.querySelector('h1');
    if (h1?.textContent) return h1.textContent.trim();
    
    const firstHeading = document.querySelector('h2, h3');
    if (firstHeading?.textContent) return firstHeading.textContent.trim();
    
    return 'Untitled Page';
  }

  private static extractTextContent(): string {
    // 简单的文本提取逻辑
    const body = document.body;
    if (!body) return '';
    
    // 移除脚本和样式
    const clone = body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
    
    return clone.textContent || '';
  }

  private static extractSiteName(): string {
    const metaSiteName = document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement;
    if (metaSiteName?.content) return metaSiteName.content;
    
    return window.location.hostname;
  }

  private static detectLanguage(): string {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang;
    
    const metaLang = document.querySelector('meta[http-equiv="content-language"]') as HTMLMetaElement;
    if (metaLang?.content) return metaLang.content;
    
    // 简单的中文检测
    const text = document.body.textContent || '';
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    return chineseChars && chineseChars.length > text.length * 0.3 ? 'zh' : 'en';
  }

  private static isTooShort(article: any): boolean {
    if (!article || !article.textContent) return true;
    const bodyLen = document.body?.innerText?.length || 0;
    return bodyLen > 0 && article.textContent.length / bodyLen < 0.2;
  }
}

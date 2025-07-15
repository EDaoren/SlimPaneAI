import type { PageContent, ContentExtractionSettings } from '@/types';

/**
 * 智能内容提取器
 * 负责从网页中提取有用的文本内容，过滤掉导航、广告等无关元素
 */
export class ContentExtractor {
  private settings: ContentExtractionSettings;

  constructor(settings: ContentExtractionSettings) {
    this.settings = settings;
  }

  /**
   * 从当前页面提取内容
   */
  async extractFromCurrentPage(): Promise<PageContent> {
    const url = window.location.href;
    const title = document.title;
    const domain = window.location.hostname;

    // 检查是否是PDF文件
    if (this.isPDFUrl(url)) {
      return this.extractFromPDF(url);
    }

    // 提取网页内容
    const content = this.extractWebPageContent();
    const tokenCount = this.estimateTokenCount(content);

    return {
      url,
      title,
      domain,
      content,
      extractedAt: Date.now(),
      contentType: 'webpage',
      tokenCount,
      metadata: this.extractMetadata()
    };
  }

  /**
   * 提取网页文本内容
   */
  private extractWebPageContent(): string {
    // 首先尝试提取主要内容区域
    const mainContent = this.extractMainContent();
    if (mainContent) {
      return mainContent;
    }

    // 如果没有找到主要内容，则提取整个body
    return this.extractBodyContent();
  }

  /**
   * 提取主要内容区域
   */
  private extractMainContent(): string | null {
    // 常见的主要内容选择器
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      'article',
      '.container .content',
      '#content',
      '#main-content'
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.extractTextFromElement(element as HTMLElement);
      }
    }

    return null;
  }

  /**
   * 提取body内容
   */
  private extractBodyContent(): string {
    const body = document.body;
    if (!body) return '';

    // 克隆body以避免修改原始DOM
    const clonedBody = body.cloneNode(true) as HTMLElement;

    // 移除不需要的元素
    this.removeUnwantedElements(clonedBody);

    return this.extractTextFromElement(clonedBody);
  }

  /**
   * 移除不需要的元素
   */
  private removeUnwantedElements(element: HTMLElement): void {
    // 默认要移除的选择器
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.navigation',
      '.nav',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ads',
      '.ad',
      '.popup',
      '.modal',
      '.cookie-notice',
      '.social-share',
      '.comments',
      '.comment',
      '.related-posts',
      '.breadcrumb',
      '.pagination',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      '[role="complementary"]',
      ...this.settings.excludeSelectors
    ];

    // 移除不需要的元素
    unwantedSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // 如果指定了包含选择器，只保留这些元素
    if (this.settings.includeSelectors.length > 0) {
      const includedElements: HTMLElement[] = [];
      this.settings.includeSelectors.forEach(selector => {
        const elements = element.querySelectorAll(selector);
        elements.forEach(el => includedElements.push(el as HTMLElement));
      });

      if (includedElements.length > 0) {
        // 创建新的容器，只包含指定的元素
        const newContainer = document.createElement('div');
        includedElements.forEach(el => {
          newContainer.appendChild(el.cloneNode(true));
        });
        element.innerHTML = newContainer.innerHTML;
      }
    }
  }

  /**
   * 从元素中提取文本
   */
  private extractTextFromElement(element: HTMLElement): string {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // 跳过隐藏元素
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: string[] = [];
    let node;

    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        textNodes.push(text);
      }
    }

    return textNodes.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * 提取页面元数据
   */
  private extractMetadata() {
    const metadata: any = {};

    // 提取作者
    const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
    if (authorMeta) {
      metadata.author = authorMeta.content;
    }

    // 提取描述
    const descriptionMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (descriptionMeta) {
      metadata.description = descriptionMeta.content;
    }

    // 提取关键词
    const keywordsMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (keywordsMeta) {
      metadata.keywords = keywordsMeta.content.split(',').map(k => k.trim());
    }

    // 提取发布日期
    const publishDateMeta = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
    if (publishDateMeta) {
      metadata.publishDate = publishDateMeta.content;
    }

    return metadata;
  }

  /**
   * 检查是否是PDF URL
   */
  private isPDFUrl(url: string): boolean {
    return url.toLowerCase().includes('.pdf') || 
           url.includes('application/pdf') ||
           document.contentType === 'application/pdf';
  }

  /**
   * 从PDF提取内容
   */
  private async extractFromPDF(url: string): Promise<PageContent> {
    // PDF提取将在PDF处理器中实现
    return {
      url,
      title: this.extractPDFTitle(url),
      domain: window.location.hostname,
      content: 'PDF content extraction in progress...',
      extractedAt: Date.now(),
      contentType: 'pdf',
      tokenCount: 0
    };
  }

  /**
   * 从PDF URL提取标题
   */
  private extractPDFTitle(url: string): string {
    const filename = url.split('/').pop() || '';
    return filename.replace('.pdf', '').replace(/[-_]/g, ' ');
  }

  /**
   * 估算Token数量
   */
  private estimateTokenCount(text: string): number {
    // 简单的Token估算：大约4个字符 = 1个Token
    return Math.ceil(text.length / 4);
  }

  /**
   * 检查内容是否超过Token限制
   */
  isContentTooLarge(content: string): boolean {
    const tokenCount = this.estimateTokenCount(content);
    return tokenCount > this.settings.maxTokens;
  }

  /**
   * 截断内容到指定Token数量
   */
  truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }

    // 在句子边界截断
    const truncated = content.substring(0, maxChars);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？')
    );

    if (lastSentenceEnd > maxChars * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
  }
}

/**
 * 获取默认的内容提取设置
 */
export function getDefaultExtractionSettings(): ContentExtractionSettings {
  return {
    enabled: true,
    autoExtract: false,
    includeImages: false,
    includeLinks: true,
    maxTokens: 8000,
    excludeSelectors: [],
    includeSelectors: []
  };
}

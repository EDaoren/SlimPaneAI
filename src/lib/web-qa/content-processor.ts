/**
 * 专业的网页内容处理器
 * 基于 Readability 思想的自定义算法进行内容提取和预处理
 * 针对不同类型网站（论坛、博客、新闻等）进行了优化
 */

export interface ContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote';
  content: string;
  level?: number; // 用于标题级别
  position: number; // 在文档中的位置
}

export interface ProcessedContent {
  metadata: {
    url: string;
    title: string;
    author?: string;
    publishedTime?: string;
    capturedAt: string;
    language: string;
    wordCount: number;
  };
  blocks: ContentBlock[];
  summary?: string;
  rawText: string;
}

export class ContentProcessor {
  /**
   * 处理当前页面内容
   */
  static processCurrentPage(): ProcessedContent {
    const metadata = this.extractMetadata();
    const cleanedContent = this.extractAndCleanContent();
    const blocks = this.segmentIntoBlocks(cleanedContent);
    const rawText = blocks.map(b => b.content).join('\n\n');

    return {
      metadata,
      blocks,
      rawText,
    };
  }

  /**
   * 提取页面元数据
   */
  private static extractMetadata() {
    const url = window.location.href;
    const title = document.title || this.extractTitleFromContent();
    const author = this.extractAuthor();
    const publishedTime = this.extractPublishedTime();
    const language = this.detectLanguage();
    
    return {
      url,
      title,
      author,
      publishedTime,
      capturedAt: new Date().toISOString(),
      language,
      wordCount: 0, // 将在后面计算
    };
  }

  /**
   * 提取和清理主要内容
   */
  private static extractAndCleanContent(): string {
    // 尝试使用智能内容提取算法
    const readabilityContent = this.trySmartExtraction();
    if (readabilityContent) {
      return readabilityContent;
    }

    // 回退到基础提取算法
    return this.customContentExtraction();
  }

  /**
   * 尝试使用智能内容提取算法
   */
  private static trySmartExtraction(): string | null {
    try {
      // 创建文档副本以避免修改原始DOM
      const documentClone = document.cloneNode(true) as Document;

      // 基于 Readability 思想的智能提取算法
      const article = this.smartContentExtraction(documentClone);
      return article ? this.htmlToText(article.innerHTML) : null;
    } catch (error) {
      console.warn('Smart content extraction failed:', error);
      return null;
    }
  }

  /**
   * 基于 Readability 思想的智能内容提取算法
   */
  private static smartContentExtraction(doc: Document): Element | null {
    // 移除噪声元素
    const noisySelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.ad', '.sidebar', '.menu',
      '.navigation', '.social', '.share', '.comment', '.popup',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];

    noisySelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // 寻找主要内容容器
    const contentSelectors = [
      'main', 'article', '[role="main"]',
      '.main-content', '.content', '.post-content',
      '.article-content', '.entry-content', '#content',
      '#main-content', '.post-body', '.article-body'
    ];

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element && this.isContentRich(element)) {
        return element;
      }
    }

    // 如果没找到，使用body但进一步清理
    const body = doc.body;
    if (body) {
      this.removeRemainingNoise(body);
      return body;
    }

    return null;
  }

  /**
   * 判断元素是否内容丰富
   */
  private static isContentRich(element: Element): boolean {
    const text = element.textContent || '';
    const wordCount = text.split(/\s+/).length;
    const linkDensity = this.calculateLinkDensity(element);
    
    return wordCount > 100 && linkDensity < 0.3;
  }

  /**
   * 计算链接密度
   */
  private static calculateLinkDensity(element: Element): number {
    const totalText = (element.textContent || '').length;
    const linkText = Array.from(element.querySelectorAll('a'))
      .reduce((sum, link) => sum + (link.textContent || '').length, 0);
    
    return totalText > 0 ? linkText / totalText : 0;
  }

  /**
   * 移除剩余噪声
   */
  private static removeRemainingNoise(element: Element): void {
    // 移除小的文本块
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      const text = el.textContent || '';
      if (text.length < 20 && !['img', 'video', 'audio'].includes(el.tagName.toLowerCase())) {
        const parent = el.parentElement;
        if (parent && parent.children.length > 1) {
          el.remove();
        }
      }
    });
  }

  /**
   * HTML转文本
   */
  private static htmlToText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;

    // 处理特殊元素
    const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      h.textContent = '\n\n## ' + h.textContent + '\n\n';
    });

    const lists = div.querySelectorAll('li');
    lists.forEach(li => {
      li.textContent = '• ' + li.textContent + '\n';
    });

    const paragraphs = div.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.textContent = p.textContent + '\n\n';
    });

    return div.textContent || '';
  }

  /**
   * 自定义内容提取（回退方案）
   */
  private static customContentExtraction(): string {
    const body = document.body;
    if (!body) return '';

    const clone = body.cloneNode(true) as HTMLElement;
    
    // 移除噪声元素
    const noisySelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.ad', '.sidebar', '.menu'
    ];

    noisySelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return this.htmlToText(clone.innerHTML);
  }

  /**
   * 将内容分割成语义块
   */
  private static segmentIntoBlocks(content: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let position = 0;
    let blockId = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let type: ContentBlock['type'] = 'paragraph';
      let level: number | undefined;

      // 检测标题
      if (trimmed.startsWith('## ')) {
        type = 'heading';
        level = 2;
      } else if (trimmed.startsWith('# ')) {
        type = 'heading';
        level = 1;
      } else if (trimmed.startsWith('• ')) {
        type = 'list';
      } else if (trimmed.startsWith('```') || trimmed.includes('function') || trimmed.includes('class ')) {
        type = 'code';
      } else if (trimmed.startsWith('>')) {
        type = 'quote';
      }

      blocks.push({
        id: `block-${blockId++}`,
        type,
        content: trimmed,
        level,
        position: position++
      });
    }

    return blocks;
  }

  /**
   * 提取作者信息
   */
  private static extractAuthor(): string | undefined {
    const selectors = [
      '[name="author"]',
      '[property="article:author"]',
      '.author',
      '.byline',
      '.post-author'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content && content.trim()) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * 提取发布时间
   */
  private static extractPublishedTime(): string | undefined {
    const selectors = [
      '[name="publish_date"]',
      '[property="article:published_time"]',
      'time[datetime]',
      '.publish-date',
      '.post-date'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const datetime = element.getAttribute('datetime') || 
                        element.getAttribute('content') || 
                        element.textContent;
        if (datetime && datetime.trim()) {
          return datetime.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * 检测语言
   */
  private static detectLanguage(): string {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang;

    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
      const content = metaLang.getAttribute('content');
      if (content) return content;
    }

    // 简单的语言检测
    const text = document.body?.textContent || '';
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;
    
    if (chineseChars / totalChars > 0.1) {
      return 'zh';
    }

    return 'en';
  }

  /**
   * 从内容中提取标题（回退方案）
   */
  private static extractTitleFromContent(): string {
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent) {
      return h1.textContent.trim();
    }

    const firstHeading = document.querySelector('h2, h3');
    if (firstHeading && firstHeading.textContent) {
      return firstHeading.textContent.trim();
    }

    return 'Untitled Page';
  }
}

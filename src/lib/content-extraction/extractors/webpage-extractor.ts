/**
 * 网页内容提取器
 * 包装现有的 web-content 模块，提供统一接口
 */

import { BaseExtractor } from './base-extractor';
import { extractAndProcessCurrentPage } from '../../web-content';
import type { ProcessedContent } from '../../web-content/types';
import type { 
  ContentType, 
  ExtractionOptions, 
  ExtractionResult,
  StandardizedContent,
  ExtractionMetadata
} from '../types';

export class WebPageExtractor extends BaseExtractor {
  readonly type: ContentType = 'webpage';

  /**
   * 检查是否可以处理该URL
   */
  canHandle(url: string, contentType?: string): boolean {
    if (!url) return false;

    // 如果明确指定了HTML内容类型
    if (contentType && contentType.includes('text/html')) {
      return true;
    }

    // 排除特殊文档类型
    if (this.isSpecialDocument(url, contentType)) {
      return false;
    }

    // 排除特殊页面
    if (this.isSpecialPage(url)) {
      return false;
    }

    // 默认情况下，其他URL都当作网页处理
    return true;
  }

  /**
   * 提取网页内容
   */
  async extract(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 调用现有的 web-content 模块
      const result = await extractAndProcessCurrentPage({
        enableBlacklist: options.enableBlacklist ?? true,
        customBlacklist: options.customBlacklist,
        enableFallback: options.enableFallback ?? true,
        minContentLength: options.minContentLength ?? 50
      });

      if (!result.success || !result.content) {
        return {
          success: false,
          content: null,
          error: result.error || '网页内容提取失败',
          metadata: this.buildExtractionMetadata('failed', startTime)
        };
      }

      // 转换为标准格式
      const standardizedContent = this.convertToStandardFormat(result.content);
      
      // 检查内容长度
      if (options.minContentLength && standardizedContent.rawText.length < options.minContentLength) {
        return {
          success: false,
          content: null,
          error: `内容长度不足，最少需要 ${options.minContentLength} 个字符`,
          metadata: this.buildExtractionMetadata('insufficient_content', startTime)
        };
      }

      return {
        success: true,
        content: standardizedContent,
        metadata: this.buildExtractionMetadata(result.method || 'readability', startTime, standardizedContent)
      };

    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : '网页内容提取过程中发生未知错误',
        metadata: this.buildExtractionMetadata('error', startTime)
      };
    }
  }

  /**
   * 将 ProcessedContent 转换为 StandardizedContent
   */
  private convertToStandardFormat(processed: ProcessedContent): StandardizedContent {
    return {
      url: processed.metadata.url,
      title: processed.metadata.title,
      rawText: this.cleanText(processed.rawText),
      blocks: processed.blocks.map(block => ({
        id: block.id,
        type: block.type as any, // 类型兼容性处理
        content: this.cleanText(block.content),
        level: block.level,
        position: block.position
      })),
      metadata: {
        ...processed.metadata,
        description: processed.excerpt
      },
      excerpt: this.generateExcerpt(processed.rawText),
      contentType: 'webpage',
      tokenCount: this.estimateTokenCount(processed.rawText)
    };
  }

  /**
   * 检查是否为特殊文档类型
   */
  private isSpecialDocument(url: string, contentType?: string): boolean {
    const urlLower = url.toLowerCase();
    
    // PDF文档
    if (urlLower.includes('.pdf') || contentType === 'application/pdf') {
      return true;
    }

    // Word文档
    if (urlLower.includes('.doc') || urlLower.includes('.docx') || 
        contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
        contentType?.includes('application/msword')) {
      return true;
    }

    // PowerPoint文档
    if (urlLower.includes('.ppt') || urlLower.includes('.pptx') ||
        contentType?.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation') ||
        contentType?.includes('application/vnd.ms-powerpoint')) {
      return true;
    }

    // Excel文档
    if (urlLower.includes('.xls') || urlLower.includes('.xlsx') ||
        contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType?.includes('application/vnd.ms-excel')) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为特殊页面（不支持内容提取）
   */
  private isSpecialPage(url: string): boolean {
    if (!url) return true;

    // 浏览器内部页面
    const browserProtocols = [
      'chrome://',
      'chrome-extension://',
      'edge://',
      'edge-extension://',
      'moz://',
      'moz-extension://',
      'about:',
      'view-source:',
      'file://',
      'devtools://',
      'data:',
    ];

    if (browserProtocols.some((protocol) => url.startsWith(protocol))) {
      return true;
    }

    // 特殊页面关键词
    const specialPages = [
      'newtab',
      'extensions',
      'settings',
      'history',
      'downloads',
      'bookmarks',
      'flags',
      'version',
      'blank',
      'home',
      'config',
    ];

    const urlLower = url.toLowerCase();
    return specialPages.some(
      (page) =>
        urlLower.includes(`/${page}`) ||
        urlLower.includes(`/${page}.html`) ||
        urlLower.includes(`about:${page}`)
    );
  }

  /**
   * 构建提取元数据
   */
  private buildExtractionMetadata(
    method: string, 
    startTime: number, 
    content?: StandardizedContent
  ): ExtractionMetadata {
    const extractionTime = Date.now() - startTime;
    
    return {
      extractionMethod: method,
      extractionTime,
      contentLength: content?.rawText.length || 0,
      blocksCount: content?.blocks.length || 0,
      processingSteps: [
        'DOM analysis',
        'Content extraction',
        'Text cleaning',
        'Block segmentation',
        'Metadata generation'
      ]
    };
  }
}

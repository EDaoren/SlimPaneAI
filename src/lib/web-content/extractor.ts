/**
 * 网页内容提取器 - 基于配置驱动的新实现
 * 完全替换旧的硬编码逻辑
 */

import {
  EXTRACTION_CONFIG,
  SPECIAL_PAGE_PATTERNS,
  SPA_INDICATORS
} from './config';
import type { ExtractedContent, ExtractionOptions, ExtractionResult } from './types';
import { WebContentConfigManager } from '@/lib/web-content-config';
import type {
  MergedExtractionConfig,
  WebChatMetadataConfig,
  WebChatMetadataSelectors,
  WebChatMetadataField
} from '@/types/web-content-config';

// 类型定义
type ReadabilityClass = typeof import('@mozilla/readability').Readability;

export class WebContentExtractor {
  // 缓存Readability类，避免重复加载和全局污染
  private static readabilityClass: ReadabilityClass | null = null;
  
  /**
   * 提取当前页面内容 - 基于配置驱动
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

      // 获取配置
      const domain = this.extractDomain(options.url || window.location.href);
      const config = await WebContentConfigManager.getInstance().getMergedConfig(domain);

      // 根据配置模式选择提取方法
      if (config.mode === 'text') {
        const textResult = this.extractWithTextMode(config);
        if (textResult) {
          return {
            success: true,
            content: textResult,
            method: 'text'
          };
        }
      } else {
        // Readability 智能提取模式
        const readabilityResult = await this.extractWithReadabilityMode(config);
        if (readabilityResult) {
          return {
            success: true,
            content: readabilityResult,
            method: 'readability'
          };
        }
      }

      return {
        success: false,
        content: null,
        error: '内容提取失败'
      };

    } catch (error) {
      console.error('SlimPaneAI: Content extraction failed:', error);
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 纯文本提取模式 - 基于配置
   */
  private static extractWithTextMode(config: MergedExtractionConfig): ExtractedContent | null {
    try {
      const clone = document.body.cloneNode(true) as HTMLElement;

      // 移除基础元素
      this.removeBasicElements(clone);

      // 应用配置的移除规则
      this.applyConfiguredRemoveRules(clone, config.remove);

      const textContent = clone.textContent || '';

      // 检查内容长度
      if (textContent.length < config.readabilityOptions.charThreshold) {
        return null;
      }

      // 安全检查：确保所有字段都有有效值
      const safeTextContent = textContent || '';
      const safeContent = clone.innerHTML || '';

      const result = {
        title: document.title || '',
        content: safeContent,
        textContent: safeTextContent,
        length: safeTextContent.length,
        excerpt: this.generateExcerpt(safeTextContent),
        siteName: this.extractSiteName(),
        lang: this.detectLanguage()
      };

      return result;
    } catch (error) {
      console.error('SlimPaneAI: Text mode extraction failed:', error);
      return null;
    }
  }

  /**
   * Readability智能提取模式 - 基于配置
   */
  private static async extractWithReadabilityMode(config: MergedExtractionConfig): Promise<ExtractedContent | null> {
    try {
      // 第一步：提取元信息（在移除元素之前，避免丢失）
      let extractedMetadata = '';
      if (config.metadata?.enabled) {
        extractedMetadata = this.extractMetadata(document, config.metadata);
      }

      // 第二步：尝试加载 Readability
      const ReadabilityClass = await this.loadReadability();
      if (!ReadabilityClass) {
        console.warn('SlimPaneAI: Readability library unavailable, falling back to text mode');
        return this.extractWithTextMode(config);
      }

      const clonedDoc = document.cloneNode(true) as Document;
      // 移除基础元素
      this.removeBasicElements(clonedDoc.body as HTMLElement);

      // 应用配置的移除规则
      this.applyConfiguredRemoveRules(clonedDoc.body as HTMLElement, config.remove);

      // 使用简化的Readability参数 v2.0（移除classesToPreserve）
      const readabilityConfig = {
        debug: false,
        maxElemsToParse: 0,
        keepClasses: config.readabilityOptions.keepClasses,
        charThreshold: config.readabilityOptions.charThreshold,
        maxElemsToDivide: config.readabilityOptions.maxElemsToDivide
      };

      const reader = new ReadabilityClass(clonedDoc, readabilityConfig);
      const article = reader.parse();

      if (!article) {
        return this.extractWithTextMode(config);
      }

      // 第五步：格式化最终内容（将元信息添加到内容开头）
      let finalContent = article.content || '';
      let finalTextContent = article.textContent || '';

      // 安全检查：确保 finalTextContent 不为空
      if (!finalTextContent && finalContent) {
        // 如果 textContent 为空但 content 不为空，从 HTML 内容中提取文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = finalContent;
        finalTextContent = tempDiv.textContent || tempDiv.innerText || '';
      }

      if (extractedMetadata) {
        // 将元信息以纯文本格式添加到内容开头
        const metadataText = `${extractedMetadata}\n---\n\n`;
        finalContent = metadataText + finalContent;
        finalTextContent = metadataText + finalTextContent;
      }

      // 最终安全检查
      finalContent = finalContent || '';
      finalTextContent = finalTextContent || '';

      const result = {
        title: article.title || document.title || '',
        content: finalContent,
        textContent: finalTextContent,
        length: finalTextContent.length || article.length || 0,
        excerpt: article.excerpt || this.generateExcerpt(finalTextContent),
        siteName: this.extractSiteName(),
        lang: this.detectLanguage()
      };

      return result;
    } catch (error) {
      console.error('SlimPaneAI: Readability extraction failed:', error);
      // 降级到文本模式
      return this.extractWithTextMode(config);
    }
  }

  /**
   * 移除基础元素（只移除对内容提取100%无用的元素）
   */
  private static removeBasicElements(element: HTMLElement): void {
    // 只移除对内容提取绝对无用的元素
    // noscript, iframe, object, embed 已移到配置中，用户可以根据需要调整
    const alwaysRemoveSelectors = ['script', 'style'];

    alwaysRemoveSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  /**
   * 应用配置的移除规则
   */
  private static applyConfiguredRemoveRules(element: HTMLElement, removeSelectors: string[]): void {
    if (removeSelectors.length === 0) {
      return;
    }

    removeSelectors.forEach(selector => {
      try {
        const elementsToRemove = element.querySelectorAll(selector);
        elementsToRemove.forEach(el => el.remove());
      } catch (error) {
        console.warn(`SlimPaneAI: Invalid remove selector: ${selector}`, error);
      }
    });
  }

  /**
   * 转换旧格式的选择器为新的字段数组（兼容性处理）
   */
  private static convertLegacySelectors(selectors: any): WebChatMetadataField[] {
    if (!selectors || typeof selectors !== 'object') return [];

    const fields: WebChatMetadataField[] = [];

    // 预定义字段映射
    const fieldMapping = {
      author: '作者信息',
      date: '发布时间',
      tags: '标签分类',
      title: '文章标题',
      votes: '点赞数',
      views: '阅读量',
      source: '内容来源',
      location: '地理位置',
      category: '内容分类',
      comment_count: '评论数',
      reading_time: '阅读时长',
      word_count: '字数统计'
    };

    Object.entries(selectors).forEach(([key, selector]) => {
      if (typeof selector === 'string' && selector.trim()) {
        fields.push({
          key,
          name: fieldMapping[key as keyof typeof fieldMapping] || key,
          selector: selector.trim(),
          enabled: true,
          isPredefined: key in fieldMapping
        });
      }
    });

    return fields;
  }

  /**
   * 提取元信息 v2.0 - 替代preserve规则的新功能
   */
  private static extractMetadata(document: Document, metadataConfig: WebChatMetadataConfig): string {
    if (!metadataConfig.enabled || !metadataConfig.selectors) {
      return '';
    }

    const extractedData: Record<string, string> = {};

    // 遍历所有配置的字段
    const fields = Array.isArray(metadataConfig.selectors)
      ? metadataConfig.selectors
      : this.convertLegacySelectors(metadataConfig.selectors);

    fields.forEach(field => {
      if (!field.enabled || !field.selector) return;

      try {
        // 支持多个选择器（用逗号分隔）
        const elements = document.querySelectorAll(field.selector);

        if (elements.length > 0) {
          // 提取所有匹配元素的文本内容
          const values: string[] = [];
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
              values.push(text);
            }
          });

          if (values.length > 0) {
            // 使用配置的分隔符连接多个值
            extractedData[field.key] = values.join(metadataConfig.format.separator);
          }
        }
      } catch (error) {
        console.warn(`SlimPaneAI: Invalid metadata selector ${field.name}: ${field.selector}`, error);
      }
    });

    // 使用模板格式化输出
    return this.formatMetadata(extractedData, metadataConfig.format);
  }

  /**
   * 格式化元信息输出
   */
  private static formatMetadata(
    data: Record<string, string>,
    format: { template: string; separator: string; includeEmpty: boolean }
  ): string {
    let result = format.template;

    // 替换模板中的占位符
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (result.includes(placeholder)) {
        if (value || format.includeEmpty) {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
        } else {
          // 如果值为空且不包含空值，移除整个字段部分
          result = this.removeEmptyField(result, key);
        }
      }
    });

    // 清理多余的分隔符和空白
    result = this.cleanupFormattedText(result, format.separator);

    return result;
  }

  /**
   * 移除空字段及其相关的分隔符
   */
  private static removeEmptyField(text: string, fieldKey: string): string {
    // 移除包含空字段的整个部分（包括前后的分隔符）
    const patterns = [
      new RegExp(`\\s*[|｜]\\s*[^|｜]*\\{${fieldKey}\\}[^|｜]*`, 'g'),  // 移除 | 字段名：{field}
      new RegExp(`[^|｜]*\\{${fieldKey}\\}[^|｜]*\\s*[|｜]\\s*`, 'g'),  // 移除 字段名：{field} |
      new RegExp(`\\{${fieldKey}\\}`, 'g')  // 移除剩余的占位符
    ];

    let result = text;
    patterns.forEach(pattern => {
      result = result.replace(pattern, '');
    });

    return result;
  }

  /**
   * 清理格式化后的文本
   */
  private static cleanupFormattedText(text: string, separator: string): string {
    return text
      .replace(/\s*[|｜]\s*[|｜]\s*/g, ' | ')  // 清理重复的分隔符
      .replace(/^\s*[|｜]\s*/, '')           // 移除开头的分隔符
      .replace(/\s*[|｜]\s*$/, '')           // 移除结尾的分隔符
      .replace(/\s+/g, ' ')                  // 清理多余空格
      .trim();
  }



  /**
   * 生成摘要
   */
  private static generateExcerpt(text: string, maxLength: number = 200): string {
    if (!text) return '';
    
    const cleaned = text.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= maxLength) return cleaned;
    
    return cleaned.substring(0, maxLength) + '...';
  }

  /**
   * 提取域名
   */
  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      console.warn('SlimPaneAI: Invalid URL:', url);
      return '';
    }
  }

  /**
   * 提取站点名称
   */
  private static extractSiteName(): string {
    // 尝试从meta标签获取
    const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                    document.querySelector('meta[name="application-name"]')?.getAttribute('content') ||
                    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content');
    
    if (siteName) return siteName;
    
    // 从域名推断
    try {
      const hostname = window.location.hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  /**
   * 检测语言
   */
  private static detectLanguage(): string {
    // 从html标签获取
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang;
    
    // 从meta标签获取
    const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                    document.querySelector('meta[name="language"]')?.getAttribute('content');
    
    if (metaLang) return metaLang;
    
    // 默认返回中文
    return 'zh-CN';
  }

  /**
   * 检查是否为特殊页面
   */
  static isSpecialPage(): boolean {
    const url = window.location.href;
    return SPECIAL_PAGE_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * 检查是否为SPA应用
   */
  static isSPAApplication(): boolean {
    return SPA_INDICATORS.some(indicator => {
      try {
        // 检查是否存在相关的DOM元素或属性
        return (
          document.querySelector(`[data-${indicator}]`) !== null ||
          document.querySelector(`[${indicator}]`) !== null ||
          document.querySelector(`#${indicator}`) !== null ||
          document.querySelector(`.${indicator}`) !== null ||
          document.documentElement.getAttribute('data-framework') === indicator ||
          document.body.classList.contains(indicator) ||
          window.location.pathname.includes(indicator)
        );
      } catch {
        return false;
      }
    });
  }

  /**
   * 等待SPA内容加载
   */
  static async waitForSPAContent(maxWait: number = 3000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // 检查是否有足够的内容
      const textContent = document.body.textContent || '';
      if (textContent.length > 500) {
        break;
      }
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 加载Readability库 - 使用类属性缓存，避免全局污染
   */
  private static async loadReadability(): Promise<ReadabilityClass | null> {
    // 如果已经缓存，直接返回
    if (this.readabilityClass) {
      return this.readabilityClass;
    }

    try {
      // 动态导入Readability库
      const { Readability } = await import('@mozilla/readability');

      // 缓存到类属性中，避免全局污染
      this.readabilityClass = Readability;

      return this.readabilityClass;
    } catch (error) {
      console.error('SlimPaneAI: Failed to load Readability:', error);
      return null;
    }
  }
}

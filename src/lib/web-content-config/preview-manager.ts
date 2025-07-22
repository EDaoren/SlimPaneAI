/**
 * 预览管理器
 * 配置系统的一部分：配置后预览功能
 */

import type { 
  PreviewResult,
  MergedExtractionConfig,
  WebChatExtractionConfig
} from '@/types/web-content-config';
import { WebContentExtractor } from '@/lib/web-content/extractor';
import { WebContentConfigManager } from './config-manager';

export class WebContentPreviewManager {
  
  /**
   * 预览当前页面的提取效果
   */
  static async previewCurrentPage(customConfig?: Partial<WebChatExtractionConfig>): Promise<PreviewResult> {
    try {
      // 检查是否为特殊页面
      if (WebContentExtractor.isSpecialPage()) {
        return {
          success: false,
          content: null,
          error: '特殊页面不支持内容提取',
          configUsed: await this.getDefaultMergedConfig()
        };
      }

      // 获取配置
      const mergedConfig = await this.getMergedConfigForPreview(customConfig);
      
      // 执行提取
      const extractionResult = await WebContentExtractor.extractCurrentPage({
        url: window.location.href
      });

      if (!extractionResult.success || !extractionResult.content) {
        return {
          success: false,
          content: null,
          error: extractionResult.error || '内容提取失败，可能是页面内容不足或配置不当',
          configUsed: mergedConfig
        };
      }

      // 转换为预览格式
      const previewContent = {
        title: extractionResult.content.title,
        content: extractionResult.content.content,
        textContent: extractionResult.content.textContent,
        length: extractionResult.content.length,
        excerpt: extractionResult.content.excerpt,
        siteName: extractionResult.content.siteName,
        lang: extractionResult.content.lang,
        method: extractionResult.method as 'text' | 'readability' | 'fallback'
      };

      return {
        success: true,
        content: previewContent,
        configUsed: mergedConfig
      };
    } catch (error) {
      console.error('Preview failed:', error);
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : '预览失败',
        configUsed: await this.getDefaultMergedConfig()
      };
    }
  }

  /**
   * 比较不同配置的提取效果
   */
  static async compareConfigs(configs: Array<{
    name: string;
    config: Partial<WebChatExtractionConfig>;
  }>): Promise<Array<{
    name: string;
    result: PreviewResult;
  }>> {
    const results = [];
    
    for (const { name, config } of configs) {
      const result = await this.previewCurrentPage(config);
      results.push({ name, result });
    }
    
    return results;
  }

  /**
   * 获取预览统计信息
   */
  static getPreviewStats(result: PreviewResult): {
    contentLength: number;
    wordCount: number;
    paragraphCount: number;
    linkCount: number;
    imageCount: number;
  } {
    if (!result.success || !result.content) {
      return {
        contentLength: 0,
        wordCount: 0,
        paragraphCount: 0,
        linkCount: 0,
        imageCount: 0
      };
    }

    const content = result.content;
    
    // 创建临时DOM来分析内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.content;
    
    return {
      contentLength: content.textContent.length,
      wordCount: this.countWords(content.textContent),
      paragraphCount: tempDiv.querySelectorAll('p').length,
      linkCount: tempDiv.querySelectorAll('a').length,
      imageCount: tempDiv.querySelectorAll('img').length
    };
  }

  /**
   * 获取合并配置用于预览
   */
  private static async getMergedConfigForPreview(
    customConfig?: Partial<WebChatExtractionConfig>
  ): Promise<MergedExtractionConfig> {
    const configManager = WebContentConfigManager.getInstance();
    const currentDomain = this.extractDomain(window.location.href);
    
    if (customConfig) {
      // 如果有自定义配置，合并到当前配置 v2.0
      const baseConfig = await configManager.getConfig();
      const mergedConfig = {
        ...baseConfig,
        ...customConfig,
        global: {
          ...baseConfig.global,
          ...customConfig.global,
          // 确保元信息配置正确合并
          metadata: customConfig.global?.metadata || baseConfig.global.metadata
        }
      };

      // 临时创建配置管理器实例来处理合并
      const tempManager = new (WebContentConfigManager as any)();
      tempManager.config = mergedConfig;
      return await tempManager.getMergedConfig(currentDomain);
    } else {
      return await configManager.getMergedConfig(currentDomain);
    }
  }

  /**
   * 获取默认合并配置
   */
  private static async getDefaultMergedConfig(): Promise<MergedExtractionConfig> {
    const configManager = WebContentConfigManager.getInstance();
    const domain = this.extractDomain(window.location.href);
    return await configManager.getMergedConfig(domain);
  }

  /**
   * 提取域名
   */
  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  /**
   * 统计单词数
   */
  private static countWords(text: string): number {
    if (!text) return 0;
    
    // 中文字符按字符计算，英文按单词计算
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    
    return chineseChars.length + englishWords.length;
  }
}

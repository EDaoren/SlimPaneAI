/**
 * 网页内容提取模块入口
 * 提供统一的API接口
 */

import { WebContentExtractor } from './extractor';
import { WebContentProcessor } from './processor';
import { AD_NOISE, LAYOUT_NOISE, SITE_RULES } from './config';
import type { ExtractionOptions, ExtractionResult, ProcessedContent, ExtractedContent, ProcessingResult } from './types';

/**
 * 提取并处理当前页面内容
 */
export async function extractAndProcessCurrentPage(options: ExtractionOptions = {}): Promise<ProcessingResult> {
  try {
    // 第一步：提取原始内容
    const extractionResult = await WebContentExtractor.extractCurrentPage(options);

    if (!extractionResult.success || !extractionResult.content) {
      return {
        success: extractionResult.success,
        content: null,
        error: extractionResult.error,
        method: extractionResult.method
      };
    }

    // 第二步：处理内容
    const processedContent = WebContentProcessor.processExtractedContent(extractionResult.content);

    return {
      success: true,
      content: processedContent,
      method: extractionResult.method
    };

  } catch (error) {
    console.error('SlimPaneAI: Content extraction and processing failed:', error);
    return {
      success: false,
      content: null,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 仅提取内容（不进行后处理）
 */
export async function extractCurrentPage(options: ExtractionOptions = {}): Promise<ExtractionResult> {
  return WebContentExtractor.extractCurrentPage(options);
}

/**
 * 仅处理已提取的内容
 */
export function processExtractedContent(extracted: ExtractedContent): ProcessedContent {
  return WebContentProcessor.processExtractedContent(extracted);
}

/**
 * 清理文本内容
 */
export function cleanTextContent(text: string): string {
  return WebContentProcessor.cleanTextContent(text);
}

/**
 * 检查页面是否可能包含可读内容
 */
export function isPageReaderable(doc: Document = document): boolean {
  try {
    // 在浏览器环境中，Readability 应该已经通过构建系统加载
    // 这里提供一个简单的启发式检查
    const textLength = doc.body?.textContent?.trim().length || 0;
    const paragraphs = doc.querySelectorAll('p').length;
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length;

    // 简单的可读性检查
    return textLength > 300 && (paragraphs > 2 || headings > 1);
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
 * 添加站点特定的黑名单规则（运行时动态添加）
 * 注意：这是一个简化的实现，实际应用中可能需要持久化存储
 */
export function addSiteRule(host: string, selectors: string[]): void {
  const normalizedHost = host.replace(/^www\./, '');
  console.log(`SlimPaneAI: Adding site rule for ${normalizedHost}:`, selectors);
  // 这里可以实现动态规则添加的逻辑
  // 由于 SITE_RULES 是 const，我们不能直接修改它
  // 在实际应用中，这些规则应该存储在用户设置中
}

// 导出类型
export type {
  ExtractedContent,
  ProcessedContent,
  ContentBlock,
  ContentMetadata,
  ExtractionOptions,
  ExtractionResult,
  ProcessingResult,
  ExtractionStats
} from './types';

// 导出配置
export { EXTRACTION_CONFIG, AD_NOISE, LAYOUT_NOISE, SITE_RULES } from './config';

// 导出核心类
export { WebContentExtractor, WebContentProcessor };

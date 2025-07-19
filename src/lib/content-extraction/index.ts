/**
 * 统一内容提取系统入口
 * 提供简洁的API接口，支持多种文档类型的内容提取
 */

import { ContentExtractionFactory } from './factory';

// 导出工厂类
export { ContentExtractionFactory };

// 导出所有类型
export type {
  ContentType,
  ContentExtractor,
  ExtractionOptions,
  ExtractionResult,
  ExtractionProgress,
  StandardizedContent,
  ContentBlock,
  ContentMetadata,
  ExtractionMetadata,
  ContentDetectionResult
} from './types';

// 导出提取器基类（用于扩展）
export { BaseExtractor } from './extractors/base-extractor';

// 导出具体提取器（用于直接使用或扩展）
export { WebPageExtractor } from './extractors/webpage-extractor';
export { PDFExtractor } from './extractors/pdf-extractor';

/**
 * 便捷函数：提取内容
 * 自动检测内容类型并选择合适的提取器
 */
export async function extractContent(
  url: string,
  options?: import('./types').ExtractionOptions
): Promise<import('./types').ExtractionResult> {
  return ContentExtractionFactory.extractContent(url, options);
}

/**
 * 便捷函数：带进度的内容提取
 */
export async function extractContentWithProgress(
  url: string,
  onProgress: (status: import('./types').ExtractionProgress) => void,
  options?: import('./types').ExtractionOptions
): Promise<import('./types').ExtractionResult> {
  return ContentExtractionFactory.extractContentWithProgress(url, onProgress, options);
}

/**
 * 便捷函数：检测内容类型
 */
export function detectContentType(url: string, contentType?: string): import('./types').ContentDetectionResult {
  return ContentExtractionFactory.detectContentType(url, contentType);
}

/**
 * 便捷函数：检查是否支持指定的内容类型
 */
export function supportsContentType(type: import('./types').ContentType): boolean {
  return ContentExtractionFactory.supportsContentType(type);
}

/**
 * 便捷函数：获取所有支持的内容类型
 */
export function getSupportedContentTypes(): import('./types').ContentType[] {
  return ContentExtractionFactory.getRegisteredTypes();
}

// 自动初始化工厂
ContentExtractionFactory.initialize();

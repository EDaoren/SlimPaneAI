/**
 * 内容提取器工厂
 * 统一管理所有内容提取器，提供自动检测和提取功能
 */

import type { 
  ContentExtractor, 
  ContentType, 
  ExtractionOptions, 
  ExtractionResult,
  ExtractionProgress,
  ContentDetectionResult
} from './types';

export class ContentExtractionFactory {
  private static extractors: ContentExtractor[] = [];
  private static initialized = false;

  /**
   * 初始化工厂（注册所有提取器）
   */
  static initialize(): void {
    if (this.initialized) return;

    // 动态导入提取器以避免循环依赖
    this.registerDefaultExtractors();
    this.initialized = true;
  }

  /**
   * 注册默认提取器
   */
  private static async registerDefaultExtractors(): Promise<void> {
    try {
      // 注册PDF提取器（优先级高，先检查特殊文档）
      const { PDFExtractor } = await import('./extractors/pdf-extractor');
      this.register(new PDFExtractor());

      // 注册网页提取器（默认处理器，处理所有其他情况）
      const { WebPageExtractor } = await import('./extractors/webpage-extractor');
      this.register(new WebPageExtractor());

    } catch (error) {
      console.error('SlimPaneAI: Failed to initialize content extractors:', error);
    }
  }

  /**
   * 注册提取器
   */
  static register(extractor: ContentExtractor): void {
    // 新注册的提取器优先级更高（插入到数组开头）
    this.extractors.unshift(extractor);
  }

  /**
   * 检测内容类型
   */
  static detectContentType(url: string, contentType?: string): ContentDetectionResult {
    this.initialize();

    for (const extractor of this.extractors) {
      if (extractor.canHandle(url, contentType)) {
        return {
          type: extractor.type,
          confidence: 1.0,
          extractor: extractor.constructor.name,
          canExtract: true
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 0,
      extractor: 'none',
      canExtract: false,
      reason: 'No suitable extractor found'
    };
  }

  /**
   * 获取指定类型的提取器
   */
  static getExtractor(type: ContentType): ContentExtractor | null {
    this.initialize();
    return this.extractors.find(extractor => extractor.type === type) || null;
  }

  /**
   * 获取适合处理指定URL的提取器
   */
  static getExtractorForUrl(url: string, contentType?: string): ContentExtractor | null {
    this.initialize();
    
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url, contentType)) {
        return extractor;
      }
    }
    
    return null;
  }

  /**
   * 提取内容（自动选择合适的提取器）
   */
  static async extractContent(
    url: string, 
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    this.initialize();

    const extractor = this.getExtractorForUrl(url);
    
    if (!extractor) {
      return {
        success: false,
        content: null,
        error: `不支持的内容类型，无法提取 URL: ${url}`,
        metadata: {
          extractionMethod: 'none',
          extractionTime: 0,
          contentLength: 0,
          blocksCount: 0
        }
      };
    }

    try {
      return await extractor.extract(url, options);
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : '内容提取过程中发生未知错误',
        metadata: {
          extractionMethod: extractor.type,
          extractionTime: 0,
          contentLength: 0,
          blocksCount: 0
        }
      };
    }
  }

  /**
   * 带进度的内容提取
   */
  static async extractContentWithProgress(
    url: string,
    onProgress: (status: ExtractionProgress) => void,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    this.initialize();

    const extractor = this.getExtractorForUrl(url);
    
    if (!extractor) {
      const errorProgress: ExtractionProgress = {
        type: 'unknown',
        url,
        status: 'error',
        progress: 0,
        error: '不支持的内容类型'
      };
      onProgress(errorProgress);
      
      return {
        success: false,
        content: null,
        error: `不支持的内容类型，无法提取 URL: ${url}`
      };
    }

    // 发送开始状态
    onProgress({
      type: extractor.type,
      url,
      status: 'detecting',
      progress: 0,
      currentStep: 'Initializing extraction'
    });

    try {
      // 如果提取器支持进度回调，使用它
      if (extractor.extractWithProgress) {
        return await extractor.extractWithProgress(url, onProgress, options);
      } else {
        // 否则使用标准提取方法
        onProgress({
          type: extractor.type,
          url,
          status: 'processing',
          progress: 50,
          currentStep: 'Extracting content'
        });

        const result = await extractor.extract(url, options);
        
        onProgress({
          type: extractor.type,
          url,
          status: result.success ? 'completed' : 'error',
          progress: 100,
          currentStep: result.success ? 'Extraction completed' : 'Extraction failed',
          error: result.error
        });

        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '内容提取过程中发生未知错误';
      
      onProgress({
        type: extractor.type,
        url,
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      return {
        success: false,
        content: null,
        error: errorMessage
      };
    }
  }

  /**
   * 获取所有已注册的提取器类型
   */
  static getRegisteredTypes(): ContentType[] {
    this.initialize();
    return this.extractors.map(extractor => extractor.type);
  }

  /**
   * 检查是否支持指定的内容类型
   */
  static supportsContentType(type: ContentType): boolean {
    this.initialize();
    return this.extractors.some(extractor => extractor.type === type);
  }

  /**
   * 重置工厂（主要用于测试）
   */
  static reset(): void {
    this.extractors = [];
    this.initialized = false;
  }
}

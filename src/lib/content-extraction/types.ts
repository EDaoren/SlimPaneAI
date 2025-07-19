/**
 * 统一内容提取系统的类型定义
 */

export type ContentType = 'webpage' | 'pdf' | 'word' | 'powerpoint' | 'excel' | 'unknown';

/**
 * 内容提取器接口
 */
export interface ContentExtractor {
  readonly type: ContentType;
  canHandle(url: string, contentType?: string): boolean;
  extract(url: string, options?: ExtractionOptions): Promise<ExtractionResult>;
  extractWithProgress?(
    url: string, 
    onProgress: (status: ExtractionProgress) => void,
    options?: ExtractionOptions
  ): Promise<ExtractionResult>;
}

/**
 * 提取选项
 */
export interface ExtractionOptions {
  enableBlacklist?: boolean;
  customBlacklist?: string[];
  enableFallback?: boolean;
  minContentLength?: number;
  maxContentLength?: number;
  chunkSize?: number; // 用于大文档分块
}

/**
 * 提取结果
 */
export interface ExtractionResult {
  success: boolean;
  content: StandardizedContent | null;
  error?: string;
  metadata?: ExtractionMetadata;
}

/**
 * 标准化的内容格式（统一所有文档类型的输出）
 */
export interface StandardizedContent {
  url: string;
  title: string;
  rawText: string;
  blocks: ContentBlock[];
  metadata: ContentMetadata;
  excerpt: string;
  contentType: ContentType;
  tokenCount?: number;
}

/**
 * 内容块定义
 */
export interface ContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'table';
  content: string;
  level?: number;
  position: number;
}

/**
 * 内容元数据
 */
export interface ContentMetadata {
  url: string;
  title: string;
  author?: string;
  publishedTime?: string;
  capturedAt: string;
  language: string;
  wordCount: number;
  siteName?: string;
  description?: string;
  keywords?: string[];
}

/**
 * 提取元数据
 */
export interface ExtractionMetadata {
  extractionMethod?: string;
  extractionTime?: number;
  contentLength?: number;
  blocksCount?: number;
  processingSteps?: string[];
}

/**
 * 提取进度状态
 */
export interface ExtractionProgress {
  type: ContentType;
  url: string;
  status: 'detecting' | 'loading' | 'processing' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  error?: string;
}

/**
 * 内容检测结果
 */
export interface ContentDetectionResult {
  type: ContentType;
  confidence: number;
  extractor: string;
  canExtract: boolean;
  reason?: string;
}

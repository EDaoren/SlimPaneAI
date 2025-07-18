/**
 * 网页内容提取相关的类型定义
 */

export interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline?: string;
  dir?: string;
  siteName?: string;
  lang?: string;
}

export interface ContentMetadata {
  url: string;
  title: string;
  author?: string;
  publishedTime?: string;
  capturedAt: string;
  language: string;
  wordCount: number;
  siteName?: string;
}

export interface ContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote';
  content: string;
  level?: number;
  position: number;
}

export interface ProcessedContent {
  metadata: ContentMetadata;
  blocks: ContentBlock[];
  rawText: string;
  htmlContent?: string;
  excerpt: string;
}

export interface ExtractionOptions {
  url?: string;
  host?: string;
  enableBlacklist?: boolean;
  customBlacklist?: string[];
  enableFallback?: boolean;
  minContentLength?: number;
}

export interface ExtractionResult {
  success: boolean;
  content: ExtractedContent | null;
  error?: string;
  method?: 'readability' | 'fallback';
}

export interface ProcessingResult {
  success: boolean;
  content: ProcessedContent | null;
  error?: string;
  method?: 'readability' | 'fallback';
}

export interface ExtractionStats {
  extractionTime: number;
  contentLength: number;
  blocksCount: number;
  method: string;
  url: string;
}

/**
 * PDF内容提取器
 * 包装现有的 pdf-content 模块，提供统一接口
 */

import { BaseExtractor } from './base-extractor';
import { PDFProcessor } from '../../pdf-content';
import type { PageContent, PDFProcessingStatus } from '../../../types';
import type { 
  ContentType, 
  ExtractionOptions, 
  ExtractionResult,
  ExtractionProgress,
  StandardizedContent,
  ExtractionMetadata
} from '../types';

export class PDFExtractor extends BaseExtractor {
  readonly type: ContentType = 'pdf';
  private pdfProcessor = new PDFProcessor();

  /**
   * 检查是否可以处理该URL
   */
  canHandle(url: string, contentType?: string): boolean {
    if (!url) return false;

    return PDFProcessor.isPDFUrl(url) || 
           contentType === 'application/pdf' ||
           this.isPDFPage();
  }

  /**
   * 提取PDF内容
   */
  async extract(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 检查是否需要分块处理
      if (options.chunkSize && options.chunkSize > 0) {
        return this.extractLargePDF(url, options, startTime);
      }

      // 标准PDF提取
      const pageContent = await this.pdfProcessor.extractFromPDF(url);
      const standardizedContent = this.convertToStandardFormat(pageContent);
      
      // 检查内容长度
      if (options.minContentLength && standardizedContent.rawText.length < options.minContentLength) {
        return {
          success: false,
          content: null,
          error: `PDF内容长度不足，最少需要 ${options.minContentLength} 个字符`,
          metadata: this.buildExtractionMetadata('insufficient_content', startTime)
        };
      }

      // 检查最大内容长度
      if (options.maxContentLength && standardizedContent.rawText.length > options.maxContentLength) {
        // 截断内容
        standardizedContent.rawText = standardizedContent.rawText.substring(0, options.maxContentLength);
        standardizedContent.excerpt = this.generateExcerpt(standardizedContent.rawText);
        standardizedContent.tokenCount = this.estimateTokenCount(standardizedContent.rawText);
      }

      return {
        success: true,
        content: standardizedContent,
        metadata: this.buildExtractionMetadata('pdf_extraction', startTime, standardizedContent)
      };

    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'PDF内容提取过程中发生未知错误',
        metadata: this.buildExtractionMetadata('error', startTime)
      };
    }
  }

  /**
   * 带进度的PDF提取
   */
  async extractWithProgress(
    url: string, 
    onProgress: (status: ExtractionProgress) => void,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      const pageContent = await this.pdfProcessor.extractFromPDF(url, (pdfStatus) => {
        // 转换PDF状态为标准进度格式
        onProgress(this.convertPDFStatusToProgress(pdfStatus));
      });

      const standardizedContent = this.convertToStandardFormat(pageContent);
      
      // 最终进度通知
      onProgress({
        type: 'pdf',
        url,
        status: 'completed',
        progress: 100,
        currentStep: 'Content processing completed'
      });

      return {
        success: true,
        content: standardizedContent,
        metadata: this.buildExtractionMetadata('pdf_extraction_with_progress', startTime, standardizedContent)
      };

    } catch (error) {
      onProgress({
        type: 'pdf',
        url,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'PDF内容提取过程中发生未知错误',
        metadata: this.buildExtractionMetadata('error', startTime)
      };
    }
  }

  /**
   * 处理大型PDF（分块）
   */
  private async extractLargePDF(
    url: string, 
    options: ExtractionOptions, 
    startTime: number
  ): Promise<ExtractionResult> {
    try {
      const chunks = await this.pdfProcessor.extractFromLargePDF(
        url, 
        options.chunkSize || 10
      );

      if (!chunks || chunks.length === 0) {
        return {
          success: false,
          content: null,
          error: 'PDF分块提取失败',
          metadata: this.buildExtractionMetadata('chunk_extraction_failed', startTime)
        };
      }

      // 合并所有块的内容
      const combinedContent = chunks.map(chunk => chunk.content).join('\n\n');
      const firstChunk = chunks[0];
      
      const standardizedContent: StandardizedContent = {
        url: firstChunk.url.split('#')[0], // 移除页面标记
        title: firstChunk.title.replace(/\s*\(Pages.*?\)/, ''), // 移除页面范围标记
        rawText: this.cleanText(combinedContent),
        blocks: this.segmentIntoBlocks(combinedContent),
        metadata: this.buildBaseMetadata(url, firstChunk.title, combinedContent),
        excerpt: this.generateExcerpt(combinedContent),
        contentType: 'pdf',
        tokenCount: this.estimateTokenCount(combinedContent)
      };

      return {
        success: true,
        content: standardizedContent,
        metadata: this.buildExtractionMetadata('pdf_chunk_extraction', startTime, standardizedContent)
      };

    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'PDF分块提取过程中发生未知错误',
        metadata: this.buildExtractionMetadata('error', startTime)
      };
    }
  }

  /**
   * 将 PageContent 转换为 StandardizedContent
   */
  private convertToStandardFormat(pageContent: PageContent): StandardizedContent {
    const cleanedText = this.cleanText(pageContent.content);
    
    return {
      url: pageContent.url,
      title: pageContent.title,
      rawText: cleanedText,
      blocks: this.segmentIntoBlocks(cleanedText),
      metadata: {
        ...this.buildBaseMetadata(pageContent.url, pageContent.title, cleanedText),
        description: pageContent.metadata?.description
      },
      excerpt: this.generateExcerpt(cleanedText),
      contentType: 'pdf',
      tokenCount: pageContent.tokenCount || this.estimateTokenCount(cleanedText)
    };
  }

  /**
   * 转换PDF处理状态为标准进度格式
   */
  private convertPDFStatusToProgress(pdfStatus: PDFProcessingStatus): ExtractionProgress {
    return {
      type: 'pdf',
      url: pdfStatus.url,
      status: pdfStatus.status,
      progress: pdfStatus.progress,
      currentStep: pdfStatus.currentPage ? `Processing page ${pdfStatus.currentPage}` : undefined,
      totalSteps: pdfStatus.totalPages,
      error: pdfStatus.error
    };
  }

  /**
   * 检查当前页面是否是PDF
   */
  private isPDFPage(): boolean {
    if (typeof document === 'undefined') return false;
    
    return document.contentType === 'application/pdf' ||
           window.location.href.toLowerCase().includes('.pdf');
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
        'PDF loading',
        'Text extraction',
        'Content cleaning',
        'Block segmentation',
        'Metadata generation'
      ]
    };
  }

  /**
   * 静态方法：检查是否为PDF URL
   */
  static isPDF(url: string): boolean {
    return PDFProcessor.isPDFUrl(url);
  }
}

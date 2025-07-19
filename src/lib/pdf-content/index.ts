import type { PageContent, PDFProcessingStatus } from '@/types';

/**
 * PDF内容处理器
 * 使用PDF.js库来读取和处理PDF文档内容
 */
export class PDFProcessor {
  private pdfjsLib: any = null;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.initializePDFJS();
  }

  /**
   * 初始化PDF.js库
   */
  private async initializePDFJS(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        // 使用本地安装的PDF.js
        if (typeof window !== 'undefined') {
          // 动态导入pdfjs-dist
          const pdfjsModule = await import('pdfjs-dist');
          this.pdfjsLib = pdfjsModule;

          // 禁用worker以避免CSP问题
          // 在浏览器扩展环境中，worker可能会有CSP限制
          this.pdfjsLib.GlobalWorkerOptions.workerSrc = '';

          console.log('SlimPaneAI: PDF.js initialized successfully (worker disabled for CSP compatibility)');
          resolve();
        } else {
          reject(new Error('PDF.js requires browser environment'));
        }
      } catch (error) {
        console.error('SlimPaneAI: Failed to load PDF.js:', error);
        reject(error);
      }
    });

    return this.loadingPromise;
  }

  /**
   * 从PDF URL提取内容
   */
  async extractFromPDF(
    url: string, 
    onProgress?: (status: PDFProcessingStatus) => void
  ): Promise<PageContent> {
    await this.initializePDFJS();

    if (!this.pdfjsLib) {
      throw new Error('PDF.js library not loaded');
    }

    const status: PDFProcessingStatus = {
      url,
      status: 'loading',
      progress: 0
    };

    try {
      // 通知开始加载
      onProgress?.(status);

      // 加载PDF文档
      const loadingTask = this.pdfjsLib.getDocument({
        url,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      
      status.status = 'processing';
      status.totalPages = pdf.numPages;
      onProgress?.(status);

      // 提取所有页面的文本
      const textContent: string[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        status.currentPage = pageNum;
        status.progress = (pageNum / pdf.numPages) * 100;
        onProgress?.(status);

        try {
          const page = await pdf.getPage(pageNum);
          const textContentObj = await page.getTextContent();
          
          // 提取文本项
          const pageText = textContentObj.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            textContent.push(pageText);
          }
        } catch (pageError) {
          console.warn(`Error extracting page ${pageNum}:`, pageError);
          // 继续处理其他页面
        }
      }

      const content = textContent.join('\n\n').trim();
      const title = this.extractPDFTitle(url);

      status.status = 'completed';
      status.progress = 100;
      onProgress?.(status);

      return {
        url,
        title,
        domain: new URL(url).hostname,
        content,
        extractedAt: Date.now(),
        contentType: 'pdf',
        tokenCount: this.estimateTokenCount(content),
        metadata: {
          description: `PDF document with ${pdf.numPages} pages`
        }
      };

    } catch (error) {
      status.status = 'error';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(status);
      throw error;
    }
  }

  /**
   * 检查是否是PDF文件
   */
  static isPDFUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    return urlLower.includes('.pdf') || 
           urlLower.includes('application/pdf') ||
           urlLower.includes('content-type=application/pdf');
  }

  /**
   * 检查当前页面是否是PDF
   */
  static isCurrentPagePDF(): boolean {
    return document.contentType === 'application/pdf' ||
           window.location.href.toLowerCase().includes('.pdf');
  }

  /**
   * 从PDF URL提取标题
   */
  private extractPDFTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || '';
      
      if (filename.endsWith('.pdf')) {
        return filename
          .replace('.pdf', '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return filename || 'PDF Document';
    } catch {
      return 'PDF Document';
    }
  }

  /**
   * 估算Token数量
   */
  private estimateTokenCount(text: string): number {
    // 简单的Token估算：大约4个字符 = 1个Token
    return Math.ceil(text.length / 4);
  }

  /**
   * 分块处理大型PDF
   */
  async extractFromLargePDF(
    url: string,
    chunkSize: number = 10,
    onProgress?: (status: PDFProcessingStatus) => void
  ): Promise<PageContent[]> {
    await this.initializePDFJS();

    if (!this.pdfjsLib) {
      throw new Error('PDF.js library not loaded');
    }

    const loadingTask = this.pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    
    const chunks: PageContent[] = [];
    const totalPages = pdf.numPages;
    
    for (let startPage = 1; startPage <= totalPages; startPage += chunkSize) {
      const endPage = Math.min(startPage + chunkSize - 1, totalPages);
      
      const status: PDFProcessingStatus = {
        url,
        status: 'processing',
        progress: (startPage / totalPages) * 100,
        totalPages,
        currentPage: startPage
      };
      onProgress?.(status);

      const chunkContent = await this.extractPagesRange(pdf, startPage, endPage);
      
      chunks.push({
        url: `${url}#page=${startPage}-${endPage}`,
        title: `${this.extractPDFTitle(url)} (Pages ${startPage}-${endPage})`,
        domain: new URL(url).hostname,
        content: chunkContent,
        extractedAt: Date.now(),
        contentType: 'pdf',
        tokenCount: this.estimateTokenCount(chunkContent),
        metadata: {
          description: `PDF pages ${startPage}-${endPage} of ${totalPages}`
        }
      });
    }

    const finalStatus: PDFProcessingStatus = {
      url,
      status: 'completed',
      progress: 100,
      totalPages,
      currentPage: totalPages
    };
    onProgress?.(finalStatus);

    return chunks;
  }

  /**
   * 提取指定页面范围的内容
   */
  private async extractPagesRange(pdf: any, startPage: number, endPage: number): Promise<string> {
    const textContent: string[] = [];
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContentObj = await page.getTextContent();
        
        const pageText = textContentObj.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText) {
          textContent.push(`[Page ${pageNum}]\n${pageText}`);
        }
      } catch (error) {
        console.warn(`Error extracting page ${pageNum}:`, error);
      }
    }
    
    return textContent.join('\n\n');
  }

  /**
   * 获取PDF基本信息
   */
  async getPDFInfo(url: string): Promise<{
    numPages: number;
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  }> {
    await this.initializePDFJS();

    if (!this.pdfjsLib) {
      throw new Error('PDF.js library not loaded');
    }

    const loadingTask = this.pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata();

    return {
      numPages: pdf.numPages,
      title: metadata.info.Title,
      author: metadata.info.Author,
      subject: metadata.info.Subject,
      creator: metadata.info.Creator,
      producer: metadata.info.Producer,
      creationDate: metadata.info.CreationDate,
      modificationDate: metadata.info.ModDate
    };
  }
}

// 全局PDF处理器实例
export const pdfProcessor = new PDFProcessor();

// 声明全局类型
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

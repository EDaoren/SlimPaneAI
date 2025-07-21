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
        // 使用本地PDF.js文件
        if (typeof window !== 'undefined') {
          // 使用本地PDF.js文件而不是node_modules中的版本
          const pdfjsUrl = chrome.runtime.getURL('pdf.mjs');
          const pdfjsModule = await import(pdfjsUrl);
          this.pdfjsLib = pdfjsModule;
          // 配置PDF.js worker
          // 使用本地worker文件，这是在浏览器扩展中的最佳实践
          const PDFJS_WORKER_PATH = chrome.runtime.getURL('pdf.worker.js');
          this.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_PATH;
          console.log('SlimPaneAI: PDF.js initialized with local worker:', PDFJS_WORKER_PATH);

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

      let pdf: any;

      // 检查是否是本地文件
      if (url.startsWith('file://')) {
        console.log('📁 SlimPaneAI: Local PDF detected, using background script');
        pdf = await this.loadLocalPDF(url, onProgress);
      } else {
        console.log('🌐 SlimPaneAI: Online PDF detected, loading directly');
        // 加载在线PDF文档
        const loadingTask = this.pdfjsLib.getDocument({
          url,
          cMapUrl: chrome.runtime.getURL('cmaps/'),
          cMapPacked: true,
        });
        pdf = await loadingTask.promise;
      }
      
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
        domain: url.startsWith('file://') ? 'localhost' : new URL(url).hostname,
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
   * 通过背景脚本加载本地PDF文件
   */
  private async loadLocalPDF(url: string, onProgress?: (status: PDFProcessingStatus) => void): Promise<any> {
    console.log('📡 SlimPaneAI: Requesting PDF data from background script...');

    const status: PDFProcessingStatus = {
      url,
      status: 'loading',
      progress: 25
    };
    onProgress?.(status);

    try {
      // 生成唯一请求ID
      const requestId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 请求背景脚本获取PDF数据
      const response = await chrome.runtime.sendMessage({
        type: 'extract-pdf-content',
        requestId: requestId,
        payload: { url }
      });

      console.log('📡 SlimPaneAI: Background script response:', {
        success: response?.success,
        hasData: !!response?.pdfData,
        dataSize: response?.pdfData?.length,
        error: response?.error
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to get PDF data from background script');
      }

      if (!response.pdfData || !Array.isArray(response.pdfData)) {
        throw new Error('Invalid PDF data received from background script');
      }

      // 转换数组数据为Uint8Array
      const uint8Array = new Uint8Array(response.pdfData);
      console.log('✅ SlimPaneAI: PDF data converted, size:', uint8Array.length, 'bytes');

      onProgress?.({ ...status, status: 'processing', progress: 50 });

      // 使用PDF.js加载PDF数据
      const loadingTask = this.pdfjsLib.getDocument({
        data: uint8Array,
        cMapUrl: null, // 禁用cMap以简化
        cMapPacked: false,
        verbosity: 0
      });

      const pdf = await loadingTask.promise;
      console.log('✅ SlimPaneAI: PDF loaded successfully, pages:', pdf.numPages);

      return pdf;

    } catch (error) {
      console.error('❌ SlimPaneAI: Local PDF loading failed:', error);

      if (error instanceof Error && error.message.includes('background script')) {
        throw new Error(`无法获取本地PDF文件数据。请确保：
1. 在 chrome://extensions/ 中为 SlimPaneAI 启用"允许访问文件网址"权限
2. 重新加载扩展
3. 确保PDF文件路径正确且文件未被占用

原始错误: ${error.message}`);
      }

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
      let pathname: string;

      if (url.startsWith('file://')) {
        // 处理本地文件路径
        pathname = url.replace('file://', '');
        // 处理Windows路径
        if (pathname.startsWith('/') && pathname.includes(':')) {
          pathname = pathname.substring(1);
        }
      } else {
        const urlObj = new URL(url);
        pathname = urlObj.pathname;
      }

      const filename = pathname.split(/[/\\]/).pop() || '';

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

    let pdf: any;

    // 检查是否是本地文件
    if (url.startsWith('file://')) {
      pdf = await this.loadLocalPDF(url, onProgress);
    } else {
      const loadingTask = this.pdfjsLib.getDocument({
        url,
        cMapUrl: chrome.runtime.getURL('cmaps/'),
        cMapPacked: true,
      });
      pdf = await loadingTask.promise;
    }
    
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
        domain: url.startsWith('file://') ? 'localhost' : new URL(url).hostname,
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

    let pdf: any;

    // 检查是否是本地文件
    if (url.startsWith('file://')) {
      pdf = await this.loadLocalPDF(url);
    } else {
      const loadingTask = this.pdfjsLib.getDocument({
        url,
        cMapUrl: chrome.runtime.getURL('cmaps/'),
        cMapPacked: true,
      });
      pdf = await loadingTask.promise;
    }
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

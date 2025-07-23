/**
 * 网页内容后处理器
 * 负责内容格式化、分块和清理
 */

import { TEXT_CLEANING, EXTRACTION_CONFIG } from './config';
import type { ExtractedContent, ProcessedContent, ContentBlock, ContentMetadata } from './types';

export class WebContentProcessor {
  /**
   * 处理提取的内容
   */
  static processExtractedContent(extracted: ExtractedContent): ProcessedContent {
    // 安全检查：确保 extracted 对象存在且有必要的属性
    if (!extracted) {
      throw new Error('提取的内容对象为空');
    }

    // 构建元数据
    const metadata = this.buildMetadata(extracted);

    // 安全获取文本内容，防止 undefined
    const textContent = extracted.textContent || extracted.content || '';

    // 清理文本内容
    const cleanedText = this.cleanTextContent(textContent);

    // 分割成内容块
    const blocks = this.segmentIntoBlocks(cleanedText);

    // 生成摘要
    const excerpt = this.generateExcerpt(cleanedText);

    // 更新字数统计
    metadata.wordCount = this.countWords(cleanedText);

    return {
      metadata,
      blocks,
      rawText: cleanedText,
      htmlContent: extracted.content || '',
      excerpt
    };
  }

  /**
   * 构建内容元数据
   */
  private static buildMetadata(extracted: ExtractedContent): ContentMetadata {
    return {
      url: window.location.href,
      title: (extracted && extracted.title) || document.title || 'Untitled',
      author: (extracted && extracted.byline) || this.extractAuthor(),
      publishedTime: this.extractPublishedTime(),
      capturedAt: new Date().toISOString(),
      language: (extracted && extracted.lang) || this.detectLanguage(),
      wordCount: 0, // 将在后面更新
      siteName: (extracted && extracted.siteName) || this.extractSiteName()
    };
  }

  /**
   * 清理文本内容
   */
  static cleanTextContent(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. 标准化换行符
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. 智能行合并 - 保留重要的换行
    const lines = cleaned.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过空行
      if (!line) {
        // 保留一个空行作为段落分隔
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        continue;
      }
      
      // 检查是否应该保留换行
      const shouldPreserveLine = this.shouldPreserveLine(line);
      
      if (shouldPreserveLine) {
        processedLines.push(line);
      } else {
        // 尝试与上一行合并
        const lastIndex = processedLines.length - 1;
        if (lastIndex >= 0 && processedLines[lastIndex] && !this.shouldPreserveLine(processedLines[lastIndex])) {
          // 检查是否应该合并
          if (this.shouldMergeLines(processedLines[lastIndex], line)) {
            processedLines[lastIndex] += ' ' + line;
          } else {
            processedLines.push(line);
          }
        } else {
          processedLines.push(line);
        }
      }
    }

    cleaned = processedLines.join('\n');

    // 3. 应用清理规则
    TEXT_CLEANING.REMOVE_PATTERNS.forEach(pattern => {
      cleaned = cleaned.replace(pattern, pattern.source.includes('\\n') ? '\n' : ' ');
    });

    // 4. 最终清理
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')  // 最多保留两个连续换行
      .replace(/[ \t]{2,}/g, ' ')   // 合并多余空格
      .trim();

    return cleaned;
  }

  /**
   * 判断是否应该保留行的换行
   */
  private static shouldPreserveLine(line: string): boolean {
    return TEXT_CLEANING.PRESERVE_PATTERNS.some(pattern => pattern.test(line));
  }

  /**
   * 判断是否应该合并两行
   */
  private static shouldMergeLines(prevLine: string, currentLine: string): boolean {
    // 如果前一行以句号等结尾，不合并
    if (/[.!?。！？]\s*$/.test(prevLine)) {
      return false;
    }
    
    // 如果当前行以大写字母或中文开头，可能是新句子，不合并
    if (/^[A-Z\u4e00-\u9fff]/.test(currentLine)) {
      return false;
    }
    
    // 如果当前行是特殊格式，不合并
    if (this.shouldPreserveLine(currentLine)) {
      return false;
    }
    
    return true;
  }

  /**
   * 将文本分割成内容块
   */
  static segmentIntoBlocks(text: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const lines = text.split('\n');
    let currentBlock = '';
    let blockType: ContentBlock['type'] = 'paragraph';
    let position = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // 空行 - 结束当前块
        if (currentBlock.trim()) {
          blocks.push(this.createBlock(currentBlock.trim(), blockType, position++));
          currentBlock = '';
          blockType = 'paragraph';
        }
        continue;
      }

      const lineType = this.detectLineType(trimmedLine);
      
      if (lineType !== blockType && currentBlock.trim()) {
        // 类型变化 - 结束当前块
        blocks.push(this.createBlock(currentBlock.trim(), blockType, position++));
        currentBlock = trimmedLine;
        blockType = lineType;
      } else {
        // 继续当前块
        if (currentBlock) {
          currentBlock += '\n' + trimmedLine;
        } else {
          currentBlock = trimmedLine;
        }
        if (!blockType || blockType === 'paragraph') {
          blockType = lineType;
        }
      }
    }

    // 添加最后一个块
    if (currentBlock.trim()) {
      blocks.push(this.createBlock(currentBlock.trim(), blockType, position));
    }

    return blocks;
  }

  /**
   * 检测行类型
   */
  private static detectLineType(line: string): ContentBlock['type'] {
    if (/^#+\s/.test(line)) return 'heading';
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return 'list';
    if (/^```|^    /.test(line)) return 'code';
    if (/^>\s/.test(line)) return 'quote';
    return 'paragraph';
  }

  /**
   * 创建内容块
   */
  private static createBlock(content: string, type: ContentBlock['type'], position: number): ContentBlock {
    const block: ContentBlock = {
      id: `block-${position}`,
      type,
      content,
      position
    };

    // 为标题添加级别
    if (type === 'heading') {
      const match = content.match(/^(#+)\s/);
      if (match) {
        block.level = match[1].length;
      }
    }

    return block;
  }

  /**
   * 生成内容摘要
   */
  private static generateExcerpt(text: string, maxLength: number = 200): string {
    if (!text) return '';
    
    // 取前几个段落
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    let excerpt = '';
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed && !/^#+\s/.test(trimmed)) { // 跳过标题
        if (excerpt.length + trimmed.length <= maxLength) {
          excerpt += (excerpt ? ' ' : '') + trimmed;
        } else {
          excerpt += (excerpt ? ' ' : '') + trimmed.substring(0, maxLength - excerpt.length);
          break;
        }
      }
    }
    
    return excerpt.length < text.length ? excerpt + '...' : excerpt;
  }

  /**
   * 统计字数
   */
  private static countWords(text: string): number {
    if (!text) return 0;
    
    // 中文字符数 + 英文单词数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(word => word.trim()).length;
    
    return chineseChars + englishWords;
  }

  /**
   * 辅助方法 - 提取作者
   */
  private static extractAuthor(): string | undefined {
    // 尝试从 meta 标签提取
    const metaAuthor = document.querySelector('meta[name="author"]') as HTMLMetaElement;
    if (metaAuthor?.content) return metaAuthor.content;
    
    const ogAuthor = document.querySelector('meta[property="article:author"]') as HTMLMetaElement;
    if (ogAuthor?.content) return ogAuthor.content;
    
    // 尝试从常见的作者选择器提取
    const authorSelectors = ['.author', '.byline', '.writer', '.post-author', '.article-author'];
    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    
    return undefined;
  }

  /**
   * 辅助方法 - 提取发布时间
   */
  private static extractPublishedTime(): string | undefined {
    // 尝试从 meta 标签提取
    const metaTime = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
    if (metaTime?.content) return metaTime.content;
    
    // 尝试从 time 元素提取
    const timeElement = document.querySelector('time[datetime]') as HTMLTimeElement;
    if (timeElement?.dateTime) return timeElement.dateTime;
    
    return undefined;
  }

  /**
   * 辅助方法 - 检测语言
   */
  private static detectLanguage(): string {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang;
    
    const metaLang = document.querySelector('meta[http-equiv="content-language"]') as HTMLMetaElement;
    if (metaLang?.content) return metaLang.content;
    
    // 简单的中文检测
    const text = document.body.textContent || '';
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    return chineseChars && chineseChars.length > text.length * 0.3 ? 'zh' : 'en';
  }

  /**
   * 辅助方法 - 提取站点名称
   */
  private static extractSiteName(): string {
    const metaSiteName = document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement;
    if (metaSiteName?.content) return metaSiteName.content;
    
    return window.location.hostname;
  }
}

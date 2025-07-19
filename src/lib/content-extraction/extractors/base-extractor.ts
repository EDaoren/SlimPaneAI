/**
 * 内容提取器抽象基类
 * 提供通用的功能和工具方法
 */

import type { 
  ContentExtractor, 
  ContentType, 
  ExtractionOptions, 
  ExtractionResult,
  StandardizedContent,
  ContentBlock,
  ContentMetadata
} from '../types';

export abstract class BaseExtractor implements ContentExtractor {
  abstract readonly type: ContentType;
  
  abstract canHandle(url: string, contentType?: string): boolean;
  abstract extract(url: string, options?: ExtractionOptions): Promise<ExtractionResult>;

  /**
   * 生成内容摘要
   */
  protected generateExcerpt(text: string, maxLength: number = 200): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    // 尝试在句号处截断
    const sentences = text.split(/[.。!！?？]/);
    let excerpt = '';
    
    for (const sentence of sentences) {
      if (excerpt.length + sentence.length <= maxLength) {
        excerpt += sentence + (sentence.includes('。') ? '。' : '.');
      } else {
        break;
      }
    }

    // 如果没有找到合适的句子边界，直接截断
    if (!excerpt) {
      excerpt = text.substring(0, maxLength - 3) + '...';
    }

    return excerpt.trim();
  }

  /**
   * 估算Token数量
   */
  protected estimateTokenCount(text: string): number {
    // 简单的Token估算：
    // 中文：1个字符 ≈ 1个Token
    // 英文：4个字符 ≈ 1个Token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars + otherChars / 4);
  }

  /**
   * 检测语言
   */
  protected detectLanguage(text: string): string {
    if (!text) return 'en';
    
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;
    
    // 如果中文字符占比超过30%，认为是中文
    return chineseChars / totalChars > 0.3 ? 'zh' : 'en';
  }

  /**
   * 清理和标准化文本
   */
  protected cleanText(text: string): string {
    if (!text) return '';

    return text
      // 标准化换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 移除多余的空白字符
      .replace(/[ \t]+/g, ' ')
      // 移除多余的换行符（保留段落分隔）
      .replace(/\n{3,}/g, '\n\n')
      // 移除首尾空白
      .trim();
  }

  /**
   * 将文本分割成内容块
   */
  protected segmentIntoBlocks(text: string): ContentBlock[] {
    if (!text) return [];

    const blocks: ContentBlock[] = [];
    const lines = text.split('\n');
    let currentBlock = '';
    let blockType: ContentBlock['type'] = 'paragraph';
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // 空行，结束当前块
        if (currentBlock) {
          blocks.push(this.createBlock(blockType, currentBlock, position++));
          currentBlock = '';
          blockType = 'paragraph';
        }
        continue;
      }

      // 检测标题
      if (this.isHeading(line)) {
        // 先保存当前块
        if (currentBlock) {
          blocks.push(this.createBlock(blockType, currentBlock, position++));
          currentBlock = '';
        }
        
        blocks.push(this.createBlock('heading', line, position++, this.getHeadingLevel(line)));
        blockType = 'paragraph';
        continue;
      }

      // 检测列表
      if (this.isListItem(line)) {
        if (blockType !== 'list') {
          // 开始新的列表块
          if (currentBlock) {
            blocks.push(this.createBlock(blockType, currentBlock, position++));
            currentBlock = '';
          }
          blockType = 'list';
        }
        currentBlock += (currentBlock ? '\n' : '') + line;
        continue;
      }

      // 检测代码块
      if (this.isCodeBlock(line)) {
        if (blockType !== 'code') {
          if (currentBlock) {
            blocks.push(this.createBlock(blockType, currentBlock, position++));
            currentBlock = '';
          }
          blockType = 'code';
        }
        currentBlock += (currentBlock ? '\n' : '') + line;
        continue;
      }

      // 检测引用
      if (this.isQuote(line)) {
        if (blockType !== 'quote') {
          if (currentBlock) {
            blocks.push(this.createBlock(blockType, currentBlock, position++));
            currentBlock = '';
          }
          blockType = 'quote';
        }
        currentBlock += (currentBlock ? '\n' : '') + line;
        continue;
      }

      // 普通段落
      if (blockType !== 'paragraph') {
        if (currentBlock) {
          blocks.push(this.createBlock(blockType, currentBlock, position++));
          currentBlock = '';
        }
        blockType = 'paragraph';
      }
      
      currentBlock += (currentBlock ? '\n' : '') + line;
    }

    // 保存最后一个块
    if (currentBlock) {
      blocks.push(this.createBlock(blockType, currentBlock, position++));
    }

    return blocks;
  }

  /**
   * 创建内容块
   */
  private createBlock(
    type: ContentBlock['type'], 
    content: string, 
    position: number, 
    level?: number
  ): ContentBlock {
    return {
      id: `block-${position}`,
      type,
      content: content.trim(),
      level,
      position
    };
  }

  /**
   * 检测是否为标题
   */
  private isHeading(line: string): boolean {
    // Markdown风格标题
    if (/^#{1,6}\s/.test(line)) return true;
    
    // 简单的标题检测：短行且可能包含标题特征
    if (line.length < 100 && /^[一二三四五六七八九十\d\.\s]*[^\.\s]/.test(line)) {
      return true;
    }
    
    return false;
  }

  /**
   * 获取标题级别
   */
  private getHeadingLevel(line: string): number {
    const match = line.match(/^(#{1,6})\s/);
    return match ? match[1].length : 1;
  }

  /**
   * 检测是否为列表项
   */
  private isListItem(line: string): boolean {
    return /^[\s]*[-*+•]\s/.test(line) || /^[\s]*\d+\.\s/.test(line);
  }

  /**
   * 检测是否为代码块
   */
  private isCodeBlock(line: string): boolean {
    return /^```/.test(line) || /^    /.test(line);
  }

  /**
   * 检测是否为引用
   */
  private isQuote(line: string): boolean {
    return /^>\s/.test(line);
  }

  /**
   * 构建基础元数据
   */
  protected buildBaseMetadata(url: string, title: string, content: string): ContentMetadata {
    return {
      url,
      title: title || 'Untitled',
      capturedAt: new Date().toISOString(),
      language: this.detectLanguage(content),
      wordCount: this.countWords(content),
      siteName: this.extractSiteName(url)
    };
  }

  /**
   * 统计词数
   */
  private countWords(text: string): number {
    if (!text) return 0;
    
    // 中文按字符数计算，英文按单词数计算
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(word => word.length > 0).length;
    
    return chineseChars + englishWords;
  }

  /**
   * 提取站点名称
   */
  private extractSiteName(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown Site';
    }
  }
}

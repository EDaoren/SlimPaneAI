/**
 * 网页问答引擎
 * 整合内容处理、Prompt生成和AI调用的完整流程
 */

import { ContentProcessor, type ProcessedContent } from './content-processor';
import { PromptGenerator, type QAContext } from './prompt-generator';

export interface QAResult {
  answer: string;
  sources: ContentSource[];
  metadata: {
    processingTime: number;
    tokenCount: number;
    confidence: number;
  };
}

export interface ContentSource {
  blockId: string;
  content: string;
  relevance: number;
}

export interface QAOptions {
  maxTokens?: number;
  language?: 'zh' | 'en';
  includeMetadata?: boolean;
  enableCaching?: boolean;
}

export class WebQAEngine {
  private static contentCache = new Map<string, ProcessedContent>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟

  /**
   * 处理网页问答请求
   */
  static async processQuestion(
    userQuestion: string,
    options: QAOptions = {}
  ): Promise<QAResult> {
    const startTime = Date.now();
    
    try {
      // 1. 内容提取和预处理
      const processedContent = await this.getProcessedContent(options);
      
      // 2. 内容优化
      const optimizedContent = this.optimizeContent(processedContent, options);
      
      // 3. 检测任务类型和语言
      const taskType = PromptGenerator.detectTaskType(userQuestion);
      const language = options.language || this.detectQuestionLanguage(userQuestion);
      
      // 4. 生成Prompt
      const context: QAContext = {
        userQuestion,
        content: optimizedContent,
        language,
        taskType
      };
      
      const prompt = PromptGenerator.generatePrompt(context);
      const tokenCount = PromptGenerator.estimatePromptTokens(context);
      
      // 5. 调用AI（这里返回模拟结果，实际需要集成到现有的AI调用系统）
      const answer = await this.callAI(prompt, options);
      
      // 6. 处理结果
      const sources = this.extractSources(optimizedContent, answer);
      const processingTime = Date.now() - startTime;
      
      return {
        answer,
        sources,
        metadata: {
          processingTime,
          tokenCount,
          confidence: this.calculateConfidence(answer, optimizedContent)
        }
      };
      
    } catch (error) {
      console.error('WebQA processing failed:', error);
      throw new Error(`网页问答处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取处理后的内容（带缓存）
   */
  private static async getProcessedContent(options: QAOptions): Promise<ProcessedContent> {
    const url = window.location.href;
    const cacheKey = `${url}-${Date.now()}`;
    
    // 检查缓存
    if (options.enableCaching && this.contentCache.has(url)) {
      const cached = this.contentCache.get(url)!;
      const cacheAge = Date.now() - new Date(cached.metadata.capturedAt).getTime();
      
      if (cacheAge < this.CACHE_DURATION) {
        console.log('Using cached content');
        return cached;
      }
    }
    
    // 处理新内容
    console.log('Processing new content');
    const content = ContentProcessor.processCurrentPage();
    
    // 计算字数
    content.metadata.wordCount = this.countWords(content.rawText);
    
    // 缓存结果
    if (options.enableCaching) {
      this.contentCache.set(url, content);
      
      // 清理过期缓存
      this.cleanExpiredCache();
    }
    
    return content;
  }

  /**
   * 优化内容长度和质量
   */
  private static optimizeContent(
    content: ProcessedContent, 
    options: QAOptions
  ): ProcessedContent {
    const maxTokens = options.maxTokens || 8000;
    
    // 长度优化
    let optimized = PromptGenerator.optimizeContentLength(content, maxTokens);
    
    // 质量优化：移除重复内容
    optimized = this.removeDuplicateContent(optimized);
    
    // 结构优化：确保逻辑连贯
    optimized = this.optimizeStructure(optimized);
    
    return optimized;
  }

  /**
   * 移除重复内容
   */
  private static removeDuplicateContent(content: ProcessedContent): ProcessedContent {
    const seen = new Set<string>();
    const uniqueBlocks = content.blocks.filter(block => {
      const normalized = block.content.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });

    return {
      ...content,
      blocks: uniqueBlocks,
      rawText: uniqueBlocks.map(b => b.content).join('\n\n')
    };
  }

  /**
   * 优化内容结构
   */
  private static optimizeStructure(content: ProcessedContent): ProcessedContent {
    const blocks = [...content.blocks];
    
    // 确保标题在相关内容之前
    blocks.sort((a, b) => {
      if (a.type === 'heading' && b.type !== 'heading') return -1;
      if (a.type !== 'heading' && b.type === 'heading') return 1;
      return a.position - b.position;
    });

    return {
      ...content,
      blocks,
      rawText: blocks.map(b => b.content).join('\n\n')
    };
  }

  /**
   * 检测问题语言
   */
  private static detectQuestionLanguage(question: string): 'zh' | 'en' {
    const chineseChars = (question.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = question.length;
    
    return (chineseChars / totalChars) > 0.3 ? 'zh' : 'en';
  }

  /**
   * 调用AI（集成点）
   */
  private static async callAI(prompt: string, options: QAOptions): Promise<string> {
    // 这里需要集成到现有的AI调用系统
    // 暂时返回一个标识，表明需要外部处理
    return `[AI_CALL_NEEDED]${prompt}`;
  }

  /**
   * 提取内容来源
   */
  private static extractSources(
    content: ProcessedContent, 
    answer: string
  ): ContentSource[] {
    const sources: ContentSource[] = [];
    
    // 简单的相关性匹配
    content.blocks.forEach(block => {
      const relevance = this.calculateRelevance(block.content, answer);
      if (relevance > 0.3) {
        sources.push({
          blockId: block.id,
          content: block.content.substring(0, 200) + '...',
          relevance
        });
      }
    });

    // 按相关性排序
    sources.sort((a, b) => b.relevance - a.relevance);
    
    return sources.slice(0, 5); // 最多返回5个来源
  }

  /**
   * 计算相关性
   */
  private static calculateRelevance(blockContent: string, answer: string): number {
    const blockWords = new Set(blockContent.toLowerCase().split(/\s+/));
    const answerWords = new Set(answer.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...blockWords].filter(x => answerWords.has(x)));
    const union = new Set([...blockWords, ...answerWords]);
    
    return intersection.size / union.size;
  }

  /**
   * 计算置信度
   */
  private static calculateConfidence(
    answer: string, 
    content: ProcessedContent
  ): number {
    // 基于答案长度、内容匹配度等因素计算置信度
    const answerLength = answer.length;
    const contentLength = content.rawText.length;
    
    // 简单的置信度计算
    let confidence = 0.5;
    
    if (answerLength > 100) confidence += 0.2;
    if (answerLength > 300) confidence += 0.1;
    if (contentLength > 1000) confidence += 0.1;
    if (content.blocks.length > 5) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 计算字数
   */
  private static countWords(text: string): number {
    // 中英文混合字数统计
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length;
    
    return chineseChars + englishWords;
  }

  /**
   * 清理过期缓存
   */
  private static cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [url, content] of this.contentCache.entries()) {
      const cacheAge = now - new Date(content.metadata.capturedAt).getTime();
      if (cacheAge > this.CACHE_DURATION) {
        this.contentCache.delete(url);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats() {
    return {
      size: this.contentCache.size,
      urls: Array.from(this.contentCache.keys())
    };
  }

  /**
   * 清空缓存
   */
  static clearCache(): void {
    this.contentCache.clear();
  }
}

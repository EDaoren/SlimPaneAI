/**
 * 专业的Prompt生成器
 * 基于结构化模板生成高质量的AI对话提示
 */

import type { ProcessedContent } from './content-processor';

export interface PromptTemplate {
  system: string;
  userTemplate: string;
  maxTokens: number;
}

export interface QAContext {
  userQuestion: string;
  content: ProcessedContent;
  language: 'zh' | 'en';
  taskType: 'summarize' | 'question' | 'analyze' | 'extract';
}

export class PromptGenerator {
  private static readonly SYSTEM_PROMPTS = {
    zh: {
      default: `你是一个专业的网页内容分析助手。你的任务是基于提供的网页内容回答用户问题。

核心要求：
1. 仔细阅读和理解网页内容的结构和含义
2. 基于内容事实进行回答，不要编造信息
3. 如果问题无法从内容中找到答案，请明确说明
4. 回答要准确、简洁、有条理
5. 适当引用原文关键信息来支持你的回答
6. 保持客观中立的语调

回答格式：
- 直接回答用户问题
- 必要时提供具体的引用或例子
- 如果内容很长，请提供结构化的总结`,

      summarize: `你是一个专业的内容总结专家。请基于提供的网页内容进行总结。

总结要求：
1. 提取核心观点和关键信息
2. 保持逻辑结构清晰
3. 突出重要细节和数据
4. 使用简洁明了的语言
5. 保持客观性，不添加个人观点

总结格式：
## 核心要点
[列出3-5个主要观点]

## 详细内容
[按逻辑顺序展开说明]

## 关键信息
[重要数据、时间、人物等]`,

      analyze: `你是一个专业的内容分析师。请深入分析提供的网页内容。

分析维度：
1. 内容主题和核心观点
2. 论证逻辑和证据支撑
3. 信息的可靠性和权威性
4. 潜在的偏见或局限性
5. 实际应用价值和意义

分析格式：
## 内容概述
[简要描述内容主题]

## 核心观点
[列出主要论点]

## 分析评价
[深入分析各个维度]

## 结论建议
[总结性评价和建议]`
    },

    en: {
      default: `You are a professional web content analysis assistant. Your task is to answer user questions based on the provided web content.

Core Requirements:
1. Carefully read and understand the structure and meaning of the web content
2. Answer based on factual content, do not fabricate information
3. If questions cannot be answered from the content, clearly state so
4. Provide accurate, concise, and well-organized answers
5. Appropriately cite key information from the original text
6. Maintain an objective and neutral tone

Response Format:
- Directly answer the user's question
- Provide specific quotes or examples when necessary
- If content is lengthy, provide structured summaries`,

      summarize: `You are a professional content summarization expert. Please summarize the provided web content.

Summary Requirements:
1. Extract core viewpoints and key information
2. Maintain clear logical structure
3. Highlight important details and data
4. Use concise and clear language
5. Remain objective without adding personal opinions

Summary Format:
## Key Points
[List 3-5 main points]

## Detailed Content
[Expand in logical order]

## Key Information
[Important data, dates, people, etc.]`,

      analyze: `You are a professional content analyst. Please conduct an in-depth analysis of the provided web content.

Analysis Dimensions:
1. Content theme and core viewpoints
2. Logical reasoning and evidence support
3. Information reliability and authority
4. Potential biases or limitations
5. Practical application value and significance

Analysis Format:
## Content Overview
[Brief description of content theme]

## Core Viewpoints
[List main arguments]

## Analysis & Evaluation
[In-depth analysis of various dimensions]

## Conclusions & Recommendations
[Summary evaluation and suggestions]`
    }
  };

  /**
   * 生成完整的对话提示
   */
  static generatePrompt(context: QAContext): string {
    const { userQuestion, content, language, taskType } = context;
    
    // 选择系统提示
    const systemPrompt = this.getSystemPrompt(language, taskType);
    
    // 生成用户提示
    const userPrompt = this.generateUserPrompt(userQuestion, content, language);
    
    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * 获取系统提示
   */
  private static getSystemPrompt(language: 'zh' | 'en', taskType: string): string {
    const prompts = this.SYSTEM_PROMPTS[language];
    return prompts[taskType as keyof typeof prompts] || prompts.default;
  }

  /**
   * 生成用户提示
   */
  private static generateUserPrompt(
    userQuestion: string, 
    content: ProcessedContent, 
    language: 'zh' | 'en'
  ): string {
    const isZh = language === 'zh';
    
    // 构建元数据部分
    const metaSection = this.buildMetaSection(content, isZh);
    
    // 构建任务部分
    const taskSection = this.buildTaskSection(userQuestion, isZh);
    
    // 构建内容部分
    const contextSection = this.buildContextSection(content, isZh);
    
    return `${metaSection}\n\n${taskSection}\n\n${contextSection}`;
  }

  /**
   * 构建元数据部分
   */
  private static buildMetaSection(content: ProcessedContent, isZh: boolean): string {
    const { metadata } = content;
    const label = isZh ? 'meta' : 'meta';
    
    let metaInfo = `<${label}>
url: ${metadata.url}
title: ${metadata.title}
captured_at: ${metadata.capturedAt}
language: ${metadata.language}`;

    if (metadata.author) {
      metaInfo += `\nauthor: ${metadata.author}`;
    }
    
    if (metadata.publishedTime) {
      metaInfo += `\npublished_time: ${metadata.publishedTime}`;
    }
    
    metaInfo += `\nword_count: ${metadata.wordCount}
</${label}>`;

    return metaInfo;
  }

  /**
   * 构建任务部分
   */
  private static buildTaskSection(userQuestion: string, isZh: boolean): string {
    const label = isZh ? 'task' : 'task';
    const instruction = isZh 
      ? '请基于以下网页内容回答用户问题：' 
      : 'Please answer the user question based on the following web content:';
    
    return `<${label}>
${instruction}

${userQuestion}
</${label}>`;
  }

  /**
   * 构建内容部分
   */
  private static buildContextSection(content: ProcessedContent, isZh: boolean): string {
    const label = isZh ? 'context' : 'context';
    const { blocks } = content;
    
    let contextContent = `<${label}>`;
    
    // 按类型组织内容块
    const groupedBlocks = this.groupBlocksByType(blocks);
    
    let blockIndex = 1;
    for (const [type, typeBlocks] of Object.entries(groupedBlocks)) {
      if (typeBlocks.length === 0) continue;
      
      // 添加类型标题
      const typeTitle = this.getTypeTitle(type, isZh);
      if (typeTitle) {
        contextContent += `\n\n### ${typeTitle}`;
      }
      
      // 添加内容块
      for (const block of typeBlocks) {
        contextContent += `\n\n#### Block ${blockIndex}`;
        contextContent += `\n${block.content}`;
        blockIndex++;
      }
    }
    
    contextContent += `\n</${label}>`;
    
    return contextContent;
  }

  /**
   * 按类型分组内容块
   */
  private static groupBlocksByType(blocks: any[]) {
    const grouped: { [key: string]: any[] } = {
      heading: [],
      paragraph: [],
      list: [],
      code: [],
      quote: []
    };
    
    blocks.forEach(block => {
      if (grouped[block.type]) {
        grouped[block.type].push(block);
      } else {
        grouped.paragraph.push(block);
      }
    });
    
    return grouped;
  }

  /**
   * 获取类型标题
   */
  private static getTypeTitle(type: string, isZh: boolean): string {
    const titles = {
      heading: isZh ? '标题结构' : 'Headings',
      paragraph: isZh ? '正文内容' : 'Main Content',
      list: isZh ? '列表信息' : 'Lists',
      code: isZh ? '代码片段' : 'Code Snippets',
      quote: isZh ? '引用内容' : 'Quotes'
    };
    
    return titles[type as keyof typeof titles] || '';
  }

  /**
   * 检测任务类型
   */
  static detectTaskType(userQuestion: string): 'summarize' | 'question' | 'analyze' | 'extract' {
    const question = userQuestion.toLowerCase();
    
    // 总结类关键词
    const summarizeKeywords = ['总结', '概括', '摘要', 'summarize', 'summary', 'overview'];
    if (summarizeKeywords.some(keyword => question.includes(keyword))) {
      return 'summarize';
    }
    
    // 分析类关键词
    const analyzeKeywords = ['分析', '评价', '评估', 'analyze', 'analysis', 'evaluate', 'assessment'];
    if (analyzeKeywords.some(keyword => question.includes(keyword))) {
      return 'analyze';
    }
    
    // 提取类关键词
    const extractKeywords = ['提取', '找出', '列出', 'extract', 'find', 'list', 'identify'];
    if (extractKeywords.some(keyword => question.includes(keyword))) {
      return 'extract';
    }
    
    // 默认为问答类
    return 'question';
  }

  /**
   * 估算提示长度
   */
  static estimatePromptTokens(context: QAContext): number {
    const prompt = this.generatePrompt(context);
    // 简单估算：平均4个字符一个token
    return Math.ceil(prompt.length / 4);
  }

  /**
   * 优化内容长度
   */
  static optimizeContentLength(
    content: ProcessedContent, 
    maxTokens: number = 8000
  ): ProcessedContent {
    const currentTokens = Math.ceil(content.rawText.length / 4);
    
    if (currentTokens <= maxTokens) {
      return content;
    }
    
    // 需要压缩内容
    const compressionRatio = maxTokens / currentTokens;
    const targetBlocks = Math.floor(content.blocks.length * compressionRatio);
    
    // 优先保留标题和重要段落
    const prioritizedBlocks = content.blocks
      .sort((a, b) => {
        const priorityA = this.getBlockPriority(a);
        const priorityB = this.getBlockPriority(b);
        return priorityB - priorityA;
      })
      .slice(0, targetBlocks);
    
    // 重新排序
    prioritizedBlocks.sort((a, b) => a.position - b.position);
    
    return {
      ...content,
      blocks: prioritizedBlocks,
      rawText: prioritizedBlocks.map(b => b.content).join('\n\n')
    };
  }

  /**
   * 获取内容块优先级
   */
  private static getBlockPriority(block: any): number {
    switch (block.type) {
      case 'heading': return 10;
      case 'paragraph': return 5;
      case 'list': return 7;
      case 'code': return 6;
      case 'quote': return 4;
      default: return 1;
    }
  }
}

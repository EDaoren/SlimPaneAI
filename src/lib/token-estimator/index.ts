/**
 * Token估算器
 * 提供准确的GPT Token计算，支持不同模型的Token计算规则
 */

// 不同模型的Token计算规则
interface ModelTokenRules {
  averageCharsPerToken: number;
  maxTokens: number;
  reservedTokens: number; // 为系统提示和响应预留的Token
}

const MODEL_TOKEN_RULES: { [key: string]: ModelTokenRules } = {
  // OpenAI GPT模型
  'gpt-4': {
    averageCharsPerToken: 4,
    maxTokens: 8192,
    reservedTokens: 1000
  },
  'gpt-4-turbo': {
    averageCharsPerToken: 4,
    maxTokens: 128000,
    reservedTokens: 2000
  },
  'gpt-4o': {
    averageCharsPerToken: 4,
    maxTokens: 128000,
    reservedTokens: 2000
  },
  'gpt-3.5-turbo': {
    averageCharsPerToken: 4,
    maxTokens: 16385,
    reservedTokens: 1000
  },
  'o1-preview': {
    averageCharsPerToken: 4,
    maxTokens: 128000,
    reservedTokens: 5000 // o1模型需要更多Token用于思考
  },
  'o1-mini': {
    averageCharsPerToken: 4,
    maxTokens: 128000,
    reservedTokens: 3000
  },

  // Claude模型
  'claude-3-opus': {
    averageCharsPerToken: 3.5,
    maxTokens: 200000,
    reservedTokens: 2000
  },
  'claude-3-sonnet': {
    averageCharsPerToken: 3.5,
    maxTokens: 200000,
    reservedTokens: 2000
  },
  'claude-3-haiku': {
    averageCharsPerToken: 3.5,
    maxTokens: 200000,
    reservedTokens: 1500
  },
  'claude-3-5-sonnet': {
    averageCharsPerToken: 3.5,
    maxTokens: 200000,
    reservedTokens: 2000
  },

  // Gemini模型
  'gemini-pro': {
    averageCharsPerToken: 4,
    maxTokens: 32768,
    reservedTokens: 1500
  },
  'gemini-pro-vision': {
    averageCharsPerToken: 4,
    maxTokens: 16384,
    reservedTokens: 2000
  },

  // 默认规则
  'default': {
    averageCharsPerToken: 4,
    maxTokens: 8192,
    reservedTokens: 1000
  }
};

export class TokenEstimator {
  /**
   * 估算文本的Token数量
   */
  static estimateTokens(text: string, modelId?: string): number {
    if (!text) return 0;

    const rules = this.getModelRules(modelId);
    
    // 基础字符计算
    let tokenCount = Math.ceil(text.length / rules.averageCharsPerToken);

    // 调整因子：考虑标点符号、空格、特殊字符
    tokenCount = this.applyAdjustmentFactors(text, tokenCount);

    return Math.max(1, Math.round(tokenCount));
  }

  /**
   * 检查内容是否超过模型限制
   */
  static isContentTooLarge(text: string, modelId?: string): boolean {
    const tokenCount = this.estimateTokens(text, modelId);
    const rules = this.getModelRules(modelId);
    const availableTokens = rules.maxTokens - rules.reservedTokens;
    
    return tokenCount > availableTokens;
  }

  /**
   * 获取模型可用的最大Token数
   */
  static getAvailableTokens(modelId?: string): number {
    const rules = this.getModelRules(modelId);
    return rules.maxTokens - rules.reservedTokens;
  }

  /**
   * 截断文本到指定Token数量
   */
  static truncateToTokenLimit(text: string, maxTokens?: number, modelId?: string): string {
    if (!text) return '';

    const rules = this.getModelRules(modelId);
    const targetTokens = maxTokens || (rules.maxTokens - rules.reservedTokens);
    const currentTokens = this.estimateTokens(text, modelId);

    if (currentTokens <= targetTokens) {
      return text;
    }

    // 计算需要保留的字符数
    const targetChars = Math.floor(targetTokens * rules.averageCharsPerToken * 0.9); // 留10%余量
    
    if (text.length <= targetChars) {
      return text;
    }

    // 在句子边界截断
    const truncated = text.substring(0, targetChars);
    const sentenceEnders = ['.', '!', '?', '。', '！', '？', '\n\n'];
    
    let bestCutPoint = targetChars;
    for (const ender of sentenceEnders) {
      const lastIndex = truncated.lastIndexOf(ender);
      if (lastIndex > targetChars * 0.7) { // 至少保留70%的内容
        bestCutPoint = Math.max(bestCutPoint, lastIndex + 1);
      }
    }

    const result = text.substring(0, bestCutPoint).trim();
    return result + (result.endsWith('...') ? '' : '...');
  }

  /**
   * 智能分块：将长文本分成多个Token限制内的块
   */
  static smartChunk(
    text: string, 
    maxTokensPerChunk?: number, 
    modelId?: string,
    overlapTokens: number = 100
  ): string[] {
    if (!text) return [];

    const rules = this.getModelRules(modelId);
    const chunkTokenLimit = maxTokensPerChunk || (rules.maxTokens - rules.reservedTokens - 500);
    const currentTokens = this.estimateTokens(text, modelId);

    // 如果文本不超过限制，直接返回
    if (currentTokens <= chunkTokenLimit) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentChunkTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence, modelId);
      
      // 如果单个句子就超过限制，需要强制分割
      if (sentenceTokens > chunkTokenLimit) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          currentChunkTokens = 0;
        }
        
        // 分割长句子
        const subChunks = this.forceSplitLongText(sentence, chunkTokenLimit, modelId);
        chunks.push(...subChunks);
        continue;
      }

      // 检查是否可以添加到当前块
      if (currentChunkTokens + sentenceTokens <= chunkTokenLimit) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentChunkTokens += sentenceTokens;
      } else {
        // 保存当前块并开始新块
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        // 添加重叠内容
        const overlap = this.getOverlapContent(currentChunk, overlapTokens, modelId);
        currentChunk = overlap + (overlap ? ' ' : '') + sentence;
        currentChunkTokens = this.estimateTokens(currentChunk, modelId);
      }
    }

    // 添加最后一块
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * 获取模型规则
   */
  private static getModelRules(modelId?: string): ModelTokenRules {
    if (!modelId) return MODEL_TOKEN_RULES.default;

    // 精确匹配
    if (MODEL_TOKEN_RULES[modelId]) {
      return MODEL_TOKEN_RULES[modelId];
    }

    // 模糊匹配
    const lowerModelId = modelId.toLowerCase();
    for (const [key, rules] of Object.entries(MODEL_TOKEN_RULES)) {
      if (lowerModelId.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerModelId)) {
        return rules;
      }
    }

    return MODEL_TOKEN_RULES.default;
  }

  /**
   * 应用调整因子
   */
  private static applyAdjustmentFactors(text: string, baseTokenCount: number): number {
    let adjustedCount = baseTokenCount;

    // 中文字符调整（中文字符通常占用更多Token）
    const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseRatio = chineseCharCount / text.length;
    if (chineseRatio > 0.3) {
      adjustedCount *= 1.2; // 中文内容增加20%
    }

    // 代码内容调整
    const codeIndicators = ['function', 'class', 'import', 'const', 'let', 'var', '{', '}', ';'];
    const codeScore = codeIndicators.reduce((score, indicator) => {
      return score + (text.split(indicator).length - 1);
    }, 0);
    
    if (codeScore > text.length / 100) {
      adjustedCount *= 1.15; // 代码内容增加15%
    }

    // 特殊字符调整
    const specialCharCount = (text.match(/[^\w\s\u4e00-\u9fff]/g) || []).length;
    const specialCharRatio = specialCharCount / text.length;
    if (specialCharRatio > 0.1) {
      adjustedCount *= 1.1; // 特殊字符多时增加10%
    }

    return adjustedCount;
  }

  /**
   * 将文本分割成句子
   */
  private static splitIntoSentences(text: string): string[] {
    // 支持中英文句子分割
    const sentenceEnders = /[.!?。！？]+\s*/g;
    const sentences = text.split(sentenceEnders).filter(s => s.trim().length > 0);
    
    // 如果分割结果太少，按段落分割
    if (sentences.length < 3) {
      return text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    }
    
    return sentences;
  }

  /**
   * 强制分割长文本
   */
  private static forceSplitLongText(text: string, maxTokens: number, modelId?: string): string[] {
    const rules = this.getModelRules(modelId);
    const maxChars = Math.floor(maxTokens * rules.averageCharsPerToken * 0.9);
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length);
      
      // 尝试在空格处分割
      if (end < text.length) {
        const spaceIndex = text.lastIndexOf(' ', end);
        if (spaceIndex > start + maxChars * 0.7) {
          end = spaceIndex;
        }
      }
      
      chunks.push(text.substring(start, end).trim());
      start = end;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * 获取重叠内容
   */
  private static getOverlapContent(text: string, overlapTokens: number, modelId?: string): string {
    if (!text || overlapTokens <= 0) return '';
    
    const rules = this.getModelRules(modelId);
    const overlapChars = Math.floor(overlapTokens * rules.averageCharsPerToken);
    
    if (text.length <= overlapChars) return text;
    
    // 从末尾开始，在句子边界处截取
    const candidate = text.substring(text.length - overlapChars);
    const sentenceStart = candidate.search(/[.!?。！？]\s+/);
    
    if (sentenceStart > 0) {
      return candidate.substring(sentenceStart + 1).trim();
    }
    
    return candidate.trim();
  }

  /**
   * 获取Token使用统计
   */
  static getTokenStats(text: string, modelId?: string): {
    totalTokens: number;
    availableTokens: number;
    usagePercentage: number;
    canFit: boolean;
    recommendedAction: string;
  } {
    const totalTokens = this.estimateTokens(text, modelId);
    const availableTokens = this.getAvailableTokens(modelId);
    const usagePercentage = (totalTokens / availableTokens) * 100;
    const canFit = totalTokens <= availableTokens;

    let recommendedAction = '';
    if (usagePercentage > 90) {
      recommendedAction = '内容过长，建议分块处理';
    } else if (usagePercentage > 70) {
      recommendedAction = '内容较长，可能需要优化';
    } else {
      recommendedAction = '内容长度适中';
    }

    return {
      totalTokens,
      availableTokens,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      canFit,
      recommendedAction
    };
  }
}

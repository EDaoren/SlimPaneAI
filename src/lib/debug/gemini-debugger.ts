/**
 * Gemini 调试工具
 * 用于诊断 Gemini API 响应问题
 */

export interface GeminiDebugInfo {
  timestamp: number;
  chunkNumber: number;
  rawChunk: string;
  parsedData: any;
  contentFound: boolean;
  thinkingFound: boolean;
  errors: string[];
}

export class GeminiDebugger {
  private static instance: GeminiDebugger;
  private debugLog: GeminiDebugInfo[] = [];
  private isEnabled = true;

  static getInstance(): GeminiDebugger {
    if (!GeminiDebugger.instance) {
      GeminiDebugger.instance = new GeminiDebugger();
    }
    return GeminiDebugger.instance;
  }

  enable() {
    this.isEnabled = true;
    console.log('🔧 [Gemini Debugger] Enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('🔧 [Gemini Debugger] Disabled');
  }

  logChunk(chunkNumber: number, rawChunk: string, parsedData: any, errors: string[] = []) {
    if (!this.isEnabled) return;

    const debugInfo: GeminiDebugInfo = {
      timestamp: Date.now(),
      chunkNumber,
      rawChunk: rawChunk.substring(0, 1000), // 限制长度
      parsedData: this.sanitizeForLogging(parsedData),
      contentFound: this.hasContent(parsedData),
      thinkingFound: this.hasThinking(parsedData),
      errors
    };

    this.debugLog.push(debugInfo);

    // 保持最近100条记录
    if (this.debugLog.length > 100) {
      this.debugLog = this.debugLog.slice(-100);
    }

    console.log(`🔍 [Gemini Debugger] Chunk ${chunkNumber}:`, {
      hasContent: debugInfo.contentFound,
      hasThinking: debugInfo.thinkingFound,
      errors: debugInfo.errors,
      structure: this.analyzeStructure(parsedData)
    });
  }

  private hasContent(data: any): boolean {
    if (!data?.candidates?.[0]?.content?.parts) return false;
    
    return data.candidates[0].content.parts.some((part: any) => 
      part.text && part.text.trim().length > 0
    );
  }

  private hasThinking(data: any): boolean {
    if (!data?.candidates?.[0]?.content?.parts) return false;
    
    return data.candidates[0].content.parts.some((part: any) => 
      part.thought || part.thinking || part.reasoning || part.thoughtContent
    ) || data.usageMetadata?.thoughtsTokenCount > 0;
  }

  private analyzeStructure(data: any): any {
    if (!data) return null;

    const structure: any = {
      hasError: !!data.error,
      hasCandidates: !!data.candidates,
      candidatesCount: data.candidates?.length || 0,
      hasUsageMetadata: !!data.usageMetadata,
      thoughtsTokenCount: data.usageMetadata?.thoughtsTokenCount || 0
    };

    if (data.candidates?.[0]) {
      const candidate = data.candidates[0];
      structure.candidate = {
        hasContent: !!candidate.content,
        hasFinishReason: !!candidate.finishReason,
        finishReason: candidate.finishReason,
        partsCount: candidate.content?.parts?.length || 0,
        parts: candidate.content?.parts?.map((part: any, index: number) => ({
          index,
          keys: Object.keys(part),
          hasText: !!part.text,
          textLength: part.text?.length || 0,
          hasThought: !!part.thought,
          thoughtLength: part.thought?.length || 0,
          hasThinking: !!part.thinking,
          hasReasoning: !!part.reasoning,
          hasThoughtContent: !!part.thoughtContent
        })) || []
      };
    }

    return structure;
  }

  private sanitizeForLogging(data: any): any {
    if (!data) return data;
    
    // 创建一个简化版本用于日志记录
    const sanitized: any = {
      error: data.error,
      candidatesCount: data.candidates?.length || 0,
      usageMetadata: data.usageMetadata
    };

    if (data.candidates?.[0]) {
      const candidate = data.candidates[0];
      sanitized.candidate = {
        finishReason: candidate.finishReason,
        contentPartsCount: candidate.content?.parts?.length || 0,
        contentSummary: candidate.content?.parts?.map((part: any) => ({
          hasText: !!part.text,
          textPreview: part.text ? part.text.substring(0, 50) + '...' : null,
          hasThought: !!part.thought,
          thoughtPreview: part.thought ? part.thought.substring(0, 50) + '...' : null
        })) || []
      };
    }

    return sanitized;
  }

  getDebugLog(): GeminiDebugInfo[] {
    return [...this.debugLog];
  }

  clearLog() {
    this.debugLog = [];
    console.log('🔧 [Gemini Debugger] Log cleared');
  }

  exportLog(): string {
    return JSON.stringify(this.debugLog, null, 2);
  }

  generateReport(): string {
    const totalChunks = this.debugLog.length;
    const chunksWithContent = this.debugLog.filter(log => log.contentFound).length;
    const chunksWithThinking = this.debugLog.filter(log => log.thinkingFound).length;
    const chunksWithErrors = this.debugLog.filter(log => log.errors.length > 0).length;

    return `
🔍 Gemini Debug Report
=====================
Total chunks: ${totalChunks}
Chunks with content: ${chunksWithContent}
Chunks with thinking: ${chunksWithThinking}
Chunks with errors: ${chunksWithErrors}

Success rate: ${totalChunks > 0 ? ((chunksWithContent / totalChunks) * 100).toFixed(1) : 0}%
Thinking rate: ${totalChunks > 0 ? ((chunksWithThinking / totalChunks) * 100).toFixed(1) : 0}%
Error rate: ${totalChunks > 0 ? ((chunksWithErrors / totalChunks) * 100).toFixed(1) : 0}%

Recent errors:
${this.debugLog
  .filter(log => log.errors.length > 0)
  .slice(-5)
  .map(log => `- Chunk ${log.chunkNumber}: ${log.errors.join(', ')}`)
  .join('\n')}
    `.trim();
  }
}

// 全局调试器实例
export const geminiDebugger = GeminiDebugger.getInstance();

// 在开发环境中自动启用
if (typeof window !== 'undefined' && (window as any).location?.hostname === 'localhost') {
  geminiDebugger.enable();
}

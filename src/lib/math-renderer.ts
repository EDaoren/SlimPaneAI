import katex from 'katex';

interface MathRenderOptions {
  displayMode: boolean;
  throwOnError: boolean;
}

interface CacheEntry {
  html: string;
  timestamp: number;
}

class MathRenderer {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存过期
  private readonly MAX_CACHE_SIZE = 500; // 最大缓存条目数

  constructor() {
    // 清空缓存，确保没有旧的错误缓存
    this.cache.clear();
    // 定期清理过期缓存
    setInterval(() => this.cleanExpiredCache(), 60000); // 每分钟清理一次
  }

  private cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // 如果缓存仍然太大，删除最旧的条目
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  private getCacheKey(math: string, options: MathRenderOptions): string {
    return `${options.displayMode ? 'display' : 'inline'}:${math}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private cleanSvgPaths(html: string): string {
    // 修复SVG路径中可能包含的HTML标签
    return html.replace(/(<path[^>]*d=")([^"]*)(">)/g, (match, start, pathData, end) => {
      // 清理路径数据中的HTML标签和转义字符
      const cleanPathData = pathData
        .replace(/\\u003C[^\\]*\\u003E/g, '') // 移除转义的HTML标签
        .replace(/<[^>]*>/g, '') // 移除普通HTML标签
        .replace(/&lt;[^&]*&gt;/g, '') // 移除HTML实体编码的标签
        .replace(/\s+/g, ' ') // 规范化空格
        .trim();

      return start + cleanPathData + end;
    });
  }

  renderMath(math: string, options: MathRenderOptions): string {
    const cacheKey = this.getCacheKey(math, options);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // 更新时间戳
      cached.timestamp = Date.now();
      return cached.html;
    }

    try {
      // 清理输入的数学公式，移除可能的HTML标签
      const cleanMath = math.trim().replace(/<[^>]*>/g, '');

      const rendered = katex.renderToString(cleanMath, {
        displayMode: options.displayMode,
        throwOnError: false,
        trust: false,
        strict: false,
        fleqn: false,
        leqno: false,
        colorIsTextColor: false,
        maxSize: Infinity,
        maxExpand: 1000,
        globalGroup: false,
        output: 'html'
      });

      // 清理渲染结果，确保SVG路径数据不包含HTML标签
      const cleanRendered = this.cleanSvgPaths(rendered);

      this.cache.set(cacheKey, {
        html: cleanRendered,
        timestamp: Date.now()
      });

      return cleanRendered;
    } catch (e) {
      const errorHtml = `<span class="math-error">${options.displayMode ? '$$' : '$'}${this.escapeHtml(math)}${options.displayMode ? '$$' : '$'}</span>`;

      // 也缓存错误结果，避免重复计算
      this.cache.set(cacheKey, {
        html: errorHtml,
        timestamp: Date.now()
      });

      return errorHtml;
    }
  }

  // 批量渲染数学公式，使用 requestIdleCallback 优化性能
  async renderMathBatch(mathExpressions: Array<{ math: string; options: MathRenderOptions }>): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < mathExpressions.length; i++) {
      const { math, options } = mathExpressions[i];
      
      // 使用 requestIdleCallback 或 setTimeout 让出控制权
      if (i > 0 && i % 5 === 0) {
        await new Promise(resolve => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(resolve);
          } else {
            setTimeout(resolve, 0);
          }
        });
      }
      
      results.push(this.renderMath(math, options));
    }
    
    return results;
  }

  // 检查文本是否包含数学公式
  hasMathFormulas(content: string): boolean {
    return /\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\\?\[[\s\S]*?\\\\?\]|\\\\?\(.*?\\\\?\)/.test(content);
  }

  // 获取缓存统计信息
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      expiryTime: this.CACHE_EXPIRY
    };
  }

  // 清空缓存
  clearCache() {
    this.cache.clear();
  }
}

// 单例实例
export const mathRenderer = new MathRenderer();

// 导出类型
export type { MathRenderOptions };

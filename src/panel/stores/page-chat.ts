import { writable } from 'svelte/store';

/**
 * 页面元数据接口
 */
interface PageMetadata {
  author?: string;
  publishedTime?: string;
  description?: string;
  keywords?: string[];
  [key: string]: unknown;
}

/**
 * 内容块接口
 */
interface ContentBlock {
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * 网页聊天状态管理
 */
interface PageChatState {
  enabled: boolean;
  currentPageContent: string | null;
  currentPageTitle: string | null;
  currentPageUrl: string | null;
  currentPageMetadata: PageMetadata | null;
  currentPageBlocks: ContentBlock[] | null;

  // 提取状态
  status: 'idle' | 'extracting' | 'success' | 'failed';
  isExtracting: boolean; // 保留向后兼容
  error: string | null;

  // 重试相关
  lastAttempt: number | null;
  attemptCount: number;

  // 防重复抓取
  lastExtractedUrl: string | null;
  lastExtractedTime: number | null;
}

/**
 * SPA导航选项
 */
interface SPANavigationOptions {
  isSPA?: boolean;
  source?: string;
  oldUrl?: string;
}

const initialState: PageChatState = {
  enabled: false,
  currentPageContent: null,
  currentPageTitle: null,
  currentPageUrl: null,
  currentPageMetadata: null,
  currentPageBlocks: null,

  status: 'idle',
  isExtracting: false,
  error: null,

  lastAttempt: null,
  attemptCount: 0,

  // 防重复抓取
  lastExtractedUrl: null,
  lastExtractedTime: null,
};

// 防重复抓取的时间窗口（毫秒）
const EXTRACT_COOLDOWN = 2000;

/**
 * 页面聊天状态管理 Store
 *
 * 提供网页内容自动抓取功能，支持：
 * - 开关启用时自动抓取
 * - 插件重载后自动恢复
 * - URL变化时自动抓取（包括SPA路由）
 * - 发送消息前内容新鲜度检查
 * - 防重复抓取机制
 */

/**
 * 检查是否是特殊页面URL（不支持内容提取）
 */
function isSpecialPageUrl(url: string): boolean {
  if (!url) return true;

  // 浏览器内部页面
  const browserProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'edge-extension://',
    'moz://',
    'moz-extension://',
    'about:',
    'view-source:',
    'file://',
    'devtools://',
    'data:',
  ];

  if (browserProtocols.some((protocol) => url.startsWith(protocol))) {
    return true;
  }

  // 特殊页面
  const specialPages = [
    'newtab',
    'extensions',
    'settings',
    'history',
    'downloads',
    'bookmarks',
    'flags',
    'version',
    'blank',
    'home',
    'config',
  ];

  // 检查URL是否包含特殊页面关键词
  const urlLower = url.toLowerCase();
  if (
    specialPages.some(
      (page) =>
        urlLower.includes(`/${page}`) ||
        urlLower.includes(`/${page}.html`) ||
        urlLower.includes(`about:${page}`)
    )
  ) {
    return true;
  }

  return false;
}

/**
 * 规范化URL用于比较
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 移除fragment和一些查询参数
    urlObj.hash = '';
    // 可以根据需要移除特定的查询参数
    return urlObj.href;
  } catch {
    return url;
  }
}

/**
 * 提取响应接口
 */
interface ExtractionResponse {
  success: boolean;
  content?: string;
  title?: string;
  url?: string;
  metadata?: PageMetadata;
  blocks?: ContentBlock[];
  error?: string;
}

function createPageChatStore() {
  const { subscribe, set, update } = writable<PageChatState>(initialState);

  /**
   * 获取用户友好的错误消息
   */
  function getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return '页面内容提取失败，请尝试刷新页面后重试';
    }

    const message = error.message;
    if (message.includes('Could not establish connection')) {
      return '无法连接到页面，请刷新页面后重试';
    }
    if (message.includes('chrome://') || message.includes('browser internal pages')) {
      return '无法提取浏览器内部页面的内容';
    }
    if (message.includes('Extension context invalidated')) {
      return '扩展已更新，请刷新页面后重试';
    }

    return '页面内容提取失败，请尝试刷新页面后重试';
  }

  /**
   * 更新提取成功状态
   */
  function updateExtractionSuccess(response: ExtractionResponse, timestamp: number): void {
    const extractedUrl = normalizeUrl(response.url || '');
    update(state => ({
      ...state,
      currentPageContent: response.content || null,
      currentPageTitle: response.title || 'Unknown Page',
      currentPageUrl: response.url || '',
      currentPageMetadata: response.metadata || null,
      currentPageBlocks: response.blocks || null,
      status: 'success' as const,
      isExtracting: false,
      error: null,
      lastExtractedUrl: extractedUrl,
      lastExtractedTime: timestamp
    }));
  }

  /**
   * 更新提取失败状态
   */
  function updateExtractionFailure(response: ExtractionResponse | null, errorMessage: string): void {
    update(state => ({
      ...state,
      currentPageContent: null,
      currentPageTitle: response?.title || 'Unknown Page',
      currentPageUrl: response?.url || '',
      status: 'failed' as const,
      isExtracting: false,
      error: errorMessage
    }));
  }

  /**
   * 提取当前页面内容
   */
  async function extractCurrentPageContent(forceExtract = false) {
    const now = Date.now();

    // 检查是否需要防重复抓取
    let shouldSkip = false;
    update(state => {
      if (!forceExtract && state.lastExtractedTime && state.lastExtractedUrl) {
        const timeSinceLastExtract = now - state.lastExtractedTime;
        if (timeSinceLastExtract < EXTRACT_COOLDOWN) {
          shouldSkip = true;
        }
      }
      return state;
    });

    if (shouldSkip) {
      return;
    }

    try {
      // 更新状态：开始提取
      update(state => ({
        ...state,
        status: 'extracting',
        isExtracting: true,
        error: null,
        lastAttempt: now,
        attemptCount: state.attemptCount + 1
      }));
      // 通过background script获取当前活动标签页
      const response = await chrome.runtime.sendMessage({
        type: 'extract-page-content'
      });

      if (response?.success) {
        if (response.content) {
          updateExtractionSuccess(response, now);
        } else {
          updateExtractionFailure(response, '当前页面不支持内容提取');
        }
      } else {
        throw new Error(response?.error || '页面内容提取失败');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      updateExtractionFailure(null, errorMessage);
    }
  }



  return {
    subscribe,

    /**
     * 初始化页面聊天状态（从存储中恢复）
     */
    initialize: async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get-storage' });
        const pageChatEnabled = response.pageChatEnabled || false;

        update(state => ({
          ...state,
          enabled: pageChatEnabled
        }));

        // 如果页面聊天之前是开启的，自动抓取当前页面内容
        if (pageChatEnabled) {
          // 延迟一点时间确保页面完全加载
          setTimeout(() => {
            extractCurrentPageContent(false);
          }, 1000);
        }
      } catch (error) {
        console.error('SlimPaneAI: Failed to initialize page chat state:', error);
      }
    },

    /**
     * 切换网页聊天模式
     */
    toggle: async () => {
      let shouldExtract = false;
      let newEnabled = false;

      // 先更新状态
      update(state => {
        newEnabled = !state.enabled;
        shouldExtract = newEnabled;

        return {
          ...state,
          enabled: newEnabled,
          error: null
        };
      });

      // 持久化状态到 Chrome 存储
      try {
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: {
            pageChatEnabled: newEnabled
          }
        });
        // 等待一小段时间确保存储操作完成
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        // 即使存储失败，也继续尝试提取内容（用户体验优先）
      }

      // 如果需要启用，异步提取内容（即使存储失败也尝试）
      if (shouldExtract) {
        try {
          await extractCurrentPageContent(true); // 强制提取
        } catch (error) {
          // 静默处理提取失败
        }
      }
    },

    /**
     * 设置启用状态
     */
    setEnabled: async (enabled: boolean) => {
      let shouldExtract = false;

      // 先更新状态
      update(state => {
        shouldExtract = enabled && !state.enabled;

        return {
          ...state,
          enabled,
          error: null
        };
      });

      // 持久化状态到 Chrome 存储
      try {
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: {
            pageChatEnabled: enabled
          }
        });
        console.log('SlimPaneAI: Page chat status saved to storage:', enabled);

        // 等待一小段时间确保存储操作完成
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('SlimPaneAI: Failed to save page chat status:', error);
        // 如果保存失败，不要继续提取内容
        return;
      }

      // 如果需要启用，异步提取内容
      if (shouldExtract) {
        await extractCurrentPageContent(true); // 强制提取
      }
    },

    /**
     * 设置页面内容
     */
    setPageContent: (content: string, title: string, url: string, metadata?: any, blocks?: any[]) => {
      update(state => ({
        ...state,
        currentPageContent: content,
        currentPageTitle: title,
        currentPageUrl: url,
        currentPageMetadata: metadata,
        currentPageBlocks: blocks || null,
        isExtracting: false,
        error: null
      }));
    },

    /**
     * 设置提取状态
     */
    setExtracting: (isExtracting: boolean) => {
      update(state => ({
        ...state,
        isExtracting,
        error: isExtracting ? null : state.error
      }));
    },

    /**
     * 设置错误
     */
    setError: (error: string) => {
      update(state => ({
        ...state,
        error,
        isExtracting: false
      }));
    },

    /**
     * 清除状态
     */
    clear: () => {
      set(initialState);
    },

    /**
     * 刷新页面内容
     */
    refresh: async () => {
      let shouldExtract = false;

      // 检查是否需要提取
      update(state => {
        shouldExtract = state.enabled;
        return state;
      });

      // 如果启用了，异步提取内容
      if (shouldExtract) {
        await extractCurrentPageContent();
      }
    },



    /**
     * 检查URL变化并自动抓取内容
     */
    checkAndExtractIfNeeded: async (
      newUrl: string,
      newTitle?: string,
      options?: SPANavigationOptions
    ): Promise<void> => {
      // 检查是否启用了页面聊天
      let shouldExtract = false;
      let currentUrl = '';

      update(state => {
        if (!state.enabled) {
          return state;
        }

        // 检查是否是特殊页面
        if (isSpecialPageUrl(newUrl)) {
          return {
            ...state,
            currentPageContent: null,
            currentPageTitle: newTitle || 'Special Page',
            currentPageUrl: newUrl,
            status: 'failed',
            error: '当前页面不支持内容提取'
          };
        }

        const normalizedNewUrl = normalizeUrl(newUrl);
        const normalizedCurrentUrl = state.lastExtractedUrl ? normalizeUrl(state.lastExtractedUrl) : '';

        if (normalizedNewUrl !== normalizedCurrentUrl) {
          shouldExtract = true;
          currentUrl = newUrl;
        }

        return state;
      });

      if (shouldExtract) {
        // SPA应用需要更长的延迟确保内容加载完成
        const delay = options?.isSPA ?
          (options.source === 'dom-mutation' ? 1000 : 800) : 500;

        setTimeout(() => {
          extractCurrentPageContent(true);
        }, delay);
      }
    },

    /**
     * 检查内容是否需要更新（用于发送消息前检查）
     */
    checkContentFreshness: async (currentUrl: string): Promise<boolean> => {
      return new Promise((resolve) => {
        update(state => {
          if (!state.enabled) {
            resolve(true); // 未启用页面聊天，内容总是"新鲜"的
            return state;
          }

          // 检查是否是特殊页面
          if (isSpecialPageUrl(currentUrl)) {
            resolve(false); // 特殊页面没有内容
            return state;
          }

          const normalizedCurrentUrl = normalizeUrl(currentUrl);
          const normalizedStoredUrl = state.lastExtractedUrl ? normalizeUrl(state.lastExtractedUrl) : '';

          if (normalizedCurrentUrl !== normalizedStoredUrl) {
            resolve(false); // 内容不新鲜
          } else {
            resolve(true); // 内容新鲜
          }

          return state;
        });
      });
    },

    /**
     * 强制刷新内容（忽略防重复机制）
     */
    forceRefresh: async () => {
      await extractCurrentPageContent(true);
    }
  };
}





/**
 * 生成专业的网页问答Prompt
 */
export function generateWebQAPrompt(userQuestion: string, state: PageChatState): string {
  if (!state.currentPageContent || !state.currentPageMetadata) {
    return userQuestion;
  }

  try {
    // 检测任务类型和语言
    const taskType = detectTaskType(userQuestion);
    const language = detectQuestionLanguage(userQuestion);

    // 生成结构化Prompt
    const prompt = generateStructuredPrompt(userQuestion, state, language, taskType);

    return prompt;
  } catch (error) {
    console.error('SlimPaneAI: Prompt生成失败:', error);
    // 回退到简单模式
    return `基于以下网页内容回答问题：

标题：${state.currentPageTitle}
网址：${state.currentPageUrl}

内容：
${state.currentPageContent}

---

用户问题：${userQuestion}`;
  }
}

/**
 * 检测任务类型
 */
function detectTaskType(userQuestion: string): string {
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
 * 生成结构化Prompt
 */
function generateStructuredPrompt(
  userQuestion: string,
  state: PageChatState,
  language: string,
  taskType: string
): string {
  const isZh = language === 'zh';

  // 系统提示
  const systemPrompt = getSystemPrompt(isZh, taskType);

  // 元数据部分
  const metaSection = buildMetaSection(state, isZh);

  // 任务部分
  const taskSection = buildTaskSection(userQuestion, isZh);

  // 内容部分
  const contextSection = buildContextSection(state, isZh);

  return `${systemPrompt}\n\n${metaSection}\n\n${taskSection}\n\n${contextSection}`;
}

/**
 * 获取系统提示
 */
function getSystemPrompt(isZh: boolean, taskType: string): string {
  if (isZh) {
    if (taskType === 'summarize') {
      return `你是一个专业的内容总结专家。请基于提供的网页内容进行总结。

总结要求：
1. 提取核心观点和关键信息
2. 保持逻辑结构清晰
3. 突出重要细节和数据
4. 使用简洁明了的语言
5. 保持客观性，不添加个人观点`;
    } else if (taskType === 'analyze') {
      return `你是一个专业的内容分析师。请深入分析提供的网页内容。

分析维度：
1. 内容主题和核心观点
2. 论证逻辑和证据支撑
3. 信息的可靠性和权威性
4. 潜在的偏见或局限性
5. 实际应用价值和意义`;
    } else {
      return `你是一个专业的网页内容分析助手。你的任务是基于提供的网页内容回答用户问题。

核心要求：
1. 仔细阅读和理解网页内容的结构和含义
2. 基于内容事实进行回答，不要编造信息
3. 如果问题无法从内容中找到答案，请明确说明
4. 回答要准确、简洁、有条理
5. 适当引用原文关键信息来支持你的回答
6. 保持客观中立的语调`;
    }
  } else {
    return `You are a professional web content analysis assistant. Your task is to answer user questions based on the provided web content.

Core Requirements:
1. Carefully read and understand the structure and meaning of the web content
2. Answer based on factual content, do not fabricate information
3. If questions cannot be answered from the content, clearly state so
4. Provide accurate, concise, and well-organized answers
5. Appropriately cite key information from the original text
6. Maintain an objective and neutral tone`;
  }
}

/**
 * 构建元数据部分
 */
function buildMetaSection(state: PageChatState, isZh: boolean): string {
  const metadata = state.currentPageMetadata || {};
  const label = 'meta';

  let metaInfo = `<${label}>
url: ${state.currentPageUrl}
title: ${state.currentPageTitle}
captured_at: ${metadata.capturedAt || new Date().toISOString()}
language: ${metadata.language || 'unknown'}`;

  if (metadata.author) {
    metaInfo += `\nauthor: ${metadata.author}`;
  }

  if (metadata.publishedTime) {
    metaInfo += `\npublished_time: ${metadata.publishedTime}`;
  }

  const wordCount = countWords(state.currentPageContent || '');
  metaInfo += `\nword_count: ${wordCount}
</${label}>`;

  return metaInfo;
}

/**
 * 构建任务部分
 */
function buildTaskSection(userQuestion: string, isZh: boolean): string {
  const label = 'task';
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
function buildContextSection(state: PageChatState, isZh: boolean): string {
  const label = 'context';
  const content = state.currentPageContent || '';
  const blocks = state.currentPageBlocks || [];

  let contextContent = `<${label}>`;

  if (blocks.length > 0) {
    // 使用结构化的内容块
    let blockIndex = 1;
    for (const block of blocks.slice(0, 20)) { // 限制块数量
      contextContent += `\n\n#### Block ${blockIndex}`;
      contextContent += `\n${block.content}`;
      blockIndex++;
    }
  } else {
    // 使用原始内容
    contextContent += `\n\n${content}`;
  }

  contextContent += `\n</${label}>`;

  return contextContent;
}

/**
 * 检测问题语言
 */
function detectQuestionLanguage(question: string): 'zh' | 'en' {
  const chineseChars = (question.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = question.length;

  return (chineseChars / totalChars) > 0.3 ? 'zh' : 'en';
}

/**
 * 计算字数
 */
function countWords(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length;

  return chineseChars + englishWords;
}

export const pageChatStore = createPageChatStore();

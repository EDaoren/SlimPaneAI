import { writable } from 'svelte/store';

/**
 * 网页聊天状态管理
 */
interface PageChatState {
  enabled: boolean;
  currentPageContent: string | null;
  currentPageTitle: string | null;
  currentPageUrl: string | null;
  currentPageMetadata: any | null;
  currentPageBlocks: any[] | null;
  isExtracting: boolean;
  error: string | null;
}

const initialState: PageChatState = {
  enabled: false,
  currentPageContent: null,
  currentPageTitle: null,
  currentPageUrl: null,
  currentPageMetadata: null,
  currentPageBlocks: null,
  isExtracting: false,
  error: null
};

function createPageChatStore() {
  const { subscribe, set, update } = writable<PageChatState>(initialState);

  /**
   * 提取当前页面内容
   */
  async function extractCurrentPageContent() {
    console.log('SlimPaneAI: extractCurrentPageContent called');
    try {
      // 设置提取状态
      update(state => ({ ...state, isExtracting: true, error: null }));
      console.log('SlimPaneAI: Extraction state set to true');

      // 通过background script获取当前活动标签页
      console.log('SlimPaneAI: Requesting tab info from background...');
      const response = await chrome.runtime.sendMessage({
        type: 'extract-page-content'
      });
      console.log('SlimPaneAI: Background response:', response);

      if (response?.success && response.content) {
        update(state => ({
          ...state,
          currentPageContent: response.content,
          currentPageTitle: response.title || 'Unknown Page',
          currentPageUrl: response.url || '',
          currentPageMetadata: response.metadata,
          currentPageBlocks: response.blocks,
          isExtracting: false,
          error: null
        }));
      } else {
        throw new Error(response?.error || 'Content extraction failed');
      }
    } catch (error) {
      console.error('SlimPaneAI: Content extraction failed:', error);

      // 提供更友好的错误信息
      let errorMessage = 'Content extraction failed';

      if (error instanceof Error) {
        if (error.message.includes('Could not establish connection')) {
          errorMessage = 'Cannot connect to page, please refresh and try again';
        } else if (error.message.includes('chrome://') || error.message.includes('browser internal pages')) {
          errorMessage = 'Cannot extract content from browser internal pages';
        } else if (error.message.includes('Extension context invalidated')) {
          errorMessage = 'Extension updated, please refresh page and try again';
        } else {
          errorMessage = error.message;
        }
      }

      update(state => ({
        ...state,
        isExtracting: false,
        error: errorMessage
      }));
    }
  }

  return {
    subscribe,
    
    /**
     * 切换网页聊天模式
     */
    toggle: async () => {
      console.log('SlimPaneAI: Toggle called');
      let shouldExtract = false;

      // 先更新状态
      update(state => {
        const newEnabled = !state.enabled;
        shouldExtract = newEnabled;
        console.log('SlimPaneAI: State updated, enabled:', newEnabled);

        return {
          ...state,
          enabled: newEnabled,
          error: null
        };
      });

      // 如果需要启用，异步提取内容
      if (shouldExtract) {
        console.log('SlimPaneAI: Starting content extraction');
        try {
          await extractCurrentPageContent();
          console.log('SlimPaneAI: Content extraction completed');
        } catch (error) {
          console.error('SlimPaneAI: Content extraction failed:', error);
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

      // 如果需要启用，异步提取内容
      if (shouldExtract) {
        await extractCurrentPageContent();
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
        currentPageBlocks: blocks,
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

    console.log('SlimPaneAI: 生成专业Prompt');
    console.log('SlimPaneAI: 任务类型:', taskType);
    console.log('SlimPaneAI: 检测语言:', language);

    // 生成结构化Prompt
    const prompt = generateStructuredPrompt(userQuestion, state, language, taskType);

    console.log('SlimPaneAI: 生成的Prompt长度:', prompt.length);

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

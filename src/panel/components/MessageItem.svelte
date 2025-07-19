<script lang="ts">
  import { onMount, onDestroy, afterUpdate, tick } from 'svelte';
  import type { Message } from '@/types';
  import { renderMarkdown, highlightCodeBlocks, hasUnhighlightedCodeBlocks } from '@/lib/markdown-renderer';
  import { settingsStore } from '../stores/settings';
  import { t } from '@/lib/i18n';
  import { supportsReasoning, getModelDisplayName } from '@/lib/model-capabilities';

  // 导入 highlightjs-copy 的CSS样式
  import 'highlightjs-copy/dist/highlightjs-copy.min.css';

  export let message: Message;

  let contentElement: HTMLElement;
  let userContentElement: HTMLElement;
  let messageElement: HTMLElement;
  let processedContent = '';
  let isProcessing = false;
  let lastProcessedContent = '';
  let isVisible = false;
  let codeBlockCounter = 0;

  // 思考过程展开状态管理
  let expandedReasoningIds = new Set<string>();

  // 初始化时，如果消息有思考过程，默认展开
  $: if (message.reasoning && message.reasoning.trim() && !expandedReasoningIds.has(message.id)) {
    expandedReasoningIds.add(message.id);
    expandedReasoningIds = new Set(expandedReasoningIds);
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 思考过程展开/折叠管理
  function toggleReasoning(messageId: string) {
    if (expandedReasoningIds.has(messageId)) {
      expandedReasoningIds.delete(messageId);
    } else {
      expandedReasoningIds.add(messageId);
    }
    expandedReasoningIds = new Set(expandedReasoningIds); // 触发响应式更新
  }

  function isReasoningExpanded(messageId: string): boolean {
    return expandedReasoningIds.has(messageId);
  }

  // 格式化思考过程内容
  function formatReasoning(reasoning: string): string {
    if (!reasoning) return '';

    // 简单的格式化：保留换行，转义HTML
    return reasoning
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
      .replace(/\*(.*?)\*/g, '<em>$1</em>'); // 斜体
  }



  // 为不同模型生成头像
  function getModelAvatar(modelId?: string) {
    if (!modelId) {
      return {
        bg: '#6b7280',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }

    const modelLower = modelId.toLowerCase();

    // GPT 系列 - 绿色
    if (modelLower.includes('gpt')) {
      return {
        bg: '#10b981',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }

    // Claude 系列 - 橙色
    if (modelLower.includes('claude')) {
      return {
        bg: '#f59e0b',
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
      };
    }

    // Gemini 系列 - 蓝色
    if (modelLower.includes('gemini')) {
      return {
        bg: '#3b82f6',
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
      };
    }

    // o1 系列 - 紫色
    if (modelLower.includes('o1')) {
      return {
        bg: '#8b5cf6',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }

    // 默认 - 灰色
    return {
      bg: '#6b7280',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
    };
  }



  function formatContent(content: string): string {
    if (!content) return '';

    // 使用新的markdown渲染器，包含数学公式
    return renderMarkdown(content, { enableMath: true });
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }





  // 防抖处理内容更新
  let contentUpdateTimer: number;
  let highlightTimer: number;
  let needsHighlighting = false;
  let lastContentLength = 0;

  function updateProcessedContent() {
    if (isProcessing || message.content === lastProcessedContent) {
      return;
    }

    // 如果内容为空，直接返回
    if (!message.content) {
      processedContent = '';
      lastProcessedContent = message.content;
      return;
    }

    isProcessing = true;
    lastProcessedContent = message.content;

    try {
      // 统一使用 markdown 渲染器处理所有内容（包括数学公式）
      processedContent = renderMarkdown(message.content, { enableMath: true });

      // 检查内容是否包含代码块
      const hasCodeBlocks = message.content.includes('```');
      if (hasCodeBlocks) {
        needsHighlighting = true;

        // 智能防抖：根据内容变化量调整延迟
        const contentLength = message.content.length;
        const contentGrowth = contentLength - lastContentLength;
        lastContentLength = contentLength;

        // 如果内容增长很少，可能是流式输出接近结束
        const delay = contentGrowth < 50 ? 100 : 200;

        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => {
          if (needsHighlighting) {
            const targetElement = message.type === 'assistant' ? contentElement : userContentElement;
            if (targetElement && hasUnhighlightedCodeBlocks(targetElement)) {
              highlightCodeBlocks(targetElement);
              needsHighlighting = false;
            }
          }
        }, delay);
      } else {
        // 如果没有代码块，确保清除高亮标记
        needsHighlighting = false;
      }

    } catch (error) {
      // 出错时回退到基本格式化
      console.error('Error processing message content:', error);
      processedContent = formatContent(message.content);
    } finally {
      isProcessing = false;
    }
  }

  // 监听消息内容变化
  $: if (message.content !== lastProcessedContent) {
    updateProcessedContent();
  }

  onMount(() => {
    // 设置 Intersection Observer 来检测可见性
    if ('IntersectionObserver' in window && messageElement) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;

            // 当元素变为可见且还没有处理过内容时，立即处理
            if (isVisible && !wasVisible && message.content && !processedContent) {
              updateProcessedContent();
            }
          });
        },
        {
          rootMargin: '100px', // 提前100px开始渲染
          threshold: 0.1
        }
      );

      observer.observe(messageElement);

      return () => {
        observer.disconnect();
      };
    } else {
      // 回退方案：直接更新内容
      isVisible = true;
      updateProcessedContent();
    }
  });

  // 在DOM更新后进行最终的代码高亮
  afterUpdate(() => {
    if (needsHighlighting) {
      const targetElement = message.type === 'assistant' ? contentElement : userContentElement;
      if (targetElement && hasUnhighlightedCodeBlocks(targetElement)) {
        // 立即高亮，用于处理非流式内容或最终状态
        highlightCodeBlocks(targetElement);
        needsHighlighting = false;
      }
    }
  });

  // 清理定时器
  onDestroy(() => {
    clearTimeout(contentUpdateTimer);
    clearTimeout(highlightTimer);
  });
</script>

<div class="message-item" style="margin-bottom: var(--message-spacing);" bind:this={messageElement}>
  {#if message.type === 'assistant'}
    <!-- Assistant Message - Left aligned with nickname -->
    <div style="display: flex; gap: 0.5rem;">
      <!-- Model Avatar -->
      <div style="flex-shrink: 0;">
        {#if message.model}
          {@const avatar = getModelAvatar(message.model)}
          <div style="width: 2rem; height: 2rem; background-color: {avatar.bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg style="width: 1rem; height: 1rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{avatar.icon}" />
            </svg>
          </div>
        {:else}
          <div style="width: 2rem; height: 2rem; background-color: #6b7280; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg style="width: 1rem; height: 1rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        {/if}
      </div>
      <div style="flex: 1; min-width: 0;">
        <!-- Model name as nickname -->
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
          <span style="font-weight: 500; font-size: 0.875rem; color: #111827;">
            {getModelDisplayName(message.model)}
          </span>

          <span style="font-size: 0.75rem; color: #6b7280;">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <!-- Message content -->
        <!-- 思考过程（如果存在） -->
        {#if message.reasoning && message.reasoning.trim()}
          <div class="reasoning-section">
            <div class="reasoning-header">
              <span class="reasoning-icon">🧠</span>
              <span class="reasoning-title">{$t('chat.reasoning')}</span>
              <button
                class="reasoning-toggle"
                on:click={() => toggleReasoning(message.id)}
                aria-label="Toggle reasoning visibility"
              >
                {isReasoningExpanded(message.id) ? '▼' : '▶'}
              </button>
            </div>
            {#if isReasoningExpanded(message.id)}
              <div class="reasoning-content">
                {@html formatReasoning(message.reasoning)}
              </div>
            {/if}
          </div>
        {/if}

        <!-- 主要回答内容（只有在有内容或思考状态时才显示bubble） -->
        {#if message.content.trim() || (supportsReasoning(message.model) && message.isThinking)}
          <div class="assistant-message-bubble">
            <div class="message-content" bind:this={contentElement}>
              {#if message.content.trim()}
                {@html processedContent}
              {:else if supportsReasoning(message.model) && message.isThinking}
                <span style="color: #9ca3af; font-style: italic;">{$t('chat.thinking')}</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- User Message - Simple right aligned -->
    <div style="display: flex; justify-content: flex-end;">
      <div style="max-width: 75%; background: var(--message-user-bg); color: var(--message-user-text); padding: var(--message-padding); border-radius: 1rem; transition: background 0.2s ease, color 0.2s ease;">
        <div class="message-content" bind:this={userContentElement}>
          {#if message.content.trim()}
            {@html processedContent}
          {:else}
            <span style="opacity: 0.7; font-style: italic;">{$t('chat.emptyMessage')}</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>


  .assistant-message-bubble {
    background: var(--message-assistant-bg);
    color: var(--message-assistant-text);
    border: 1px solid var(--message-assistant-border);
    border-radius: 1rem;
    padding: var(--message-padding);
    width: fit-content;
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    overflow: visible;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }



  .message-content {
    font-size: var(--font-size-base);
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    max-width: 100%;
    overflow: visible;
  }

  .message-content :global(code) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: monospace;
  }



  .message-content :global(pre) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    font-size: 0.875rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    overflow-x: auto;
    line-height: 1.4;
    /* 使用细滚动条 */
    scrollbar-width: thin;
    scrollbar-gutter: stable;
  }

  .message-content :global(pre::-webkit-scrollbar) {
    height: 6px;
    width: 6px;
  }

  .message-content :global(pre::-webkit-scrollbar-track) {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .message-content :global(pre::-webkit-scrollbar-thumb) {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }

  .message-content :global(pre::-webkit-scrollbar-thumb:hover) {
    background: rgba(0, 0, 0, 0.5);
  }





  /* Math formula styles */
  .message-content :global(.math-display) {
    margin: 0.25rem 0;
    text-align: center;
    overflow-x: auto;
  }

  .message-content :global(.math-inline) {
    display: inline;
  }

  .message-content :global(.katex) {
    font-size: 1.1em !important;
    color: inherit !important;
    font-family: KaTeX_Main, "Times New Roman", serif !important;
    transition: none !important;
    max-width: 100%;
    box-sizing: border-box;
    overflow: visible;
  }

  /* 块级数学公式自适应宽度 */
  .message-content :global(.katex-display .katex) {
    display: block;
    max-width: 100%;
    overflow: visible;
  }

  .message-content :global(.katex *) {
    transition: none !important;
  }

  .message-content :global(.katex-display) {
    margin: 0.25em 0;
    text-align: center;
    max-width: 100%;
    overflow: visible;
    word-wrap: break-word;
    overflow-wrap: break-word;
    /* 让超长公式自动缩放 */
    transform-origin: center;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }

  /* 当公式太长时自动缩放 */
  @media (max-width: 768px) {
    .message-content :global(.katex-display) {
      font-size: 0.9em;
    }
  }

  @media (max-width: 480px) {
    .message-content :global(.katex-display) {
      font-size: 0.8em;
    }
  }

  /* Fix KaTeX root symbol rendering */
  .message-content :global(.katex .sqrt) {
    position: relative;
  }

  .message-content :global(.katex .sqrt > .vlist-t) {
    border-left: none;
  }

  .message-content :global(.katex .sqrt .sqrt-line) {
    border-top: 0.04em solid;
    position: absolute;
    width: 100%;
    top: 0;
  }

  .message-content :global(.katex .sqrt .sqrt-sign) {
    position: relative;
  }

  /* Ensure proper font loading for math symbols */
  .message-content :global(.katex .mord),
  .message-content :global(.katex .mop),
  .message-content :global(.katex .mbin),
  .message-content :global(.katex .mrel),
  .message-content :global(.katex .mopen),
  .message-content :global(.katex .mclose),
  .message-content :global(.katex .mpunct) {
    font-family: KaTeX_Main, "Times New Roman", serif;
  }

  /* Fix radical symbol specifically */
  .message-content :global(.katex .sqrt-sign) {
    font-family: KaTeX_Size1, KaTeX_Main, "Times New Roman", serif;
  }

  .message-content :global(.math-error) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 0.875em;
    border: 1px solid rgba(239, 68, 68, 0.2);
    display: inline-block;
    margin: 0.125rem 0;
  }

  /* 思考过程样式 */
  .reasoning-section {
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .reasoning-header {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    border-bottom: 1px solid #d1d5db;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s ease;
  }

  .reasoning-header:hover {
    background: linear-gradient(135deg, #d1d5db 0%, #b8c5d1 100%);
  }

  .reasoning-icon {
    font-size: 1rem;
    margin-right: 0.5rem;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .reasoning-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    flex: 1;
    letter-spacing: 0.025em;
  }

  .reasoning-toggle {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    font-weight: bold;
  }

  .reasoning-toggle:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #374151;
    transform: scale(1.1);
  }

  .reasoning-content {
    padding: 1rem;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.6;
    background: #ffffff;
    border-top: 1px solid #f1f5f9;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .reasoning-content :global(strong) {
    color: #1f2937;
    font-weight: 600;
  }

  .reasoning-content :global(em) {
    color: #6366f1;
    font-style: italic;
  }



  /* Enhanced Markdown styles */
  .message-content :global(h1),
  .message-content :global(h2),
  .message-content :global(h3),
  .message-content :global(h4),
  .message-content :global(h5),
  .message-content :global(h6) {
    margin: 0.375rem 0 0.125rem 0;
    font-weight: 600;
    line-height: 1.25;
  }

  .message-content :global(h1) { font-size: 1.5rem; }
  .message-content :global(h2) { font-size: 1.375rem; }
  .message-content :global(h3) { font-size: 1.25rem; }
  .message-content :global(h4) { font-size: 1.125rem; }
  .message-content :global(h5) { font-size: 1rem; }
  .message-content :global(h6) { font-size: 0.875rem; }

  /* 段落间距优化 */
  .message-content :global(p) {
    margin: 0.125rem 0;
    line-height: 1.4;
  }

  .message-content :global(ul),
  .message-content :global(ol) {
    margin: 0.0625rem 0;
    padding-left: 1.125rem;
  }

  .message-content :global(li) {
    margin: 0.0625rem 0;
    line-height: 1.35;
  }

  /* 嵌套列表优化 */
  .message-content :global(li ul),
  .message-content :global(li ol) {
    margin: 0.0625rem 0;
    padding-left: 1rem;
  }

  /* 列表项内的段落优化 */
  .message-content :global(li p) {
    margin: 0.0625rem 0;
  }

  /* 紧凑的数学内容优化 */
  .message-content :global(strong) {
    font-weight: 600;
  }

  /* 内联代码优化 */
  .message-content :global(code:not(pre code)) {
    padding: 0.125rem 0.25rem;
    margin: 0;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  .message-content :global(blockquote) {
    margin: 0.25rem 0;
    padding: 0.375rem 0.75rem;
    border-left: 3px solid #e5e7eb;
    background: rgba(0, 0, 0, 0.05);
    font-style: italic;
    border-radius: 0 0.25rem 0.25rem 0;
  }

  .message-content :global(hr) {
    margin: 0.5rem 0;
    border: none;
    border-top: 1px solid #e5e7eb;
  }

  .message-content :global(a) {
    color: #3b82f6;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .message-content :global(a:hover) {
    color: #1d4ed8;
  }

  .message-content :global(del) {
    text-decoration: line-through;
    opacity: 0.7;
  }

  /* Dark theme adjustments */
  @media (prefers-color-scheme: dark) {
    .message-content :global(blockquote) {
      background: rgba(255, 255, 255, 0.05);
      border-left-color: #374151;
    }

    .message-content :global(hr) {
      border-top-color: #374151;
    }

    .message-content :global(a) {
      color: #60a5fa;
    }

    .message-content :global(a:hover) {
      color: #93c5fd;
    }

    /* 深色主题下的思考过程样式 */
    .reasoning-section {
      background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
      border-color: #6b7280;
    }

    .reasoning-header {
      background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
      border-color: #9ca3af;
    }

    .reasoning-header:hover {
      background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
    }

    .reasoning-title {
      color: #f3f4f6;
    }

    .reasoning-toggle {
      color: #d1d5db;
    }

    .reasoning-toggle:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f3f4f6;
    }

    .reasoning-content {
      background: #1f2937;
      color: #d1d5db;
      border-color: #4b5563;
    }

    .reasoning-content :global(strong) {
      color: #f9fafb;
    }

    .reasoning-content :global(em) {
      color: #a78bfa;
    }
  }

  /* Highlight.js 代码高亮样式 - 最小干预 */
  .message-content :global(.hljs) {
    border-radius: 0.5rem !important;
    margin: 0.5rem 0 !important;
    font-size: 0.875rem !important;
  }

  /* highlightjs-copy 插件 - 使用默认样式 */

  /* 内联代码样式 */
  .message-content :global(.inline-code) {
    background: rgba(0, 0, 0, 0.1) !important;
    padding: 0.125rem 0.25rem !important;
    border-radius: 0.25rem !important;
    font-size: 0.875rem !important;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
    color: #dc2626 !important;
  }

  .message-content :global(.code-block-header) {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0.5rem 0.75rem !important;
    background: #e2e8f0 !important;
    border-bottom: 1px solid #cbd5e1 !important;
    font-size: 0.75rem !important;
  }

  .message-content :global(.code-language) {
    color: #64748b !important;
    font-weight: 500 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
  }

  /* 移除自定义复制按钮样式，使用 highlightjs-copy 默认样式 */

  .message-content :global(.code-block-container pre) {
    background: #1e293b !important;
    color: #e2e8f0 !important;
    padding: 1rem !important;
    margin: 0 !important;
    font-size: 0.875rem !important;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
    overflow-x: auto !important;
    line-height: 1.5 !important;
    border-radius: 0 !important;
    /* 使用细滚动条，防止抖动 */
    scrollbar-width: thin !important;
    scrollbar-gutter: stable !important;
  }

  .message-content :global(.code-block-container pre::-webkit-scrollbar) {
    height: 8px !important;
    width: 8px !important;
  }

  .message-content :global(.code-block-container pre::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-radius: 4px !important;
  }

  .message-content :global(.code-block-container pre::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.3) !important;
    border-radius: 4px !important;
  }

  .message-content :global(.code-block-container pre::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.5) !important;
  }

  .message-content :global(.code-block-container pre code) {
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    font-size: inherit !important;
    color: inherit !important;
  }

  /* Legacy pre styles for simple code blocks - 避免干扰 highlight.js */
  .message-content :global(pre:not(.hljs):not(.code-block-container pre)) {
    background: #1e293b;
    color: #e2e8f0;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    font-size: 0.875rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    overflow-x: auto;
    line-height: 1.4;
    border: 1px solid #334155;
    /* 使用细滚动条 */
    scrollbar-width: thin;
    scrollbar-gutter: stable;
  }

  .message-content :global(pre:not(.hljs):not(.code-block-container pre)::-webkit-scrollbar) {
    height: 6px;
    width: 6px;
  }

  .message-content :global(pre:not(.hljs):not(.code-block-container pre)::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .message-content :global(pre:not(.hljs):not(.code-block-container pre)::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .message-content :global(pre:not(.hljs):not(.code-block-container pre)::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.5);
  }



  .message-content :global(pre:not(.hljs) code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }

  /* 确保父容器定位上下文 */
  .message-content :global(.hljs-copy-wrapper) {
    position: relative;
    border-radius: 0.5rem;
    overflow: hidden;
    margin: 0.5rem 0;
    min-height: fit-content;
    display: block;
    border: none;
  }

  /* 确保 hljs 元素保持原有的圆角和样式 */
  .message-content :global(.hljs-copy-wrapper .hljs) {
    margin: 0 !important;
    /* 恢复代码块的圆角 */
    border-radius: 0.5rem !important;
    /* 确保代码块填满容器 */
    width: 100% !important;
    box-sizing: border-box !important;
    /* 为复制按钮预留更多空间 */
    padding-right: 5rem !important;
  }

  /* 重新定位按钮容器 */
  .message-content :global(.hljs-copy-container) {
    position: absolute !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    height: auto !important;
    width: auto !important;
    display: block !important;
    z-index: 10 !important;
    transform: none !important;
    transition: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .message-content :global(.hljs-copy-button),
  .message-content :global(.hljs-copy-button[data-copied="true"]),
  .message-content :global(.hljs-copy-button:not([data-copied="true"])) {
    /* 重置所有默认样式 */
    all: unset !important;
    /* 直接绝对定位按钮到代码块右上角 */
    position: absolute !important;
    top: 0.75rem !important;
    right: 0.75rem !important;
    margin: 0 !important;
    transform: none !important;
    width: auto !important;
    height: auto !important;
    padding: 0.25rem 0.5rem !important;
    background: rgba(55, 65, 81, 0.9) !important;
    border: 1px solid rgba(156, 163, 175, 0.3) !important;
    border-radius: 0.25rem !important;
    color: #f3f4f6 !important;
    font-size: 0.7rem !important;
    font-weight: 500 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    text-indent: 0 !important;
    overflow: visible !important;
    display: inline-block !important;
    box-sizing: border-box !important;
    opacity: 0.85 !important;
    z-index: 20 !important;
    /* 添加轻微阴影增强层次感 */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
  }

  .message-content :global(.hljs-copy-button::before) {
    display: none !important;
  }

  .message-content :global(.hljs-copy-button:hover) {
    background: rgba(75, 85, 99, 0.95) !important;
    border-color: rgba(156, 163, 175, 0.5) !important;
    opacity: 1 !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
  }

  /* 确保容器不会隐藏 */
  .message-content :global(.hljs-copy-container[data-autohide="true"]) {
    transform: none !important;
  }

  /* Dark theme adjustments for code blocks */
  @media (prefers-color-scheme: dark) {
    .message-content :global(.code-block-container) {
      background: #1e293b;
      border-color: #334155;
    }

    .message-content :global(.code-block-header) {
      background: #334155;
      border-bottom-color: #475569;
    }

    /* 移除深色主题下的复制按钮样式，使用插件默认样式 */
  }


</style>

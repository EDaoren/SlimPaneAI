<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Message } from '@/types';
  import { mathRenderer } from '@/lib/math-renderer';
  import { settingsStore } from '../stores/settings';
  import { t } from '@/lib/i18n';
  import { supportsReasoning, getModelDisplayName } from '@/lib/model-capabilities';
  import 'katex/dist/katex.min.css';

  export let message: Message;

  let contentElement: HTMLElement;
  let messageElement: HTMLElement;
  let processedContent = '';
  let isProcessing = false;
  let lastProcessedContent = '';
  let isVisible = false;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
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
    // Simple markdown formatting without math processing
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 简化的数学公式渲染
  function formatContentWithMath(content: string): string {
    if (!content) return '';

    try {
      // First handle code blocks to protect them
      const codeBlocks: string[] = [];
      let processedContent = content.replace(/```([\s\S]*?)```/g, (match, code) => {
        const index = codeBlocks.length;
        codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
        return `__CODE_BLOCK_${index}__`;
      });

      // Handle inline code
      const inlineCodes: string[] = [];
      processedContent = processedContent.replace(/`([^`]+)`/g, (match, code) => {
        const index = inlineCodes.length;
        inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
        return `__INLINE_CODE_${index}__`;
      });

      // Handle display math $$...$$
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const rendered = mathRenderer.renderMath(math, { displayMode: true, throwOnError: false });
        return `<div class="math-display">${rendered}</div>`;
      });

      // Handle inline math $...$
      processedContent = processedContent.replace(/\$([^$\n]+)\$/g, (match, math) => {
        const rendered = mathRenderer.renderMath(math, { displayMode: false, throwOnError: false });
        return `<span class="math-inline">${rendered}</span>`;
      });

      // Handle LaTeX display math \[...\]
      processedContent = processedContent.replace(/\\\\?\[([\s\S]*?)\\\\?\]/g, (match, math) => {
        const rendered = mathRenderer.renderMath(math, { displayMode: true, throwOnError: false });
        return `<div class="math-display">${rendered}</div>`;
      });

      // Handle LaTeX inline math \(...\)
      processedContent = processedContent.replace(/\\\\?\((.*?)\\\\?\)/g, (match, math) => {
        const rendered = mathRenderer.renderMath(math, { displayMode: false, throwOnError: false });
        return `<span class="math-inline">${rendered}</span>`;
      });

      // Handle other markdown formatting
      processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

      // Restore code blocks and inline codes
      processedContent = processedContent.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        return codeBlocks[parseInt(index)];
      });

      processedContent = processedContent.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
        return inlineCodes[parseInt(index)];
      });

      return processedContent;
    } catch (error) {
      console.error('Error in formatContentWithMath:', error);
      return formatContent(content); // 回退到基本格式化
    }
  }

  // 防抖处理内容更新
  let contentUpdateTimer: number;

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
      // 检查是否包含数学公式
      const hasMath = mathRenderer.hasMathFormulas(message.content);

      if (hasMath) {
        // 处理数学公式
        processedContent = formatContentWithMath(message.content);
      } else {
        // 没有数学公式，直接使用简单格式化
        processedContent = formatContent(message.content);
      }
    } catch (error) {
      console.error('Content update error:', error);
      // 出错时回退到基本格式化
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
          <div class="reasoning-section" style="margin-bottom: 0.75rem; padding: 0.75rem; background: #f8fafc; border-left: 3px solid #e2e8f0; border-radius: 0.375rem;">
            <div style="font-size: 0.875rem; font-weight: 500; color: #64748b; margin-bottom: 0.5rem;">{$t('chat.reasoning')}</div>
            <div style="font-size: 0.875rem; color: #475569; line-height: 1.5; white-space: pre-wrap;">{message.reasoning}</div>
          </div>
        {/if}

        <!-- 主要回答内容（只有在有内容或思考状态时才显示bubble） -->
        {#if message.content.trim() || (supportsReasoning(message.model) && message.isThinking)}
          <div class="assistant-message-bubble">
            <div class="message-content">
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
        <div class="message-content">
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
  .user-message-bubble {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 1rem;
    padding: 0.75rem 1rem;
    width: fit-content;
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: pre-wrap;
  }

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
    white-space: pre-wrap;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .message-time {
    text-align: right;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .message-content {
    font-size: var(--font-size-base);
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    max-width: 100%;
    overflow-x: hidden;
  }

  .message-content :global(code) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: monospace;
  }

  .user-message .message-content :global(code) {
    background: rgba(255, 255, 255, 0.2);
  }

  .message-content :global(pre) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    font-family: monospace;
    overflow-x: auto;
  }

  .user-message .message-content :global(pre) {
    background: rgba(255, 255, 255, 0.2);
  }

  .message-meta {
    margin-top: 0.25rem;
    text-align: right;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .assistant-message .message-meta {
    text-align: left;
  }

  /* Math formula styles */
  .message-content :global(.math-display) {
    margin: 0.75rem 0;
    text-align: center;
    overflow-x: auto;
  }

  .message-content :global(.math-inline) {
    display: inline;
  }

  .message-content :global(.katex) {
    font-size: 1.1em;
    color: inherit;
  }

  .message-content :global(.katex-display) {
    margin: 0.5em 0;
    text-align: center;
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

  /* Code block styles */
  .message-content :global(pre) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    font-size: 0.875rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    overflow-x: auto;
    line-height: 1.4;
  }

  .user-message .message-content :global(pre) {
    background: rgba(255, 255, 255, 0.2);
  }

  .message-content :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }


</style>

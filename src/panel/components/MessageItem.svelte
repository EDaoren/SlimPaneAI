<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { Message } from '@/types';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';

  export let message: Message;

  let contentElement: HTMLElement;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  function formatContentWithMath(content: string): string {
    if (!content) return '';

    try {
      console.log('🔍 Processing content with math:', content.substring(0, 100) + '...');

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
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false
          });
          console.log('✅ Display math rendered:', math.substring(0, 20));
          return `<div class="math-display">${rendered}</div>`;
        } catch (e) {
          console.error('❌ Display math error:', e);
          return `<div class="math-error">$$${escapeHtml(math)}$$</div>`;
        }
      });

      // Handle inline math $...$
      processedContent = processedContent.replace(/\$([^$\n]+)\$/g, (match, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false
          });
          console.log('✅ Inline math rendered:', math.substring(0, 20));
          return `<span class="math-inline">${rendered}</span>`;
        } catch (e) {
          console.error('❌ Inline math error:', e);
          return `<span class="math-error">$${escapeHtml(math)}$</span>`;
        }
      });

      // Handle LaTeX display math \[...\]
      processedContent = processedContent.replace(/\\\\?\[([\s\S]*?)\\\\?\]/g, (match, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false
          });
          console.log('✅ LaTeX display math rendered:', math.substring(0, 20));
          return `<div class="math-display">${rendered}</div>`;
        } catch (e) {
          console.error('❌ LaTeX display math error:', e);
          return `<div class="math-error">\\[${escapeHtml(math)}\\]</div>`;
        }
      });

      // Handle LaTeX inline math \(...\)
      processedContent = processedContent.replace(/\\\\?\((.*?)\\\\?\)/g, (match, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false
          });
          console.log('✅ LaTeX inline math rendered:', math.substring(0, 20));
          return `<span class="math-inline">${rendered}</span>`;
        } catch (e) {
          console.error('❌ LaTeX inline math error:', e);
          return `<span class="math-error">\\(${escapeHtml(math)}\\)</span>`;
        }
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

      console.log('✅ Content processing completed');
      return processedContent;
    } catch (error) {
      console.error('❌ Error in formatContentWithMath:', error);
      return formatContent(content); // 回退到基本格式化
    }
  }

  // 使用响应式计算来处理数学公式渲染
  $: processedContent = formatContentWithMath(message.content);

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


</script>

<div class="message-item flex gap-2 {message.type === 'user' ? 'flex-row-reverse justify-start' : 'justify-start'} mb-4">
  <!-- Avatar -->
  <div class="flex-shrink-0">
    {#if message.type === 'user'}
      <div class="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>
    {:else}
      <div class="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Message Content -->
  <div class="flex-1 min-w-0 max-w-[75%]">
    <div class="message-bubble {message.type === 'user' ? 'user-message' : 'assistant-message'}">
      <div class="message-content">
        {#if message.content.trim()}
          {@html processedContent}
        {:else if message.type === 'assistant'}
          <span class="text-gray-400 italic">正在思考...</span>
        {:else}
          <span class="text-gray-400 italic">空消息</span>
        {/if}
      </div>

      <div class="message-meta">
        <span class="text-xs opacity-70">
          {formatTime(message.timestamp)}
          {#if message.model}
            · {message.model}
          {/if}
        </span>
      </div>
    </div>
  </div>
</div>

<style>
  .message-bubble {
    border-radius: 1rem;
    padding: 0.5rem 0.75rem;
    width: fit-content;
    max-width: 100%;
    word-wrap: break-word;
  }

  .user-message {
    background-color: #3b82f6;
    color: white;
    border-bottom-right-radius: 0.375rem;
    margin-left: auto;
  }

  .assistant-message {
    background-color: #f3f4f6;
    color: #111827;
    border-bottom-left-radius: 0.375rem;
    margin-right: auto;
  }

  .message-content {
    font-size: 0.875rem;
    line-height: 1.6;
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

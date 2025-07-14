<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Message } from '@/types';
  import { mathRenderer } from '@/lib/math-renderer';
  import { settingsStore } from '../stores/settings';
  import { t } from '@/lib/i18n';
  import { supportsReasoning, getModelDisplayName } from '@/lib/model-capabilities';

  export let message: Message;

  let contentElement: HTMLElement;
  let messageElement: HTMLElement;
  let processedContent = '';
  let isProcessing = false;
  let lastProcessedContent = '';
  let isVisible = false;
  let codeBlockCounter = 0;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 复制代码到剪贴板
  async function copyCode(codeId: string) {
    try {
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const code = codeElement.textContent || '';
        await navigator.clipboard.writeText(code);

        // 显示复制成功的反馈
        const copyBtn = document.querySelector(`[data-copy-target="${codeId}"]`);
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '✓';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
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

    // Enhanced markdown formatting without math processing
    let processedContent = content;

    // First protect code blocks to prevent processing their content
    const codeBlocks: string[] = [];
    processedContent = processedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
      const index = codeBlocks.length;
      const codeId = `code-block-${message.id}-${index}`;
      const codeContent = escapeHtml(code.trim());

      // 检测语言（如果有的话）
      const lines = code.trim().split('\n');
      let language = '';
      let actualCode = codeContent;

      if (lines.length > 0 && lines[0].match(/^[a-zA-Z0-9+#-]+$/)) {
        language = lines[0];
        actualCode = escapeHtml(lines.slice(1).join('\n'));
      }

      const codeBlock = `<div class="code-block-container"><div class="code-block-header">${language ? `<span class="code-language">${language}</span>` : '<span></span>'}<button class="copy-code-btn" data-copy-target="${codeId}" onclick="copyCode('${codeId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H3m0 0l4-4m-4 4l4 4m6-7h7a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V9a2 2 0 012-2z"></path></svg>复制</button></div><pre><code id="${codeId}">${actualCode}</code></pre></div>`;

      codeBlocks.push(codeBlock);
      return `__CODE_BLOCK_${index}__`;
    });

    // Protect inline code
    const inlineCodes: string[] = [];
    processedContent = processedContent.replace(/`([^`]+)`/g, (match, code) => {
      const index = inlineCodes.length;
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
      return `__INLINE_CODE_${index}__`;
    });

    // Process headers (must be at start of line)
    processedContent = processedContent.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    processedContent = processedContent.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    processedContent = processedContent.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    processedContent = processedContent.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    processedContent = processedContent.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    processedContent = processedContent.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

    // Process horizontal rules
    processedContent = processedContent.replace(/^---+$/gm, '<hr>');
    processedContent = processedContent.replace(/^\*\*\*+$/gm, '<hr>');

    // Process blockquotes
    processedContent = processedContent.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

    // Process lists with stricter rules to avoid false positives
    const lines = processedContent.split('\n');
    const processedLines = [];
    let inUnorderedList = false;
    let inOrderedList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // More strict patterns for lists
      const isUnorderedItem = /^[-*+]\s+(.+)$/.test(trimmedLine);
      // For ordered lists, be more strict: must start with 1. or be consecutive
      const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      const isOrderedItem = orderedMatch && (
        // Either starting a new list with 1.
        parseInt(orderedMatch[1]) === 1 ||
        // Or continuing an existing list
        inOrderedList
      );

      if (isUnorderedItem) {
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        if (!inUnorderedList) {
          processedLines.push('<ul>');
          inUnorderedList = true;
        }
        processedLines.push(trimmedLine.replace(/^[-*+]\s+(.+)$/, '<li>$1</li>'));
      } else if (isOrderedItem) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (!inOrderedList) {
          processedLines.push('<ol>');
          inOrderedList = true;
        }
        processedLines.push(trimmedLine.replace(/^\d+\.\s+(.+)$/, '<li>$1</li>'));
      } else {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push(line);
      }
    }

    // Close any remaining lists
    if (inUnorderedList) processedLines.push('</ul>');
    if (inOrderedList) processedLines.push('</ol>');

    processedContent = processedLines.join('\n');
    // Note: This is a simplified approach. A more robust solution would group consecutive list items.

    // Process links [text](url)
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Process text formatting
    processedContent = processedContent.replace(/~~(.*?)~~/g, '<del>$1</del>'); // strikethrough
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>'); // italic

    // Convert line breaks
    processedContent = processedContent.replace(/\n/g, '<br>');

    // Restore code blocks and inline code
    codeBlocks.forEach((code, index) => {
      processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, code);
    });
    inlineCodes.forEach((code, index) => {
      processedContent = processedContent.replace(`__INLINE_CODE_${index}__`, code);
    });

    return processedContent;
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
      // Handle math formulas FIRST to prevent HTML interference
      const mathBlocks: string[] = [];
      let processedContent = content;

      // Handle display math $$...$$
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const index = mathBlocks.length;
        const rendered = mathRenderer.renderMath(math, { displayMode: true, throwOnError: false });
        mathBlocks.push(`<div class="math-display">${rendered}</div>`);
        return `__MATH_BLOCK_${index}__`;
      });

      // Handle LaTeX display math \[...\]
      processedContent = processedContent.replace(/\\\\?\[([\s\S]*?)\\\\?\]/g, (match, math) => {
        const index = mathBlocks.length;
        const rendered = mathRenderer.renderMath(math, { displayMode: true, throwOnError: false });
        mathBlocks.push(`<div class="math-display">${rendered}</div>`);
        return `__MATH_BLOCK_${index}__`;
      });

      // Handle inline math $...$
      processedContent = processedContent.replace(/\$([^$\n]+)\$/g, (match, math) => {
        const index = mathBlocks.length;
        const rendered = mathRenderer.renderMath(math, { displayMode: false, throwOnError: false });
        mathBlocks.push(`<span class="math-inline">${rendered}</span>`);
        return `__MATH_BLOCK_${index}__`;
      });

      // Handle LaTeX inline math \(...\)
      processedContent = processedContent.replace(/\\\\?\((.*?)\\\\?\)/g, (match, math) => {
        const index = mathBlocks.length;
        const rendered = mathRenderer.renderMath(math, { displayMode: false, throwOnError: false });
        mathBlocks.push(`<span class="math-inline">${rendered}</span>`);
        return `__MATH_BLOCK_${index}__`;
      });

      // Handle code blocks after math to protect them from other processing
      const codeBlocks: string[] = [];
      processedContent = processedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
        const index = codeBlocks.length;
        const codeId = `code-block-${message.id}-${index}`;
        const codeContent = escapeHtml(code.trim());

        // 检测语言（如果有的话）
        const lines = code.trim().split('\n');
        let language = '';
        let actualCode = codeContent;

        if (lines.length > 0 && lines[0].match(/^[a-zA-Z0-9+#-]+$/)) {
          language = lines[0];
          actualCode = escapeHtml(lines.slice(1).join('\n'));
        }

        const codeBlock = `<div class="code-block-container"><div class="code-block-header">${language ? `<span class="code-language">${language}</span>` : '<span></span>'}<button class="copy-code-btn" data-copy-target="${codeId}" onclick="copyCode('${codeId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H3m0 0l4-4m-4 4l4 4m6-7h7a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V9a2 2 0 012-2z"></path></svg>复制</button></div><pre><code id="${codeId}">${actualCode}</code></pre></div>`;

        codeBlocks.push(codeBlock);
        return `__CODE_BLOCK_${index}__`;
      });

      // Handle inline code
      const inlineCodes: string[] = [];
      processedContent = processedContent.replace(/`([^`]+)`/g, (match, code) => {
        const index = inlineCodes.length;
        inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
        return `__INLINE_CODE_${index}__`;
      });



      // Process headers (must be at start of line)
      processedContent = processedContent.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
      processedContent = processedContent.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
      processedContent = processedContent.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
      processedContent = processedContent.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
      processedContent = processedContent.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
      processedContent = processedContent.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

      // Process horizontal rules
      processedContent = processedContent.replace(/^---+$/gm, '<hr>');
      processedContent = processedContent.replace(/^\*\*\*+$/gm, '<hr>');

      // Process blockquotes
      processedContent = processedContent.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

      // Process lists with stricter rules to avoid false positives
      const lines = processedContent.split('\n');
      const processedLines = [];
      let inUnorderedList = false;
      let inOrderedList = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // More strict patterns for lists
        const isUnorderedItem = /^[-*+]\s+(.+)$/.test(trimmedLine);
        // For ordered lists, be much more strict:
        // 1. Must start with 1. to begin a new list
        // 2. Must be consecutive numbers when continuing
        // 3. Avoid false positives in regular text
        const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        let isOrderedItem = false;

        if (orderedMatch) {
          const number = parseInt(orderedMatch[1]);
          const content = orderedMatch[2];

          // Only treat as list if:
          // 1. Starting with 1. and content looks like a list item (short, no complex punctuation)
          // 2. Or continuing an existing list with consecutive numbers
          if (number === 1 && !inOrderedList) {
            // Check if this looks like a real list item vs regular text
            // List items are usually shorter and don't contain complex sentences
            const looksLikeListItem = content.length < 100 && !content.includes('：') && !content.includes('。');
            isOrderedItem = looksLikeListItem;
          } else if (inOrderedList) {
            // Continue existing list only with consecutive numbers
            isOrderedItem = true;
          }
        }

        if (isUnorderedItem) {
          if (inOrderedList) {
            processedLines.push('</ol>');
            inOrderedList = false;
          }
          if (!inUnorderedList) {
            processedLines.push('<ul>');
            inUnorderedList = true;
          }
          processedLines.push(trimmedLine.replace(/^[-*+]\s+(.+)$/, '<li>$1</li>'));
        } else if (isOrderedItem) {
          if (inUnorderedList) {
            processedLines.push('</ul>');
            inUnorderedList = false;
          }
          if (!inOrderedList) {
            processedLines.push('<ol>');
            inOrderedList = true;
          }
          processedLines.push(trimmedLine.replace(/^\d+\.\s+(.+)$/, '<li>$1</li>'));
        } else {
          if (inUnorderedList) {
            processedLines.push('</ul>');
            inUnorderedList = false;
          }
          if (inOrderedList) {
            processedLines.push('</ol>');
            inOrderedList = false;
          }
          processedLines.push(line);
        }
      }

      // Close any remaining lists
      if (inUnorderedList) processedLines.push('</ul>');
      if (inOrderedList) processedLines.push('</ol>');

      processedContent = processedLines.join('\n');

      // Process links [text](url)
      processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

      // Process text formatting
      processedContent = processedContent.replace(/~~(.*?)~~/g, '<del>$1</del>'); // strikethrough
      processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
      processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>'); // italic

      // Convert line breaks
      processedContent = processedContent.replace(/\n/g, '<br>');

      // Restore math blocks, code blocks and inline codes
      processedContent = processedContent.replace(/__MATH_BLOCK_(\d+)__/g, (match, index) => {
        return mathBlocks[parseInt(index)];
      });

      processedContent = processedContent.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        return codeBlocks[parseInt(index)];
      });

      processedContent = processedContent.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
        return inlineCodes[parseInt(index)];
      });

      return processedContent;
    } catch (error) {
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
    // 将copyCode函数添加到全局作用域
    if (typeof window !== 'undefined') {
      (window as any).copyCode = copyCode;
    }

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
    margin: 0.5rem 0;
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
  }

  .message-content :global(.katex *) {
    transition: none !important;
  }

  .message-content :global(.katex-display) {
    margin: 0.5em 0;
    text-align: center;
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



  /* Enhanced Markdown styles */
  .message-content :global(h1),
  .message-content :global(h2),
  .message-content :global(h3),
  .message-content :global(h4),
  .message-content :global(h5),
  .message-content :global(h6) {
    margin: 1rem 0 0.5rem 0;
    font-weight: 600;
    line-height: 1.25;
  }

  .message-content :global(h1) { font-size: 1.5rem; }
  .message-content :global(h2) { font-size: 1.375rem; }
  .message-content :global(h3) { font-size: 1.25rem; }
  .message-content :global(h4) { font-size: 1.125rem; }
  .message-content :global(h5) { font-size: 1rem; }
  .message-content :global(h6) { font-size: 0.875rem; }

  .message-content :global(ul),
  .message-content :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .message-content :global(li) {
    margin: 0.25rem 0;
    line-height: 1.5;
  }

  .message-content :global(blockquote) {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 4px solid #e5e7eb;
    background: rgba(0, 0, 0, 0.05);
    font-style: italic;
    border-radius: 0 0.375rem 0.375rem 0;
  }

  .message-content :global(hr) {
    margin: 1rem 0;
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
  }

  /* Enhanced Code block styles */
  .message-content :global(.code-block-container) {
    margin: 0.75rem 0 !important;
    border-radius: 0.5rem !important;
    overflow: hidden !important;
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
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

  .message-content :global(.copy-code-btn) {
    display: flex !important;
    align-items: center !important;
    gap: 0.25rem !important;
    padding: 0.25rem 0.5rem !important;
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 0.25rem !important;
    color: #64748b !important;
    font-size: 0.75rem !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }

  .message-content :global(.copy-code-btn:hover) {
    background: #f1f5f9 !important;
    border-color: #94a3b8 !important;
    color: #475569 !important;
  }

  .message-content :global(.copy-code-btn.copied) {
    background: #dcfce7 !important;
    border-color: #86efac !important;
    color: #166534 !important;
  }

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
  }

  .message-content :global(.code-block-container pre code) {
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    font-size: inherit !important;
    color: inherit !important;
  }

  /* Legacy pre styles for simple code blocks */
  .message-content :global(pre:not(.code-block-container pre)) {
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
  }

  .user-message .message-content :global(pre) {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(51, 65, 85, 0.8);
  }

  .message-content :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
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

    .message-content :global(.copy-code-btn) {
      background: #475569;
      border-color: #64748b;
      color: #e2e8f0;
    }

    .message-content :global(.copy-code-btn:hover) {
      background: #64748b;
      border-color: #94a3b8;
      color: #f8fafc;
    }

    .message-content :global(.copy-code-btn.copied) {
      background: #166534;
      border-color: #22c55e;
      color: #dcfce7;
    }
  }


</style>

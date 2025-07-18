<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { settingsStore } from '../stores/settings';
  import { pageChatStore } from '../stores/page-chat';
  import { toolbarConfigStore } from '../stores/toolbar-config';
  import { getModelDisplayOptions, getDefaultModelSelection, parseModelSelection } from '@/lib/service-providers';
  import CustomSelect from './CustomSelect.svelte';
  import PageChatStatus from './PageChatStatus.svelte';
  import ToolbarConfigMenu from './ToolbarConfigMenu.svelte';
  import { t } from '@/lib/i18n';

  export let disabled = false;

  const dispatch = createEventDispatcher<{
    send: {
      message: string;
      modelId?: string;
      providerId?: string;
      systemPrompt?: string;
      pageContent?: string;
      isPageChat?: boolean;
    };
    'clear-chat': void;
    'show-options': void;
  }>();

  let message = '';
  let selectedModel = '';
  let textArea: HTMLTextAreaElement;
  let showToolbarConfig = false;

  $: serviceProviders = $settingsStore.serviceProviders;
  $: userPreferences = $settingsStore.userPreferences;
  $: toolbarConfig = $toolbarConfigStore;
  $: modelOptions = getModelDisplayOptions(serviceProviders);
  $: hasModels = modelOptions.length > 0;

  // Set model selection priority: last selected > default > first available
  $: if (!selectedModel && hasModels) {
    // Try to use last selected model first
    const lastSelected = userPreferences.lastSelectedModel;
    if (lastSelected && modelOptions.some(option => option.id === lastSelected)) {
      selectedModel = lastSelected;
    } else {
      // Fallback to default model selection
      const defaultSelection = getDefaultModelSelection(serviceProviders);
      selectedModel = defaultSelection || '';
    }
  }
  
  function handleSubmit() {
    if (!message.trim() || disabled) return;

    const parsedModel = parseModelSelection(selectedModel);
    const userMessage = message.trim();

    // 检查是否启用了网页聊天模式
    const pageChatState = $pageChatStore;
    let systemPrompt = '';
    let pageContent = '';

    if (pageChatState.enabled && pageChatState.currentPageContent) {
      // 获取用户自定义的系统prompt
      systemPrompt = userPreferences.pageChatSystemPrompt || '你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。';

      // 构建页面内容上下文
      const metadata = pageChatState.currentPageMetadata;
      pageContent = `网页标题: ${pageChatState.currentPageTitle || '未知'}
网页链接: ${pageChatState.currentPageUrl || '未知'}
${metadata?.author ? `作者: ${metadata.author}` : ''}
${metadata?.publishedTime ? `发布时间: ${metadata.publishedTime}` : ''}

网页内容:
${pageChatState.currentPageContent}`;
    }

    dispatch('send', {
      message: userMessage, // 用户看到的原始消息
      systemPrompt: systemPrompt, // 自定义系统prompt
      pageContent: pageContent, // 网页内容
      modelId: parsedModel?.modelId || selectedModel,
      providerId: parsedModel?.providerId,
      isPageChat: pageChatState.enabled && !!pageChatState.currentPageContent
    });

    message = '';
    adjustTextAreaHeight();
  }

  // Handle model selection change
  async function handleModelChange() {
    if (selectedModel) {
      try {
        await settingsStore.saveLastSelectedModel(selectedModel);
      } catch (error) {
        console.error('Failed to save last selected model:', error);
      }
    }
  }

  // Handle model selection from dropdown
  function handleModelSelect(event: CustomEvent) {
    selectedModel = event.detail.value;
    handleModelChange();
  }

  // Handle clear chat action
  function handleClearChat() {
    if (confirm($t('prompts.clearChatConfirm'))) {
      dispatch('clear-chat');
    }
  }

  // Handle toolbar config toggle
  function handleToolbarConfig(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    showToolbarConfig = !showToolbarConfig;
  }

  // Handle toolbar config close
  function handleToolbarConfigClose() {
    showToolbarConfig = false;
  }

  // Handle page chat toggle
  async function handlePageChatToggle() {
    await pageChatStore.toggle();
  }

  // Handle page chat refresh
  function handlePageChatRefresh() {
    pageChatStore.retryExtraction();
  }



  function handlePageContentSelected(event: Event) {
    const customEvent = event as CustomEvent;

  // Setup event listeners
  onMount(() => {
    adjustTextAreaHeight();

    // Listen for page content selection
    window.addEventListener('page-content-selected', handlePageContentSelected as EventListener);
  });

  onDestroy(() => {
    window.removeEventListener('page-content-selected', handlePageContentSelected as EventListener);
  });
    const content = customEvent.detail.content;
    if (content) {
      // Insert content into message input
      message = (message ? message + '\n\n' : '') + `基于以下页面内容回答：\n\n${content}`;
      adjustTextAreaHeight();

      // Focus on textarea
      if (textArea) {
        textArea.focus();
      }
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
  
  function adjustTextAreaHeight() {
    if (textArea) {
      textArea.style.height = 'auto';
      textArea.style.height = Math.min(textArea.scrollHeight, 200) + 'px';
    }
  }
  
  function handleInput() {
    adjustTextAreaHeight();
  }
</script>

<div class="chat-input" style="border-top: 1px solid var(--border-primary); background: var(--bg-primary);">
  <!-- Top Bar with Model Selection and Actions -->
  <div class="chat-toolbar">
    <div class="toolbar-content">
      <!-- Model Selection -->
      <div class="model-section">
        {#if hasModels}
          <div class="model-select-container">
            <CustomSelect
              options={modelOptions}
              bind:value={selectedModel}
              placeholder={$t('chat.selectModel')}
              {disabled}
              size="sm"
              variant="default"
              compact={true}
              on:change={handleModelSelect}
            />

          </div>
        {:else}
          <span class="no-models-text">
            {$t('chat.noModels')}
          </span>
        {/if}
      </div>

      <!-- Page Chat Controls -->
      {#if toolbarConfig.showPageChat}
        <!-- Page Chat Toggle Button -->
        <button
          class="action-btn page-chat-toggle"
          class:enabled={$pageChatStore.enabled}
          title={$pageChatStore.enabled ? '关闭网页聊天' : '开启网页聊天'}
          type="button"
          on:click={handlePageChatToggle}
          aria-label="网页聊天开关"
          aria-checked={$pageChatStore.enabled}
          role="switch"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </button>

        <!-- Page Chat Refresh Button -->
        {#if $pageChatStore.enabled && ($pageChatStore.status === 'failed' || $pageChatStore.status === 'idle')}
          <button
            class="action-btn"
            title="重新提取页面内容"
            type="button"
            on:click={handlePageChatRefresh}
            disabled={$pageChatStore.status === 'extracting'}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        {/if}
      {/if}

      <!-- Action Buttons Area -->
      <div class="action-buttons" class:compact={toolbarConfig.compactMode}>
        {#if toolbarConfig.showClearButton}
          <button
            class="action-btn"
            title={$t('chat.clearChat')}
            type="button"
            on:click={handleClearChat}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        {/if}

        <!-- Toolbar Config Button -->
        <div class="toolbar-config-container">
          <button
            class="action-btn"
            title="工具条设置"
            type="button"
            on:click|stopPropagation={handleToolbarConfig}
            class:active={showToolbarConfig}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          <ToolbarConfigMenu
            bind:isOpen={showToolbarConfig}
            on:close={handleToolbarConfigClose}
          />
        </div>
      </div>
    </div>
  </div>


  <!-- Input Area -->
  <div style="padding: 0.5rem; background: var(--bg-primary); border-top: 1px solid var(--border-primary);">
    <div class="input-wrapper" style="position: relative; background: var(--input-bg); border-radius: 0.75rem; border: 2px solid var(--input-border); transition: all 0.2s; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
      <textarea
        bind:this={textArea}
        bind:value={message}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        on:focus={(e) => {
          const target = e.currentTarget;
          if (target?.parentElement) {
            target.parentElement.style.borderColor = 'var(--input-focus-border)';
            target.parentElement.style.boxShadow = 'var(--input-focus-shadow), 0 4px 6px rgba(0, 0, 0, 0.1)';
          }
        }}
        on:blur={(e) => {
          const target = e.currentTarget;
          if (target?.parentElement) {
            target.parentElement.style.borderColor = 'var(--input-border)';
            target.parentElement.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          }
        }}
        placeholder={$t('chat.placeholder')}
        style="width: 100%; background: transparent; border: none; outline: none; resize: none; min-height: 100px; max-height: 200px; padding: 0.75rem 3rem 3rem 1rem; color: var(--text-primary); font-size: var(--font-size-base); line-height: 1.5;"
        rows="1"
        {disabled}
      />

      <button
        on:click={handleSubmit}
        disabled={disabled || !message.trim()}
        style="position: absolute; right: 0.5rem; bottom: 0.5rem; padding: 0.5rem; border-radius: 0.5rem; border: none; cursor: {disabled || !message.trim() ? 'not-allowed' : 'pointer'}; transition: all 0.2s; {
          disabled || !message.trim()
            ? 'color: #9ca3af; background-color: transparent;'
            : 'color: white; background-color: #3b82f6; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);'
        }"
        title="发送消息"
        on:mouseenter={(e) => {
          if (!disabled && message.trim()) {
            const target = e.currentTarget;
            if (target) {
              target.style.backgroundColor = '#2563eb';
              target.style.transform = 'scale(1.05)';
              target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }
          }
        }}
        on:mouseleave={(e) => {
          if (!disabled && message.trim()) {
            const target = e.currentTarget;
            if (target) {
              target.style.backgroundColor = '#3b82f6';
              target.style.transform = 'scale(1)';
              target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }
          }
        }}
      >
        {#if disabled}
          <svg style="width: 1rem; height: 1rem; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {:else}
          <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        {/if}
      </button>
    </div>
  </div>



  <style>
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Page Chat Toggle Button */
    .page-chat-toggle {
      position: relative;
    }

    .page-chat-toggle.enabled {
      background: #007bff;
      color: white;
    }

    .page-chat-toggle.enabled:hover {
      background: #0056b3;
    }







    /* Toolbar Config Container */
    .toolbar-config-container {
      position: relative;
    }

    .action-buttons.compact {
      gap: 0.25rem;
    }

    .action-buttons.compact .action-btn {
      padding: 0.375rem;
    }

    /* 响应式设计 - 处理侧边栏最小化时的重叠问题 */
    @media (max-width: 400px) {
      .toolbar-section {
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .model-selection {
        min-width: 120px;
        flex: 1;
      }

      .page-chat-section {
        padding: 0.25rem;
        gap: 0.25rem;
      }

      .page-chat-controls {
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
      }

      .status-indicator {
        font-size: 0.75rem;
      }

      .status-text {
        display: none; /* 在极小宽度下隐藏状态文字 */
      }

      .action-buttons {
        gap: 0.25rem;
      }

      .action-btn {
        padding: 0.375rem;
      }
    }

    /* 极小宽度下的紧凑模式 */
    @media (max-width: 300px) {
      .toolbar-section {
        flex-direction: column;
        gap: 0.25rem;
      }

      .page-chat-section {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .page-chat-controls {
        flex-direction: row;
        gap: 0.25rem;
      }

      .refresh-btn {
        padding: 0.25rem;
      }

      .refresh-btn svg {
        width: 0.75rem;
        height: 0.75rem;
      }
    }











    .no-models-text {
      font-size: 0.875rem;
      color: #dc2626;
      font-weight: 500;
      width: 140px;
      text-align: center;
    }

    /* 工具条样式 */
    .chat-toolbar {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border-secondary);
      background: var(--bg-primary);
    }

    .toolbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .model-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0; /* 允许收缩 */
    }

    .model-select-container {
      width: 120px; /* 进一步减少宽度，紧凑模式下足够显示 */
      flex-shrink: 0;
    }

    .page-chat-section {
      display: flex;
      align-items: center;
      align-items: center;
      margin-right: 0.5rem;
    }

    .page-chat-toggle {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--border-primary);
      background: var(--bg-primary);
      color: var(--text-muted);
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .page-chat-toggle:hover {
      background: var(--bg-tertiary);
      border-color: var(--border-secondary);
      color: var(--text-secondary);
    }

    .page-chat-toggle.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }

    .page-chat-toggle.active:hover {
      background: #2563eb;
      border-color: #2563eb;
    }

    .status-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .loading-dot {
      width: 6px;
      height: 6px;
      background: #3b82f6;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .success-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
    }

    .error-dot {
      width: 6px;
      height: 6px;
      background: #ef4444;
      border-radius: 50%;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2);
      }
    }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .action-btn:active {
      transform: scale(0.95);
    }

    .action-btn svg {
      width: 1rem;
      height: 1rem;
    }
  </style>
</div>

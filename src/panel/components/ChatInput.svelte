<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { settingsStore } from '../stores/settings';
  import { getModelDisplayOptions, getDefaultModelSelection, parseModelSelection } from '@/lib/service-providers';
  import CustomSelect from './CustomSelect.svelte';
  import { t } from '@/lib/i18n';

  export let disabled = false;

  const dispatch = createEventDispatcher<{
    send: { message: string; modelId?: string; providerId?: string };
    'clear-chat': void;
    'show-options': void;
  }>();

  let message = '';
  let selectedModel = '';
  let textArea: HTMLTextAreaElement;

  $: serviceProviders = $settingsStore.serviceProviders;
  $: userPreferences = $settingsStore.userPreferences;
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

    dispatch('send', {
      message: message.trim(),
      modelId: parsedModel?.modelId || selectedModel,
      providerId: parsedModel?.providerId
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

  // Handle more options action
  function handleMoreOptions() {
    // 可以打开设置面板或显示更多选项菜单
    dispatch('show-options');
  }



  // Setup event listeners
  onMount(() => {
    adjustTextAreaHeight();
  });
  
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

      <!-- Action Buttons Area -->
      <div class="action-buttons">
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
        <button
          class="action-btn"
          title={$t('common.settings')}
          type="button"
          on:click={handleMoreOptions}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
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
          e.target.parentElement.style.borderColor = 'var(--input-focus-border)';
          e.target.parentElement.style.boxShadow = 'var(--input-focus-shadow), 0 4px 6px rgba(0, 0, 0, 0.1)';
        }}
        on:blur={(e) => {
          e.target.parentElement.style.borderColor = 'var(--input-border)';
          e.target.parentElement.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
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
            e.target.style.backgroundColor = '#2563eb';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }
        }}
        on:mouseleave={(e) => {
          if (!disabled && message.trim()) {
            e.target.style.backgroundColor = '#3b82f6';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
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

    .action-buttons {
      display: flex;
      align-items: center;
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

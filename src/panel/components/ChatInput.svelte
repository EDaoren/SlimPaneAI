<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { settingsStore } from '../stores/settings';
  import { getModelDisplayOptions, getDefaultModelSelection, parseModelSelection } from '@/lib/service-providers';

  export let disabled = false;

  const dispatch = createEventDispatcher<{
    send: { message: string; modelId?: string; providerId?: string };
  }>();

  let message = '';
  let selectedModel = '';
  let textArea: HTMLTextAreaElement;
  let isDropdownOpen = false;
  let dropdownContainer: HTMLElement;
  let dropdownMenu: HTMLElement;
  let shouldOpenUpward = false;

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

  // Calculate dropdown position
  function calculateDropdownPosition() {
    if (!dropdownContainer) return;

    const rect = dropdownContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const maxDropdownHeight = Math.min(400, viewportHeight * 0.7); // max-height of dropdown menu
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If there's not enough space below but enough space above, open upward
    shouldOpenUpward = spaceBelow < maxDropdownHeight && spaceAbove > maxDropdownHeight;
  }

  // Handle dropdown toggle
  function toggleDropdown() {
    if (disabled || !hasModels) return;

    if (!isDropdownOpen) {
      calculateDropdownPosition();
    }

    isDropdownOpen = !isDropdownOpen;
  }

  // Handle model selection from dropdown
  function selectModel(modelId: string) {
    selectedModel = modelId;
    isDropdownOpen = false;
    handleModelChange();
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (dropdownContainer && !dropdownContainer.contains(event.target as Node)) {
      isDropdownOpen = false;
    }
  }

  // Get display name for selected model (reactive)
  $: selectedModelName = (() => {
    const option = modelOptions.find(opt => opt.id === selectedModel);
    return option ? option.name : '选择模型';
  })();

  // Handle window resize
  function handleResize() {
    if (isDropdownOpen) {
      calculateDropdownPosition();
    }
  }

  // Setup event listeners
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleResize);
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
      textArea.style.height = Math.min(textArea.scrollHeight, 120) + 'px';
    }
  }
  
  function handleInput() {
    adjustTextAreaHeight();
  }
</script>

<div class="chat-input" style="border-top: 1px solid var(--border-primary); background: var(--bg-primary);">
  <!-- Top Bar with Model Selection and Actions -->
  <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-secondary); background: var(--bg-primary);">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <!-- Model Selection -->
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <svg style="width: 1rem; height: 1rem; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {#if hasModels}
          <div class="custom-dropdown" bind:this={dropdownContainer}>
            <button
              class="model-select"
              class:open={isDropdownOpen}
              on:click={toggleDropdown}
              {disabled}
              type="button"
            >
              <span class="selected-text">{selectedModelName}</span>
              <svg class="dropdown-arrow" class:rotated={isDropdownOpen} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {#if isDropdownOpen}
              <div
                class="dropdown-menu"
                class:upward={shouldOpenUpward}
                bind:this={dropdownMenu}
              >
                {#each modelOptions as option}
                  <button
                    class="dropdown-item"
                    class:selected={option.id === selectedModel}
                    on:click={() => selectModel(option.id)}
                    type="button"
                  >
                    {option.name}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <span class="no-models-text">
            未配置模型
          </span>
        {/if}
      </div>

        <!-- Action Buttons -->
        <div style="display: flex; align-items: center; gap: 0.25rem; margin-left: auto;">
          <!-- Clear Chat -->
          <button
            style="padding: 0.375rem; border-radius: 0.375rem; color: #6b7280; background: none; border: none; cursor: pointer; transition: all 0.2s;"
            title="清空对话"
            on:click={() => dispatch('clear')}
            on:mouseenter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <!-- Copy Last Response -->
          <button
            style="padding: 0.375rem; border-radius: 0.375rem; color: #6b7280; background: none; border: none; cursor: pointer; transition: all 0.2s;"
            title="复制最后回复"
            on:click={() => dispatch('copy')}
            on:mouseenter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <!-- Export Chat -->
          <button
            style="padding: 0.375rem; border-radius: 0.375rem; color: #6b7280; background: none; border: none; cursor: pointer; transition: all 0.2s;"
            title="导出对话"
            on:click={() => dispatch('export')}
            on:mouseenter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  
  <!-- Input Area -->
  <div style="padding: 1rem; background: var(--bg-primary); border-top: 1px solid var(--border-primary);">
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
        placeholder="有什么问题，尽管问我..."
        style="width: 100%; background: transparent; border: none; outline: none; resize: none; min-height: 52px; max-height: 128px; padding: 0.75rem 3rem 0.75rem 1rem; color: var(--text-primary); font-size: var(--font-size-base); line-height: 1.5;"
        rows="1"
        {disabled}
      />

      <button
        on:click={handleSubmit}
        disabled={disabled || !message.trim()}
        style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); padding: 0.5rem; border-radius: 0.5rem; border: none; cursor: {disabled || !message.trim() ? 'not-allowed' : 'pointer'}; transition: all 0.2s; {
          disabled || !message.trim()
            ? 'color: #9ca3af; background-color: transparent;'
            : 'color: white; background-color: #3b82f6; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);'
        }"
        title="发送消息"
        on:mouseenter={(e) => {
          if (!disabled && message.trim()) {
            e.target.style.backgroundColor = '#2563eb';
            e.target.style.transform = 'translateY(-50%) scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }
        }}
        on:mouseleave={(e) => {
          if (!disabled && message.trim()) {
            e.target.style.backgroundColor = '#3b82f6';
            e.target.style.transform = 'translateY(-50%) scale(1)';
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

    <!-- Tips -->
    <div style="margin-top: 0.5rem; font-size: var(--font-size-small); color: var(--text-muted); text-align: center;">
      按 <span style="padding: 0.125rem 0.375rem; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 0.25rem; color: var(--text-secondary); font-family: monospace; font-size: var(--font-size-small);">Enter</span> 发送，<span style="padding: 0.125rem 0.375rem; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 0.25rem; color: var(--text-secondary); font-family: monospace; font-size: var(--font-size-small);">Shift + Enter</span> 换行
    </div>
  </div>

  <style>
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .custom-dropdown {
      position: relative;
      width: 140px;
    }

    .model-select {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: var(--font-size-small);
      background: var(--bg-secondary);
      border: 1px solid var(--border-secondary);
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      cursor: pointer;
      gap: 0.5rem;
    }

    .model-select:hover {
      background: var(--bg-tertiary);
      border-color: var(--border-primary);
    }

    .model-select:focus {
      outline: none;
      background: var(--bg-tertiary);
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .model-select.open {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .model-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .selected-text {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-arrow {
      width: 1rem;
      height: 1rem;
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .dropdown-arrow.rotated {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.25rem);
      left: 0;
      min-width: 100%;
      width: max-content;
      max-width: 300px;
      background: var(--bg-primary);
      border: 1px solid var(--border-secondary);
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 1000;
      max-height: min(400px, 70vh);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem;
      transform-origin: top center;
      animation: dropdownSlideDown 0.15s ease-out;

      /* 只在内容超出时显示滚动条 */
      scrollbar-width: thin;
      scrollbar-color: var(--border-secondary) transparent;
    }

    .dropdown-menu.upward {
      top: auto;
      bottom: calc(100% + 0.25rem);
      transform-origin: bottom center;
      animation: dropdownSlideUp 0.15s ease-out;
    }

    @keyframes dropdownSlideDown {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes dropdownSlideUp {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dropdown-item {
      width: 100%;
      display: block;
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: var(--font-size-small);
      color: var(--text-primary);
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 0.125rem;
      white-space: nowrap;
      overflow: visible;
    }

    .dropdown-item:last-child {
      margin-bottom: 0;
    }

    .dropdown-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .dropdown-item.selected {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 500;
    }

    .dropdown-item.selected:hover {
      background: #dbeafe;
    }

    /* 滚动条样式 */
    .dropdown-menu::-webkit-scrollbar {
      width: 6px;
    }

    .dropdown-menu::-webkit-scrollbar-track {
      background: transparent;
    }

    .dropdown-menu::-webkit-scrollbar-thumb {
      background: var(--border-secondary);
      border-radius: 3px;
    }

    .dropdown-menu::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }

    .no-models-text {
      font-size: 0.875rem;
      color: #dc2626;
      font-weight: 500;
      width: 140px;
      text-align: center;
    }
  </style>
</div>

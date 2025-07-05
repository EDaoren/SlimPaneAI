<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { settingsStore } from '../stores/settings';
  import { getModelDisplayOptions, getDefaultModelSelection, parseModelSelection } from '@/lib/service-providers';

  export let disabled = false;

  const dispatch = createEventDispatcher<{
    send: { message: string; modelId?: string; providerId?: string };
  }>();

  let message = '';
  let selectedModel = '';
  let textArea: HTMLTextAreaElement;

  $: serviceProviders = $settingsStore.serviceProviders;
  $: modelOptions = getModelDisplayOptions(serviceProviders);
  $: hasModels = modelOptions.length > 0;

  // Set default model
  $: if (!selectedModel && hasModels) {
    const defaultSelection = getDefaultModelSelection(serviceProviders);
    selectedModel = defaultSelection || '';
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

<div class="chat-input border-t border-gray-200 bg-white">
  <!-- Top Bar with Model Selection and Actions -->
  <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #f3f4f6; background-color: white;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <!-- Model Selection -->
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <svg style="width: 1rem; height: 1rem; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {#if hasModels}
          <select
            bind:value={selectedModel}
            style="font-size: 0.875rem; background-color: #f9fafb; border: none; border-radius: 0.375rem; padding: 0.25rem 0.5rem; color: #374151; transition: background-color 0.2s;"
            {disabled}
          >
            {#each modelOptions as option}
              <option value={option.id}>
                {option.name}
              </option>
            {/each}
          </select>
        {:else}
          <span style="font-size: 0.875rem; color: #dc2626; font-weight: 500;">
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
  <div style="padding: 1rem; background-color: white; border-top: 1px solid #e5e7eb;">
    <div style="position: relative; background-color: white; border-radius: 0.75rem; border: 2px solid #d1d5db; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
      <textarea
        bind:this={textArea}
        bind:value={message}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        on:focus={(e) => {
          e.target.parentElement.style.borderColor = '#3b82f6';
          e.target.parentElement.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1)';
        }}
        on:blur={(e) => {
          e.target.parentElement.style.borderColor = '#d1d5db';
          e.target.parentElement.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        }}
        placeholder="有什么问题，尽管问我..."
        style="width: 100%; background: transparent; border: none; outline: none; resize: none; min-height: 52px; max-height: 128px; padding: 0.75rem 3rem 0.75rem 1rem; color: #111827; font-size: 0.875rem; line-height: 1.5;"
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
    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280; text-align: center;">
      按 <span style="padding: 0.125rem 0.375rem; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.25rem; color: #4b5563; font-family: monospace; font-size: 0.75rem;">Enter</span> 发送，<span style="padding: 0.125rem 0.375rem; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.25rem; color: #4b5563; font-family: monospace; font-size: 0.75rem;">Shift + Enter</span> 换行
    </div>
  </div>

  <style>
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</div>

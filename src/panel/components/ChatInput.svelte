<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { settingsStore } from '../stores/settings';

  export let disabled = false;
  
  const dispatch = createEventDispatcher<{
    send: { message: string; modelId?: string };
  }>();
  
  let message = '';
  let selectedModel = '';
  let textArea: HTMLTextAreaElement;
  
  $: modelSettings = $settingsStore.modelSettings;
  $: modelOptions = Object.entries(modelSettings).map(([id, config]) => ({
    id,
    name: `${config.provider} - ${config.model}`,
    config
  }));
  
  // Set default model
  $: if (!selectedModel && modelOptions.length > 0) {
    const defaultModel = $settingsStore.userPreferences.defaultModel;
    selectedModel = defaultModel && modelSettings[defaultModel] ? defaultModel : modelOptions[0].id;
  }
  
  function handleSubmit() {
    if (!message.trim() || disabled) return;
    
    dispatch('send', { 
      message: message.trim(),
      modelId: selectedModel 
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
  <!-- Model Selector -->
  {#if modelOptions.length > 0}
    <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-gray-700">切换模型</span>
        <select
          bind:value={selectedModel}
          class="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors min-w-0 flex-1 ml-3"
          {disabled}
        >
          {#each modelOptions as option}
            <option value={option.id}>
              {option.config.provider === 'openai' ? 'GPT' :
               option.config.provider === 'claude' ? 'Claude' :
               option.config.provider === 'gemini' ? 'Gemini' :
               option.config.provider.toUpperCase()} - {option.config.model}
            </option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
  
  <!-- Input Area -->
  <div class="p-4">
    <div class="relative bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-300 transition-colors">
      <textarea
        bind:this={textArea}
        bind:value={message}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        placeholder="输入您的消息..."
        class="w-full bg-transparent border-none outline-none resize-none min-h-[52px] max-h-32 px-4 py-3 pr-12 text-gray-900 placeholder-gray-500"
        rows="1"
        {disabled}
      />

      <button
        on:click={handleSubmit}
        disabled={disabled || !message.trim()}
        class="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 {
          disabled || !message.trim()
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-white bg-gray-900 hover:bg-gray-800 hover:scale-105'
        }"
        title="发送消息"
      >
        {#if disabled}
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Tips -->
    <div class="mt-2 text-xs text-gray-500 text-center">
      按 Enter 发送，Shift + Enter 换行
    </div>
  </div>
</div>

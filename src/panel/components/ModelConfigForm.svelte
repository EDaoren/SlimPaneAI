<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CustomSelect from './CustomSelect.svelte';
  import { t } from '@/lib/i18n';
  import type { ModelConfig, ModelProvider } from '@/types';
  import { DEFAULT_MODELS } from '@/lib/model-adapters';
  
  export let modelId: string | null = null;
  export let existingConfig: ModelConfig | null = null;
  
  const dispatch = createEventDispatcher<{
    save: { id: string; config: ModelConfig };
    cancel: void;
  }>();
  
  // Form state
  let provider: ModelProvider = existingConfig?.provider || 'openai';
  let model = existingConfig?.model || '';
  let apiKey = existingConfig?.apiKey || '';
  let baseUrl = existingConfig?.baseUrl || '';

  let temperature = existingConfig?.temperature || 0.7;
  let customModelName = '';
  
  // Generate a unique ID for new models
  let generatedId = modelId || `${provider}-${Date.now()}`;
  
  $: availableModels = (DEFAULT_MODELS as any)[provider] || [];
  $: isCustomProvider = provider === 'custom';
  $: isCustomModel = model === 'custom';

  // 提供商选项
  const providerOptions = [
    { id: 'openai', name: 'OpenAI', icon: '🤖' },
    { id: 'claude', name: 'Anthropic Claude', icon: '🧠' },
    { id: 'gemini', name: 'Google Gemini', icon: '💎' },
    { id: 'custom', name: $t('settings.customModel'), icon: '⚙️' }
  ];

  // 模型选项（动态生成）
  $: modelOptions = [
    ...availableModels.map((modelOption: any) => ({
      id: modelOption.model,
      name: modelOption.name,
      icon: getProviderIcon(provider)
    })),
    { id: 'custom', name: $t('settings.customModel') + '...', icon: '🔧' }
  ];

  function getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      'openai': '🤖',
      'claude': '🧠',
      'gemini': '💎',
      'custom': '⚙️'
    };
    return icons[provider] || '🔧';
  }
  
  // Update generated ID when provider changes
  $: if (!modelId) {
    generatedId = `${provider}-${Date.now()}`;
  }
  
  function handleProviderChange() {
    model = '';
    baseUrl = '';
    if (provider !== 'custom') {
      customModelName = '';
    }
  }

  function handleModelChange() {
    if (model !== 'custom') {
      customModelName = '';
    }
  }

  function handleProviderSelectChange(event: CustomEvent) {
    provider = event.detail.value;
    handleProviderChange();
  }

  function handleModelSelectChange(event: CustomEvent) {
    model = event.detail.value;
    handleModelChange();
  }
  
  function handleSave() {
    if (!validateForm()) return;
    
    const finalModel = isCustomModel ? customModelName : model;
    
    const config: ModelConfig = {
      provider,
      model: finalModel,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,

      temperature: parseFloat(temperature.toString()),
    };
    
    dispatch('save', { id: generatedId, config });
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function validateForm(): boolean {
    if (!provider) {
      alert('请选择服务商');
      return false;
    }

    if (!model && !isCustomModel) {
      alert('请选择模型');
      return false;
    }

    if (isCustomModel && !customModelName.trim()) {
      alert('请输入自定义模型名称');
      return false;
    }

    if (!apiKey.trim()) {
      alert('请输入 API 密钥');
      return false;
    }

    if (isCustomProvider && !baseUrl.trim()) {
      alert('请输入自定义服务商的 Base URL');
      return false;
    }

    return true;
  }
  
  function getDefaultBaseUrl(provider: ModelProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'claude':
        return 'https://api.anthropic.com/v1/messages';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      default:
        return '';
    }
  }
</script>

<div class="model-config-form bg-white">
  <!-- Header -->
  <div class="form-header">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="header-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900">
            {modelId ? $t('settings.editModel') : $t('settings.addModel')}
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            {modelId ? $t('settings.editModel') : $t('settings.addModel')}
          </p>
        </div>
      </div>
      <button
        class="close-button"
        on:click={handleCancel}
        title={$t('common.close')}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>

  <div class="form-content">
    <!-- Form -->
    <form on:submit|preventDefault={handleSave} class="form-body">
      <!-- Provider -->
      <div class="form-group">
        <label for="provider" class="form-label">
          <span class="label-text">{$t('settings.provider')}</span>
          <span class="label-required">*</span>
        </label>
        <CustomSelect
          options={providerOptions}
          bind:value={provider}
          placeholder={$t('settings.provider')}
          size="md"
          variant="default"
          on:change={handleProviderSelectChange}
        />
      </div>
      
      <!-- Model -->
      <div class="form-group">
        <label for="model" class="form-label">
          <span class="label-text">{$t('settings.model')}</span>
          <span class="label-required">*</span>
        </label>
        {#if isCustomProvider}
          <div class="input-wrapper">
            <input
              id="model"
              bind:value={model}
              type="text"
              class="form-input"
              placeholder={$t('settings.enterModelName')}
              required
            />
          </div>
        {:else}
          <CustomSelect
            options={modelOptions}
            bind:value={model}
            placeholder={$t('settings.selectModel')}
            size="md"
            variant="default"
            on:change={handleModelSelectChange}
          />

          {#if isCustomModel}
            <div class="input-wrapper mt-3">
              <input
                bind:value={customModelName}
                type="text"
                class="form-input"
                placeholder={$t('settings.enterCustomModelName')}
                required
              />
            </div>
          {/if}
        {/if}
      </div>
      
      <!-- API Key -->
      <div class="form-group">
        <label for="api-key" class="form-label">
          <span class="label-text">{$t('settings.apiKey')}</span>
          <span class="label-required">*</span>
        </label>
        <div class="input-wrapper">
          <input
            id="api-key"
            bind:value={apiKey}
            type="password"
            class="form-input"
            placeholder={$t('settings.apiKeyPlaceholder')}
            required
          />
          <div class="input-icon">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
        <p class="form-help">
          {$t('settings.apiKeyHelp')}
        </p>
      </div>
      
      <!-- Base URL -->
      <div class="form-group">
        <label for="base-url" class="form-label">
          <span class="label-text">Base URL</span>
          {#if isCustomProvider}
            <span class="label-required">*</span>
          {:else}
            <span class="label-optional">{$t('settings.baseUrlOptional')}</span>
          {/if}
        </label>
        <div class="input-wrapper">
          <input
            id="base-url"
            bind:value={baseUrl}
            type="url"
            class="form-input"
            placeholder={getDefaultBaseUrl(provider) || $t('settings.baseUrlPlaceholder')}
            required={isCustomProvider}
          />
          <div class="input-icon">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
        <p class="form-help">
          {#if isCustomProvider}
            {$t('settings.baseUrlHelpCustom')}
          {:else}
            {$t('settings.baseUrlHelp')}
          {/if}
        </p>
      </div>
      
      <!-- Advanced Settings -->
      <details class="advanced-settings">
        <summary class="advanced-summary">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{$t('settings.advancedSettings')}</span>
          </div>
          <svg class="chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div class="advanced-content">


          <!-- Temperature -->
          <div class="form-group">
            <label for="temperature" class="form-label">
              <span class="label-text">{$t('settings.temperature')}: {temperature}</span>
            </label>
            <div class="range-wrapper">
              <input
                id="temperature"
                bind:value={temperature}
                type="range"
                min="0"
                max="2"
                step="0.1"
                class="form-range"
              />
              <div class="range-labels">
                <span>{$t('settings.temperatureFocused')}</span>
                <span>{$t('settings.temperatureCreative')}</span>
              </div>
            </div>
          </div>
        </div>
      </details>
      
      <!-- Actions -->
      <div class="form-actions">
        <button
          type="submit"
          class="btn-primary"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {modelId ? $t('settings.updateModel') : $t('settings.addModel')}
        </button>
        <button
          type="button"
          class="btn-secondary"
          on:click={handleCancel}
        >
          {$t('common.cancel')}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .form-header {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
    padding: 1.5rem 2rem;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    color: #6b7280;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #374151;
  }

  .form-content {
    padding: 1.5rem 2rem;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
  }

  .label-text {
    color: #374151;
  }

  .label-required {
    color: #ef4444;
  }



  .form-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f1f5f9;
    margin-top: 1.25rem;
  }

  .btn-primary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .btn-secondary {
    padding: 0.875rem 1.5rem;
    background: white;
    color: #6b7280;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #374151;
  }

  .input-wrapper {
    position: relative;
  }

  .form-input {
    width: 100%;
    padding: 0.875rem 2.5rem 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    background: white;
    font-size: 0.875rem;
    color: #374151;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input::placeholder {
    color: #9ca3af;
  }

  .input-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    pointer-events: none;
  }

  .form-help {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .form-help::before {
    content: "ℹ️";
    font-size: 0.875rem;
  }

  .mt-3 {
    margin-top: 0.75rem;
  }

  .label-optional {
    color: #9ca3af;
    font-weight: 400;
  }

  .advanced-settings {
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    background: #fafbfc;
    transition: all 0.2s ease;
  }

  .advanced-settings[open] {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .advanced-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    cursor: pointer;
    font-weight: 600;
    color: #374151;
    transition: all 0.2s ease;
    list-style: none;
  }

  .advanced-summary::-webkit-details-marker {
    display: none;
  }

  .advanced-summary:hover {
    color: #3b82f6;
  }

  .advanced-settings[open] .advanced-summary {
    border-bottom: 1px solid #e5e7eb;
    color: #3b82f6;
  }

  .chevron {
    transition: transform 0.2s ease;
  }

  .advanced-settings[open] .chevron {
    transform: rotate(180deg);
  }

  .advanced-content {
    padding: 1.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .range-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-range {
    width: 100%;
    height: 0.5rem;
    background: #e5e7eb;
    border-radius: 0.25rem;
    outline: none;
    appearance: none;
    cursor: pointer;
  }

  .form-range::-webkit-slider-thumb {
    appearance: none;
    width: 1.25rem;
    height: 1.25rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .form-range::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .form-range::-moz-range-thumb {
    width: 1.25rem;
    height: 1.25rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #6b7280;
  }
</style>

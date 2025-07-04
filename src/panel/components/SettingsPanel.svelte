<script lang="ts">
  import { settingsStore } from '../stores/settings';
  import ModelConfigForm from './ModelConfigForm.svelte';
  import type { ModelConfig } from '@/types';
  
  let showAddModel = false;
  let editingModelId: string | null = null;
  
  $: modelSettings = $settingsStore.modelSettings;
  $: userPreferences = $settingsStore.userPreferences;
  $: modelEntries = Object.entries(modelSettings);
  
  function handleAddModel() {
    showAddModel = true;
    editingModelId = null;
  }
  
  function handleEditModel(modelId: string) {
    editingModelId = modelId;
    showAddModel = true;
  }
  
  function handleDeleteModel(modelId: string) {
    if (confirm('Delete this model configuration?')) {
      settingsStore.removeModelConfig(modelId);
    }
  }
  
  function handleModelSave(event: CustomEvent<{ id: string; config: ModelConfig }>) {
    const { id, config } = event.detail;
    settingsStore.addModelConfig(id, config);
    showAddModel = false;
    editingModelId = null;
  }
  
  function handleModelCancel() {
    showAddModel = false;
    editingModelId = null;
  }
  
  async function handleDefaultModelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      defaultModel: target.value,
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }
  
  async function handleLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      language: target.value as 'en' | 'zh',
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }
  
  async function handleThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      theme: target.value as 'light' | 'dark' | 'auto',
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }
</script>

<div class="settings-panel h-full overflow-y-auto bg-white">
  {#if showAddModel}
    <ModelConfigForm
      modelId={editingModelId}
      existingConfig={editingModelId ? modelSettings[editingModelId] : null}
      on:save={handleModelSave}
      on:cancel={handleModelCancel}
    />
  {:else}
    <div class="p-6 space-y-8">
      <!-- Model Configurations -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">AI 模型</h2>
          <button
            class="btn-primary text-sm"
            on:click={handleAddModel}
          >
            添加模型
          </button>
        </div>
        
        {#if modelEntries.length === 0}
          <div class="text-center py-8 bg-gray-50 rounded-lg">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">未配置模型</h3>
            <p class="text-gray-600 mb-4">添加您的第一个 AI 模型以开始聊天。</p>
            <button
              class="btn-primary"
              on:click={handleAddModel}
            >
              添加模型
            </button>
          </div>
        {:else}
          <div class="space-y-3">
            {#each modelEntries as [modelId, config] (modelId)}
              <div class="model-card p-4 border border-gray-200 rounded-lg">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900">
                      {config.provider} - {config.model}
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">
                      {#if config.baseUrl}
                        自定义端点: {config.baseUrl}
                      {:else}
                        默认端点
                      {/if}
                    </p>
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>最大令牌: {config.maxTokens || '默认'}</span>
                      <span>温度: {config.temperature || 0.7}</span>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <button
                      class="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                      on:click={() => handleEditModel(modelId)}
                      title="Edit"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      class="p-1.5 rounded text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                      on:click={() => handleDeleteModel(modelId)}
                      title="Delete"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
      
      <!-- User Preferences -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">偏好设置</h2>
        
        <div class="space-y-4">
          <!-- Default Model -->
          {#if modelEntries.length > 0}
            <div>
              <label for="default-model" class="block text-sm font-medium text-gray-700 mb-2">
                默认模型
              </label>
              <select
                id="default-model"
                class="input-base w-full"
                value={userPreferences.defaultModel}
                on:change={handleDefaultModelChange}
              >
                <option value="">选择默认模型</option>
                {#each modelEntries as [modelId, config]}
                  <option value={modelId}>
                    {config.provider} - {config.model}
                  </option>
                {/each}
              </select>
            </div>
          {/if}
          
          <!-- Language -->
          <div>
            <label for="language" class="block text-sm font-medium text-gray-700 mb-2">
              语言
            </label>
            <select
              id="language"
              class="input-base w-full"
              value={userPreferences.language}
              on:change={handleLanguageChange}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          
          <!-- Theme -->
          <div>
            <label for="theme" class="block text-sm font-medium text-gray-700 mb-2">
              主题
            </label>
            <select
              id="theme"
              class="input-base w-full"
              value={userPreferences.theme}
              on:change={handleThemeChange}
            >
              <option value="auto">自动</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </div>
      </section>
      
      <!-- About -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">关于</h2>
        <div class="text-sm text-gray-600 space-y-2">
          <p><strong>SlimPaneAI</strong> v0.0.1</p>
          <p>一个轻量级的 AI 驱动浏览器扩展，具有侧边栏聊天和文本增强功能。</p>
          <p>在任何网页上选择文本，使用右键菜单进行总结、翻译或解释。</p>
        </div>
      </section>
    </div>
  {/if}
</div>

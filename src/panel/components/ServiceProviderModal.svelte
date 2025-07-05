<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ServiceProvider, Model } from '@/types';

  export let provider: ServiceProvider | null = null;
  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    save: { provider: ServiceProvider };
    cancel: void;
  }>();

  // Form state
  let formData: Partial<ServiceProvider> = {};
  let isLoading = false;
  let testResult: { success: boolean; message: string } | null = null;
  let initialized = false;

  // Initialize form data only once when modal opens
  $: if (isOpen && !initialized) {
    if (provider) {
      formData = {
        ...provider,
        models: [...provider.models]
      };
      console.log('🔧 [ServiceProviderModal] Initialized form data for editing:', formData);
    } else {
      // New custom provider
      formData = {
        id: `custom-${Date.now()}`,
        name: '',
        icon: '⚡',
        isBuiltIn: false,
        enabled: true,
        isDefault: false,
        apiKey: '',
        baseUrl: '',
        models: []
      };
      console.log('🔧 [ServiceProviderModal] Initialized form data for new provider:', formData);
    }
    initialized = true;
  }

  // Reset initialization flag when modal closes
  $: if (!isOpen) {
    initialized = false;
    testResult = null;
  }

  function handleSave() {
    if (!validateForm()) return;
    
    dispatch('save', { provider: formData as ServiceProvider });
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function validateForm(): boolean {
    if (!formData.name?.trim()) {
      alert('请输入服务提供商名称');
      return false;
    }

    if (!formData.apiKey?.trim()) {
      alert('请输入 API Key');
      return false;
    }

    if (!formData.baseUrl?.trim()) {
      alert('请输入 API 端点 URL');
      return false;
    }

    return true;
  }

  async function testConnection() {
    if (!formData.apiKey || !formData.baseUrl) {
      alert('请先填写 API Key 和端点 URL');
      return;
    }

    isLoading = true;
    testResult = null;

    try {
      const response = await fetch(`${formData.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${formData.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        testResult = { success: true, message: '连接成功！' };
      } else {
        testResult = { success: false, message: `连接失败: ${response.status} ${response.statusText}` };
      }
    } catch (error) {
      testResult = { success: false, message: `连接错误: ${error.message}` };
    } finally {
      isLoading = false;
    }
  }

  async function updateModelList() {
    if (!formData.apiKey || !formData.baseUrl) {
      alert('请先填写 API Key 和端点 URL');
      return;
    }

    isLoading = true;

    try {
      const response = await fetch(`${formData.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${formData.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const models: Model[] = data.data?.map((model: any) => ({
          id: model.id,
          name: model.id,
          enabled: true
        })) || [];

        formData.models = models;
        alert(`成功获取 ${models.length} 个模型`);
      } else {
        alert(`获取模型失败: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert(`获取模型错误: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  function addModel() {
    const modelName = prompt('请输入模型名称:');
    if (modelName?.trim()) {
      formData.models = [
        ...formData.models,
        {
          id: modelName.trim(),
          name: modelName.trim(),
          enabled: true
        }
      ];
    }
  }

  function removeModel(index: number) {
    formData.models = formData.models.filter((_, i) => i !== index);
  }

  function toggleModel(index: number) {
    formData.models[index].enabled = !formData.models[index].enabled;
    formData.models = [...formData.models];
  }

  function getDefaultBaseUrl(providerId: string): string {
    switch (providerId) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'claude':
        return 'https://api.anthropic.com/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      default:
        return '';
    }
  }

  $: if (formData.id && formData.isBuiltIn && !formData.baseUrl) {
    formData.baseUrl = getDefaultBaseUrl(formData.id);
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="modal-title">
          {provider ? `编辑 ${provider.name}` : '添加自定义服务提供商'}
        </h2>
        <button class="modal-close" on:click={handleCancel}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <form on:submit|preventDefault={handleSave} class="form">
          <!-- Basic Info -->
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>
            
            {#if !formData.isBuiltIn}
              <div class="form-group">
                <label for="name" class="form-label">服务商名称 *</label>
                <input
                  id="name"
                  type="text"
                  bind:value={formData.name}
                  class="form-input"
                  placeholder="例如: OpenAI"
                  required
                />
              </div>

              <div class="form-group">
                <label for="icon" class="form-label">图标</label>
                <input
                  id="icon"
                  type="text"
                  bind:value={formData.icon}
                  class="form-input"
                  placeholder="例如: 🤖"
                />
              </div>
            {/if}
          </div>

          <!-- API Configuration -->
          <div class="form-section">
            <h3 class="section-title">API 配置</h3>
            
            <div class="form-group">
              <label for="apiKey" class="form-label">API Key *</label>
              <div class="input-with-button">
                <input
                  id="apiKey"
                  type="password"
                  bind:value={formData.apiKey}
                  class="form-input"
                  placeholder="输入您的 API Key"
                  required
                  on:input={() => console.log('🔧 [ServiceProviderModal] API Key input:', formData.apiKey)}
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  on:click={() => {
                    const input = document.getElementById('apiKey');
                    if (input && input instanceof HTMLInputElement) {
                      input.type = input.type === 'password' ? 'text' : 'password';
                    }
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="baseUrl" class="form-label">API 代理 URL {formData.isBuiltIn ? '(可选)' : '*'}</label>
              <input
                id="baseUrl"
                type="url"
                bind:value={formData.baseUrl}
                class="form-input"
                placeholder={formData.isBuiltIn ? '留空使用默认端点' : 'https://api.example.com/v1'}
                required={!formData.isBuiltIn}
              />
            </div>

            <div class="form-group">
              <div class="connection-test">
                <button
                  type="button"
                  class="btn btn-outline"
                  on:click={testConnection}
                  disabled={isLoading}
                >
                  {#if isLoading}
                    <svg width="16" height="16" class="animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    测试中...
                  {:else}
                    检查连接
                  {/if}
                </button>

                {#if testResult}
                  <span class="test-result {testResult.success ? 'test-success' : 'test-error'}">
                    {testResult.message}
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Model Management -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title">模型列表 ({formData.models?.length || 0} 个模型)</h3>
              <div class="section-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  on:click={updateModelList}
                  disabled={isLoading}
                >
                  {#if isLoading}
                    <svg width="16" height="16" class="animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    更新中...
                  {:else}
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update list
                  {/if}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  on:click={addModel}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  添加
                </button>
              </div>
            </div>

            {#if formData.models?.length > 0}
              <div class="model-list">
                {#each formData.models as model, index (model.id)}
                  <div class="model-item">
                    <div class="model-info">
                      <span class="model-name">{model.name}</span>
                    </div>
                    <div class="model-actions">
                      <label class="toggle-switch">
                        <input
                          type="checkbox"
                          checked={model.enabled}
                          on:change={() => toggleModel(index)}
                        />
                        <span class="toggle-slider"></span>
                      </label>
                      <button
                        type="button"
                        class="btn btn-danger btn-xs"
                        on:click={() => removeModel(index)}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="empty-models">
                <p>暂无模型，点击"Update list"自动获取或手动添加</p>
              </div>
            {/if}
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" on:click={handleCancel}>
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    background: white;
    border-radius: 1rem;
    max-width: 48rem;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideIn 0.3s ease-out;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-actions {
    display: flex;
    gap: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input {
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input-with-button {
    display: flex;
    gap: 0.5rem;
  }

  .input-with-button .form-input {
    flex: 1;
  }

  .connection-test {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .test-result {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .test-success {
    color: #059669;
  }

  .test-error {
    color: #dc2626;
  }

  .model-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 12rem;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem;
  }

  .model-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .model-info {
    flex: 1;
  }

  .model-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .model-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 2.5rem;
    height: 1.25rem;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.2s;
    border-radius: 1.25rem;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 1rem;
    width: 1rem;
    left: 0.125rem;
    bottom: 0.125rem;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #10b981;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(1.25rem);
  }

  .empty-models {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    background: #f9fafb;
    border: 1px dashed #d1d5db;
    border-radius: 0.5rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }

  .btn-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }

  .btn-secondary {
    background: #f8fafc;
    color: #374151;
    border-color: #e5e7eb;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #d1d5db;
  }

  .btn-outline {
    background: transparent;
    color: #374151;
    border-color: #e5e7eb;
  }

  .btn-outline:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  .btn-danger:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #fca5a5;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>

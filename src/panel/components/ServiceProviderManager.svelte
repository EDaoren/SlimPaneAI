<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ServiceProviderCard from './ServiceProviderCard.svelte';
  import ServiceProviderModal from './ServiceProviderModal.svelte';
  import { getDefaultServiceProviders } from '@/lib/service-providers';
  import type { ServiceProvider, ServiceProviderSettings } from '@/types';

  export let serviceProviders: ServiceProviderSettings = {};

  const dispatch = createEventDispatcher<{
    update: { serviceProviders: ServiceProviderSettings };
  }>();

  let showModal = false;
  let editingProvider: ServiceProvider | null = null;

  // Convert object to array for easier iteration
  $: providerList = Object.values(serviceProviders);
  $: hasProviders = providerList.length > 0;

  function handleAddCustomProvider() {
    editingProvider = null;
    showModal = true;
  }

  function handleEditProvider(event: CustomEvent<{ provider: ServiceProvider }>) {
    editingProvider = event.detail.provider;
    showModal = true;
  }

  function handleToggleProvider(event: CustomEvent<{ providerId: string; enabled: boolean }>) {
    const { providerId, enabled } = event.detail;
    const updatedProviders = {
      ...serviceProviders,
      [providerId]: {
        ...serviceProviders[providerId],
        enabled
      }
    };
    dispatch('update', { serviceProviders: updatedProviders });
  }

  function handleSetDefault(event: CustomEvent<{ providerId: string }>) {
    const { providerId } = event.detail;
    const updatedProviders = { ...serviceProviders };
    
    // Remove default from all providers
    Object.keys(updatedProviders).forEach(id => {
      updatedProviders[id].isDefault = false;
    });
    
    // Set new default
    updatedProviders[providerId].isDefault = true;
    
    dispatch('update', { serviceProviders: updatedProviders });
  }

  function handleDeleteProvider(event: CustomEvent<{ providerId: string }>) {
    const { providerId } = event.detail;
    const updatedProviders = { ...serviceProviders };
    delete updatedProviders[providerId];
    dispatch('update', { serviceProviders: updatedProviders });
  }

  function handleSaveProvider(event: CustomEvent<{ provider: ServiceProvider }>) {
    const { provider } = event.detail;
    console.log('🔧 [ServiceProviderManager] Saving provider:', provider);
    const updatedProviders = {
      ...serviceProviders,
      [provider.id]: provider
    };
    console.log('🔧 [ServiceProviderManager] Updated providers:', updatedProviders);
    dispatch('update', { serviceProviders: updatedProviders });
    showModal = false;
    editingProvider = null;
  }

  function handleCancelModal() {
    showModal = false;
    editingProvider = null;
  }

  // Initialize with built-in providers if empty
  function initializeBuiltInProviders() {
    const builtInProviders = getDefaultServiceProviders();
    dispatch('update', { serviceProviders: builtInProviders });
  }
</script>

<div class="service-provider-manager">
  {#if !hasProviders}
    <!-- Empty State -->
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div class="empty-content">
        <h3 class="empty-title">配置 AI 服务提供商</h3>
        <p class="empty-description">
          开始配置您的 AI 服务提供商，支持 OpenAI、Claude、Gemini 等多种服务。
        </p>
        <button class="btn-get-started" on:click={initializeBuiltInProviders}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          开始配置
        </button>
      </div>
    </div>
  {:else}
    <!-- Provider List -->
    <div class="provider-list">
      <div class="provider-header">
        <div class="header-info">
          <h3 class="header-title">服务提供商</h3>
          <p class="header-description">
            管理您的 AI 服务提供商配置，支持内置和自定义服务商
          </p>
        </div>
        <div class="header-actions">
          <select class="provider-filter">
            <option value="all">全部服务商</option>
            <option value="enabled">已启用</option>
            <option value="builtin">内置服务商</option>
            <option value="custom">自定义服务商</option>
          </select>
          <button class="btn btn-primary" on:click={handleAddCustomProvider}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            自定义 API 密钥
          </button>
        </div>
      </div>

      <div class="provider-grid">
        {#each providerList as provider (provider.id)}
          <ServiceProviderCard
            {provider}
            on:edit={handleEditProvider}
            on:toggle={handleToggleProvider}
            on:setDefault={handleSetDefault}
            on:delete={handleDeleteProvider}
          />
        {/each}
      </div>

      {#if providerList.filter(p => p.enabled).length === 0}
        <div class="no-enabled-providers">
          <div class="warning-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="warning-content">
            <h4 class="warning-title">没有启用的服务提供商</h4>
            <p class="warning-description">
              请至少启用一个服务提供商并配置 API Key 才能使用 AI 功能。
            </p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Modal -->
<ServiceProviderModal
  provider={editingProvider}
  isOpen={showModal}
  on:save={handleSaveProvider}
  on:cancel={handleCancelModal}
/>

<style>
  .service-provider-manager {
    width: 100%;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
    max-width: 32rem;
    margin: 0 auto;
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #bae6fd;
    border-radius: 50%;
    margin-bottom: 1.5rem;
    color: #0284c7;
  }

  .empty-content {
    width: 100%;
  }

  .empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1rem 0;
  }

  .empty-description {
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.6;
    margin: 0 0 2rem 0;
  }

  .btn-get-started {
    display: inline-flex;
    align-items: center;
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
    box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
  }

  .btn-get-started:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px -2px rgba(59, 130, 246, 0.4);
  }

  /* Provider List */
  .provider-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .provider-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 2rem;
  }

  .header-info {
    flex: 1;
  }

  .header-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .header-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .provider-filter {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: white;
    color: #374151;
  }

  .provider-filter:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

  .btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
    gap: 1.5rem;
  }

  /* Warning for no enabled providers */
  .no-enabled-providers {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 0.75rem;
    margin-top: 1rem;
  }

  .warning-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: #f59e0b;
    color: white;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-title {
    font-size: 1rem;
    font-weight: 600;
    color: #92400e;
    margin: 0 0 0.25rem 0;
  }

  .warning-description {
    font-size: 0.875rem;
    color: #b45309;
    margin: 0;
    line-height: 1.4;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .provider-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .header-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .provider-grid {
      grid-template-columns: 1fr;
    }

    .no-enabled-providers {
      flex-direction: column;
      text-align: center;
    }
  }
</style>

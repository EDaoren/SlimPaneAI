<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ServiceProvider } from '@/types';

  export let provider: ServiceProvider;

  const dispatch = createEventDispatcher<{
    edit: { provider: ServiceProvider };
    toggle: { providerId: string; enabled: boolean };
    setDefault: { providerId: string };
    delete: { providerId: string };
  }>();

  function handleEdit() {
    dispatch('edit', { provider });
  }

  function handleToggle() {
    dispatch('toggle', { providerId: provider.id, enabled: !provider.enabled });
  }

  function handleSetDefault() {
    dispatch('setDefault', { providerId: provider.id });
  }

  function handleDelete() {
    if (confirm(`确定要删除服务提供商 "${provider.name}" 吗？`)) {
      dispatch('delete', { providerId: provider.id });
    }
  }

  function getProviderIcon(provider: ServiceProvider): string {
    if (provider.icon) return provider.icon;
    
    // Default icons for built-in providers
    switch (provider.id) {
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      case 'gemini':
        return '💎';
      default:
        return '⚡';
    }
  }

  function getProviderBadgeClass(provider: ServiceProvider): string {
    if (!provider.enabled) return 'provider-badge-disabled';
    if (provider.isDefault) return 'provider-badge-default';
    
    switch (provider.id) {
      case 'openai':
        return 'provider-badge-openai';
      case 'claude':
        return 'provider-badge-claude';
      case 'gemini':
        return 'provider-badge-gemini';
      default:
        return 'provider-badge-custom';
    }
  }
</script>

<div class="provider-card {provider.enabled ? 'provider-enabled' : 'provider-disabled'}">
  <div class="provider-header">
    <div class="provider-info">
      <div class="provider-icon">
        {getProviderIcon(provider)}
      </div>
      <div class="provider-details">
        <h3 class="provider-name">{provider.name}</h3>
        <div class="provider-badges">
          <span class="provider-badge {getProviderBadgeClass(provider)}">
            {#if !provider.enabled}
              已禁用
            {:else if provider.isDefault}
              默认
            {:else if provider.isBuiltIn}
              内置
            {:else}
              自定义
            {/if}
          </span>
          {#if provider.enabled}
            <span class="model-count">{provider.models.filter(m => m.enabled).length} 个模型</span>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="provider-actions">
      <label class="toggle-switch">
        <input
          type="checkbox"
          checked={provider.enabled}
          on:change={handleToggle}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  {#if provider.enabled}
    <div class="provider-body">
      <div class="provider-stats">
        <div class="stat-item">
          <span class="stat-label">API状态</span>
          <span class="stat-value {provider.apiKey ? 'status-configured' : 'status-missing'}">
            {provider.apiKey ? '已配置' : '未配置'}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">端点</span>
          <span class="stat-value">{provider.baseUrl ? '自定义' : '默认'}</span>
        </div>
      </div>

      <div class="provider-footer">
        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" on:click={handleEdit}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </button>
          
          {#if !provider.isDefault && provider.enabled}
            <button class="btn btn-outline btn-sm" on:click={handleSetDefault}>
              设为默认
            </button>
          {/if}
          
          {#if !provider.isBuiltIn}
            <button class="btn btn-danger btn-sm" on:click={handleDelete}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .provider-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .provider-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .provider-enabled {
    border-color: #10b981;
  }

  .provider-disabled {
    opacity: 0.6;
    background: #f9fafb;
  }

  .provider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
  }

  .provider-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .provider-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #bae6fd;
    border-radius: 0.75rem;
    font-size: 1.5rem;
  }

  .provider-details {
    flex: 1;
  }

  .provider-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .provider-badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .provider-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .provider-badge-openai {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .provider-badge-claude {
    background: #fef3c7;
    color: #d97706;
  }

  .provider-badge-gemini {
    background: #ecfdf5;
    color: #059669;
  }

  .provider-badge-custom {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .provider-badge-default {
    background: #fef2f2;
    color: #dc2626;
  }

  .provider-badge-disabled {
    background: #f3f4f6;
    color: #6b7280;
  }

  .model-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 3rem;
    height: 1.5rem;
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
    border-radius: 1.5rem;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 1.125rem;
    width: 1.125rem;
    left: 0.1875rem;
    bottom: 0.1875rem;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #10b981;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(1.5rem);
  }

  .provider-body {
    border-top: 1px solid #f1f5f9;
    padding: 1rem 1.5rem;
  }

  .provider-stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .stat-value {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-configured {
    color: #059669;
  }

  .status-missing {
    color: #dc2626;
  }

  .provider-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .btn-secondary {
    background: #f8fafc;
    color: #374151;
    border-color: #e5e7eb;
  }

  .btn-secondary:hover {
    background: #f1f5f9;
    border-color: #d1d5db;
  }

  .btn-outline {
    background: transparent;
    color: #374151;
    border-color: #e5e7eb;
  }

  .btn-outline:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  .btn-danger:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }
</style>

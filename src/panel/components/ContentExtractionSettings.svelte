<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import type { DomainSettings, ContentExtractionSettings } from '@/types';
  import { domainSettingsManager } from '@/lib/domain-settings';
  import { t } from '@/lib/i18n';

  // Props
  export let domain: string;
  export let onClose: () => void = () => {};

  // State
  const settings = writable<DomainSettings | null>(null);
  const isLoading = writable(false);
  const isSaving = writable(false);

  let formData: ContentExtractionSettings = {
    enabled: true,
    autoExtract: false,
    includeImages: false,
    includeLinks: true,
    maxTokens: 8000,
    excludeSelectors: [],
    includeSelectors: []
  };

  let excludeSelectorsText = '';
  let includeSelectorsText = '';

  onMount(async () => {
    await loadSettings();
  });

  async function loadSettings() {
    isLoading.set(true);
    try {
      const domainSettings = await domainSettingsManager.getDomainSettings(domain);
      settings.set(domainSettings);
      
      // Update form data
      formData = { ...domainSettings.extractionSettings };
      excludeSelectorsText = formData.excludeSelectors.join('\n');
      includeSelectorsText = formData.includeSelectors.join('\n');
    } catch (error) {
      console.error('Failed to load domain settings:', error);
    } finally {
      isLoading.set(false);
    }
  }

  async function saveSettings() {
    isSaving.set(true);
    try {
      // Parse selectors from text
      formData.excludeSelectors = excludeSelectorsText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      formData.includeSelectors = includeSelectorsText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Update domain settings
      await domainSettingsManager.updateExtractionSettings(domain, formData);
      
      // Reload settings to confirm
      await loadSettings();
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存设置失败，请重试');
    } finally {
      isSaving.set(false);
    }
  }

  async function applySmartSettings() {
    try {
      await domainSettingsManager.applySmartSettings(domain);
      await loadSettings();
    } catch (error) {
      console.error('Failed to apply smart settings:', error);
    }
  }

  function resetToDefaults() {
    formData = {
      enabled: true,
      autoExtract: false,
      includeImages: false,
      includeLinks: true,
      maxTokens: 8000,
      excludeSelectors: [],
      includeSelectors: []
    };
    excludeSelectorsText = '';
    includeSelectorsText = '';
  }
</script>

<div class="settings-modal">
  <div class="modal-backdrop" on:click={onClose}></div>
  
  <div class="modal-content">
    <!-- Header -->
    <div class="modal-header">
      <h2 class="modal-title">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {$t('pageContent.domainSettings')} - {domain}
      </h2>
      
      <button class="close-button" on:click={onClose}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="modal-body">
      {#if $isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>{$t('common.loading')}</span>
        </div>
      {:else}
        <form on:submit|preventDefault={saveSettings}>
          <!-- Basic Settings -->
          <div class="form-section">
            <h3 class="section-title">{$t('common.basicSettings')}</h3>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={formData.enabled} />
                <span class="checkbox-text">{$t('pageContent.enable')}</span>
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={formData.autoExtract} />
                <span class="checkbox-text">{$t('pageContent.autoExtract')}</span>
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={formData.includeImages} />
                <span class="checkbox-text">{$t('pageContent.includeImages')}</span>
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={formData.includeLinks} />
                <span class="checkbox-text">{$t('pageContent.includeLinks')}</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">{$t('pageContent.maxTokens')}</label>
              <input 
                type="number" 
                bind:value={formData.maxTokens}
                min="1000"
                max="100000"
                step="1000"
                class="form-input"
              />
            </div>
          </div>

          <!-- Advanced Settings -->
          <div class="form-section">
            <h3 class="section-title">{$t('common.advancedSettings')}</h3>
            
            <div class="form-group">
              <label class="form-label">{$t('pageContent.excludeSelectors')}</label>
              <textarea 
                bind:value={excludeSelectorsText}
                placeholder=".advertisement&#10;.sidebar&#10;.navigation"
                class="form-textarea"
                rows="4"
              ></textarea>
              <div class="form-help">每行一个CSS选择器，用于排除不需要的元素</div>
            </div>

            <div class="form-group">
              <label class="form-label">{$t('pageContent.includeSelectors')}</label>
              <textarea 
                bind:value={includeSelectorsText}
                placeholder=".content&#10;.article&#10;main"
                class="form-textarea"
                rows="4"
              ></textarea>
              <div class="form-help">每行一个CSS选择器，只提取匹配的元素（留空则提取全部）</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" on:click={applySmartSettings}>
              {$t('pageContent.applySmartSettings')}
            </button>
            
            <button type="button" class="btn btn-secondary" on:click={resetToDefaults}>
              {$t('common.reset')}
            </button>
            
            <div class="action-group">
              <button type="button" class="btn btn-secondary" on:click={onClose}>
                {$t('common.cancel')}
              </button>
              
              <button type="submit" class="btn btn-primary" disabled={$isSaving}>
                {#if $isSaving}
                  <div class="btn-spinner"></div>
                {/if}
                {$t('common.save')}
              </button>
            </div>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  .modal-content {
    position: relative;
    background: var(--bg-primary);
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    color: var(--text-muted);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--border-primary);
    border-top: 2px solid var(--text-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .form-section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-text {
    color: var(--text-primary);
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
    font-family: monospace;
  }

  .form-help {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-primary);
  }

  .action-group {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background: var(--bg-secondary);
  }

  .btn-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
</style>

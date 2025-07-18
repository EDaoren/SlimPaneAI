<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import type { PageContent, DomainSettings, PDFProcessingStatus } from '@/types';
  import { domainSettingsManager } from '@/lib/domain-settings';
  import { pageChatStore } from '@/panel/stores/page-chat';
  import { TokenEstimator } from '@/lib/token-estimator';
  import { t } from '@/lib/i18n';

  // Props
  export let visible = false;
  export let onContentSelect: (content: string) => void = () => {};

  // State
  const pageContent = writable<PageContent | null>(null);
  const domainSettings = writable<DomainSettings | null>(null);
  const pdfStatus = writable<PDFProcessingStatus | null>(null);
  const isLoading = writable(false);
  const error = writable<string | null>(null);

  let currentDomain = '';
  let tokenStats: any = null;

  // Reactive statements
  $: if ($pageContent) {
    tokenStats = TokenEstimator.getTokenStats($pageContent.content);
  }

  // Export function to handle messages from parent
  export function handleMessage(message: any) {
    switch (message.type) {
      case 'page-content-extracted':
        if (message.payload.content) {
          pageContent.set(message.payload.content);
          error.set(null);
        }
        break;
      case 'pdf-processing-status':
        if (message.payload.status) {
          pdfStatus.set(message.payload.status);
        }
        break;
      case 'tab-switched':
      case 'page-navigated':
        // When tab switches or page navigates, reload content
        handleTabSwitch(message.payload);
        break;
    }
  }

  // Handle tab switch with page chat store update
  async function handleTabSwitch(payload: { tabId: number; url: string; title: string }) {
    // Clear current content immediately to show loading state
    pageContent.set(null);
    error.set(null);

    // Update page chat store if it's enabled
    const pageChatState = $pageChatStore;
    if (pageChatState.enabled) {
      // This will trigger content extraction for the new tab
      await pageChatStore.refresh();
    }

    // Also reload content for the page content panel
    await loadCurrentPageContent();
  }

  onMount(() => {
    loadCurrentPageContent();
  });

  async function loadCurrentPageContent() {
    isLoading.set(true);
    error.set(null);

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        throw new Error('No active tab found');
      }

      currentDomain = new URL(tab.url).hostname;

      // Load domain settings
      const settings = await domainSettingsManager.getDomainSettings(currentDomain);
      domainSettings.set(settings);

      // For tab switches, directly use background script extraction
      // This is more reliable than trying content script first
      await extractPageContent();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load page content';
      console.error('SlimPaneAI: loadCurrentPageContent failed:', errorMessage);
      error.set(errorMessage);
    } finally {
      isLoading.set(false);
    }
  }

  async function extractPageContent() {
    isLoading.set(true);
    error.set(null);

    try {
      // Send message to background script to extract content
      const response = await chrome.runtime.sendMessage({
        type: 'extract-page-content'
      });

      if (response?.success) {
        if (response.content) {
          pageContent.set(response.content);
        } else {
          // Special page or no content
          pageContent.set(null);
          throw new Error(response.error || '当前页面不支持内容提取');
        }
      } else {
        throw new Error(response?.error || 'Failed to extract content');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract page content';
      console.error('SlimPaneAI: Content extraction failed:', errorMessage);
      error.set(errorMessage);
    } finally {
      isLoading.set(false);
    }
  }

  async function toggleDomainEnabled() {
    if (!currentDomain) return;

    try {
      const newState = await domainSettingsManager.toggleDomainEnabled(currentDomain);
      const settings = await domainSettingsManager.getDomainSettings(currentDomain);
      domainSettings.set(settings);

      if (newState) {
        await extractPageContent();
      } else {
        pageContent.set(null);
      }
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to toggle domain settings');
    }
  }

  function handleUseContent() {
    if ($pageContent?.content) {
      onContentSelect($pageContent.content);
    }
  }

  function handleUseSelection(text: string) {
    onContentSelect(text);
  }

  function formatTokenCount(count: number): string {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  }

  function getContentPreview(content: string, maxLength = 200): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }
</script>

{#if visible}
  <div class="page-content-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{$t('pageContent.title')}</span>
      </div>
      
      {#if currentDomain}
        <div class="domain-toggle">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              checked={$domainSettings?.enabled || false}
              on:change={toggleDomainEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
          <span class="domain-name">{currentDomain}</span>
        </div>
      {/if}
    </div>

    <!-- Content Area -->
    <div class="panel-content">
      {#if $isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>{$t('common.loading')}</span>
        </div>
      {:else if $error}
        <div class="error-state">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="error-message">{$error}</p>
          <button class="retry-button" on:click={extractPageContent}>
            {$t('common.retry')}
          </button>
        </div>
      {:else if !$domainSettings?.enabled}
        <div class="disabled-state">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p>{$t('pageContent.disabled')}</p>
          <button class="enable-button" on:click={toggleDomainEnabled}>
            {$t('pageContent.enable')}
          </button>
        </div>
      {:else if $pdfStatus && $pdfStatus.status !== 'completed'}
        <div class="pdf-processing">
          <div class="pdf-status">
            <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{$t('pageContent.processingPDF')}</span>
          </div>
          
          {#if $pdfStatus.totalPages}
            <div class="progress-info">
              <div class="progress-bar">
                <div class="progress-fill" style="width: {$pdfStatus.progress}%"></div>
              </div>
              <span class="progress-text">
                {$pdfStatus.currentPage || 0} / {$pdfStatus.totalPages} pages
              </span>
            </div>
          {/if}
        </div>
      {:else if $pageContent}
        <div class="content-display">
          <!-- Content Info -->
          <div class="content-info">
            <div class="content-meta">
              <span class="content-type">{$pageContent.contentType.toUpperCase()}</span>
              <span class="content-title">{$pageContent.title}</span>
            </div>
            
            {#if tokenStats}
              <div class="token-stats">
                <span class="token-count" class:warning={tokenStats.usagePercentage > 70} class:error={tokenStats.usagePercentage > 90}>
                  {formatTokenCount(tokenStats.totalTokens)} tokens
                </span>
                <span class="usage-percentage">({tokenStats.usagePercentage}%)</span>
              </div>
            {/if}
          </div>

          <!-- Content Preview -->
          <div class="content-preview">
            <div class="preview-text">
              {getContentPreview($pageContent.content)}
            </div>
          </div>

          <!-- Actions -->
          <div class="content-actions">
            <button class="action-button primary" on:click={handleUseContent}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {$t('pageContent.useContent')}
            </button>
            
            <button class="action-button secondary" on:click={extractPageContent}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {$t('pageContent.refresh')}
            </button>
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>{$t('pageContent.noContent')}</p>
          <button class="extract-button" on:click={extractPageContent}>
            {$t('pageContent.extract')}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page-content-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-primary);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .domain-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
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
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .domain-name {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .loading-state,
  .error-state,
  .disabled-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    text-align: center;
    gap: 1rem;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-primary);
    border-top: 3px solid var(--text-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    color: var(--text-muted);
    margin: 0;
  }

  .retry-button,
  .enable-button,
  .extract-button {
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-button:hover,
  .enable-button:hover,
  .extract-button:hover {
    background: var(--bg-secondary);
  }

  .pdf-processing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  }

  .pdf-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
  }

  .progress-info {
    width: 100%;
    max-width: 200px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-align: center;
    display: block;
  }

  .content-display {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .content-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .content-meta {
    flex: 1;
  }

  .content-type {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .content-title {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .token-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .token-count {
    font-weight: 600;
    color: var(--text-primary);
  }

  .token-count.warning {
    color: #f59e0b;
  }

  .token-count.error {
    color: #ef4444;
  }

  .usage-percentage {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .content-preview {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .preview-text {
    color: var(--text-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .content-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .action-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .action-button.primary:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .action-button.secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .action-button.secondary:hover {
    background: var(--bg-secondary);
  }
</style>

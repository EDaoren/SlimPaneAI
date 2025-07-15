<script lang="ts">
  import { pageChatStore } from '@/panel/stores/page-chat';
  import { t } from '@/lib/i18n';

  $: state = $pageChatStore;

  function handleToggle() {
    pageChatStore.toggle();
  }

  function handleRefresh() {
    pageChatStore.refresh();
  }

  // 格式化内容长度显示
  function formatContentLength(content: string | null): string {
    if (!content) return '0';
    const length = content.length;
    if (length < 1000) return length.toString();
    if (length < 1000000) return `${(length / 1000).toFixed(1)}K`;
    return `${(length / 1000000).toFixed(1)}M`;
  }
</script>

<div class="page-chat-toggle">
  <!-- 主开关 -->
  <div class="toggle-main">
    <button 
      class="toggle-button" 
      class:active={state.enabled}
      on:click={handleToggle}
      title={state.enabled ? $t('pageChat.disable') : $t('pageChat.enable')}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="toggle-text">{$t('pageChat.title')}</span>
    </button>

    <!-- 状态指示器 -->
    {#if state.enabled}
      <div class="status-indicator">
        {#if state.isExtracting}
          <div class="loading-spinner"></div>
        {:else if state.error}
          <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if state.currentPageContent}
          <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 详细信息（启用时显示） -->
  {#if state.enabled}
    <div class="toggle-details">
      {#if state.isExtracting}
        <div class="status-text extracting">
          {$t('pageChat.extracting')}
        </div>
      {:else if state.error}
        <div class="status-text error">
          {state.error}
          <button class="retry-button" on:click={handleRefresh}>
            {$t('common.retry')}
          </button>
        </div>
      {:else if state.currentPageContent}
        <div class="content-info">
          <div class="content-title" title={state.currentPageUrl}>
            {state.currentPageTitle}
          </div>
          <div class="content-stats">
            <span class="content-length">
              {formatContentLength(state.currentPageContent)} {$t('pageChat.characters')}
            </span>
            <button class="refresh-button" on:click={handleRefresh} title={$t('pageChat.refresh')}>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      {:else}
        <div class="status-text">
          {$t('pageChat.noContent')}
          <button class="retry-button" on:click={handleRefresh}>
            {$t('pageChat.extract')}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page-chat-toggle {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .toggle-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    flex: 1;
  }

  .toggle-button:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-secondary);
  }

  .toggle-button.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .toggle-button.active:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .toggle-text {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
  }

  .loading-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-primary);
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .toggle-details {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-secondary);
  }

  .status-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-text.extracting {
    color: #3b82f6;
  }

  .status-text.error {
    color: #ef4444;
  }

  .retry-button,
  .refresh-button {
    padding: 0.125rem 0.375rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-button:hover,
  .refresh-button:hover {
    background: var(--bg-secondary);
    border-color: var(--border-secondary);
  }

  .refresh-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    min-width: auto;
  }

  .content-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .content-title {
    font-size: 0.75rem;
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content-stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .content-length {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>

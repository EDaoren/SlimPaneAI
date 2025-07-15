<script lang="ts">
  import { pageChatStore } from '../stores/page-chat';

  export let compact = false;

  $: state = $pageChatStore;

  function handleRetry() {
    pageChatStore.retryExtraction();
  }

  function isSpecialPageError(error: string | null): boolean {
    return error?.includes('不支持内容提取') ||
           error?.includes('浏览器内部页面') ||
           error?.includes('特殊页面') ||
           false;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'extracting':
        return '⏳';
      case 'success':
        return '✅';
      case 'failed':
        return '⚠️';
      default:
        return '○';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'extracting':
        return '提取中...';
      case 'success':
        return '内容已提取';
      case 'failed':
        return '提取失败';
      default:
        return '未提取';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'extracting':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  }
</script>

{#if state.enabled}
  <div class="page-chat-status" class:compact>
    <div class="status-indicator">
      <span class="status-icon">{getStatusIcon(state.status)}</span>
      <span class="status-text {getStatusColor(state.status)}">
        {getStatusText(state.status)}
      </span>
    </div>

    {#if state.status === 'failed' && !isSpecialPageError(state.error)}
      <button
        class="retry-button"
        on:click={handleRetry}
        disabled={state.status === 'extracting'}
        title="重试提取页面内容"
      >
        重试
      </button>
    {/if}

    {#if state.error && !compact}
      <div class="error-message">
        {state.error}
      </div>
    {/if}
  </div>
{/if}

<style>
  .page-chat-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    font-size: 12px;
  }

  .page-chat-status.compact {
    padding: 4px 6px;
    gap: 6px;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .status-icon {
    font-size: 14px;
  }

  .status-text {
    font-weight: 500;
  }

  .retry-button {
    padding: 2px 8px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-button:hover:not(:disabled) {
    background: #0056b3;
  }

  .retry-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .error-message {
    flex: 1;
    color: #dc3545;
    font-size: 11px;
    margin-left: 4px;
  }

  /* 深色主题支持 */
  :global(.dark) .page-chat-status {
    background: #2d3748;
    border-color: #4a5568;
  }

  :global(.dark) .status-text {
    color: #e2e8f0;
  }

  :global(.dark) .error-message {
    color: #fc8181;
  }
</style>

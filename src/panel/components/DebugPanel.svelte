<script lang="ts">
  import { onMount } from 'svelte';
  import { geminiDebugger } from '../../lib/debug/gemini-debugger';

  let isVisible = false;
  let debugLog: any[] = [];
  let report = '';

  function toggleVisibility() {
    isVisible = !isVisible;
    if (isVisible) {
      refreshData();
    }
  }

  function refreshData() {
    debugLog = geminiDebugger.getDebugLog();
    report = geminiDebugger.generateReport();
  }

  function clearLog() {
    geminiDebugger.clearLog();
    refreshData();
  }

  function exportLog() {
    const data = geminiDebugger.exportLog();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 在开发环境中显示调试面板
  onMount(() => {
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      // 自动刷新数据
      const interval = setInterval(refreshData, 2000);
      return () => clearInterval(interval);
    }
  });
</script>

<!-- 调试面板切换按钮 -->
{#if typeof window !== 'undefined' && window.location?.hostname === 'localhost'}
  <div class="debug-toggle">
    <button 
      on:click={toggleVisibility}
      class="debug-btn"
      title="Gemini 调试面板"
    >
      🔧
    </button>
  </div>
{/if}

<!-- 调试面板 -->
{#if isVisible}
  <div class="debug-panel">
    <div class="debug-header">
      <h3>🔍 Gemini 调试面板</h3>
      <div class="debug-actions">
        <button on:click={refreshData} class="btn-small">刷新</button>
        <button on:click={clearLog} class="btn-small">清空</button>
        <button on:click={exportLog} class="btn-small">导出</button>
        <button on:click={toggleVisibility} class="btn-small">关闭</button>
      </div>
    </div>

    <div class="debug-content">
      <!-- 报告摘要 -->
      <div class="debug-section">
        <h4>📊 摘要报告</h4>
        <pre class="debug-report">{report}</pre>
      </div>

      <!-- 最近的日志 -->
      <div class="debug-section">
        <h4>📝 最近日志 (最新 10 条)</h4>
        <div class="debug-logs">
          {#each debugLog.slice(-10).reverse() as log}
            <div class="debug-log-item" class:has-error={log.errors.length > 0}>
              <div class="log-header">
                <span class="log-chunk">Chunk #{log.chunkNumber}</span>
                <span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="log-status">
                  {#if log.contentFound}✅{/if}
                  {#if log.thinkingFound}🧠{/if}
                  {#if log.errors.length > 0}❌{/if}
                </span>
              </div>
              
              {#if log.errors.length > 0}
                <div class="log-errors">
                  {#each log.errors as error}
                    <div class="error-item">❌ {error}</div>
                  {/each}
                </div>
              {/if}

              <details class="log-details">
                <summary>查看详情</summary>
                <div class="log-content">
                  <div><strong>原始数据:</strong></div>
                  <pre class="log-raw">{log.rawChunk.substring(0, 300)}...</pre>
                  
                  <div><strong>解析结果:</strong></div>
                  <pre class="log-parsed">{JSON.stringify(log.parsedData, null, 2)}</pre>
                </div>
              </details>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .debug-toggle {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
  }

  .debug-btn {
    background: #007acc;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .debug-btn:hover {
    background: #005a9e;
  }

  .debug-panel {
    position: fixed;
    top: 60px;
    right: 10px;
    width: 500px;
    max-height: 80vh;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    z-index: 9999;
    overflow: hidden;
    font-family: monospace;
    font-size: 12px;
  }

  .debug-header {
    background: #f5f5f5;
    padding: 10px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .debug-header h3 {
    margin: 0;
    font-size: 14px;
  }

  .debug-actions {
    display: flex;
    gap: 5px;
  }

  .btn-small {
    padding: 4px 8px;
    font-size: 11px;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-small:hover {
    background: #f0f0f0;
  }

  .debug-content {
    max-height: 60vh;
    overflow-y: auto;
    padding: 10px;
  }

  .debug-section {
    margin-bottom: 15px;
  }

  .debug-section h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #333;
  }

  .debug-report {
    background: #f8f8f8;
    padding: 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: pre-wrap;
    margin: 0;
  }

  .debug-logs {
    max-height: 300px;
    overflow-y: auto;
  }

  .debug-log-item {
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 8px;
    padding: 8px;
  }

  .debug-log-item.has-error {
    border-color: #ff6b6b;
    background: #fff5f5;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }

  .log-chunk {
    font-weight: bold;
    color: #007acc;
  }

  .log-time {
    color: #666;
    font-size: 10px;
  }

  .log-status {
    font-size: 14px;
  }

  .log-errors {
    margin: 5px 0;
  }

  .error-item {
    color: #d63031;
    font-size: 11px;
    margin: 2px 0;
  }

  .log-details summary {
    cursor: pointer;
    color: #007acc;
    font-size: 11px;
  }

  .log-content {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid #eee;
  }

  .log-raw, .log-parsed {
    background: #f8f8f8;
    padding: 5px;
    border-radius: 3px;
    font-size: 10px;
    margin: 3px 0;
    overflow-x: auto;
  }

  /* 深色主题支持 */
  :global(.dark) .debug-panel {
    background: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  :global(.dark) .debug-header {
    background: #3d3d3d;
    border-color: #555;
  }

  :global(.dark) .btn-small {
    background: #4d4d4d;
    border-color: #666;
    color: #e0e0e0;
  }

  :global(.dark) .btn-small:hover {
    background: #5d5d5d;
  }

  :global(.dark) .debug-report,
  :global(.dark) .log-raw,
  :global(.dark) .log-parsed {
    background: #3d3d3d;
    color: #e0e0e0;
  }

  :global(.dark) .debug-log-item {
    border-color: #555;
    background: #3d3d3d;
  }

  :global(.dark) .debug-log-item.has-error {
    border-color: #ff6b6b;
    background: #4d2d2d;
  }
</style>

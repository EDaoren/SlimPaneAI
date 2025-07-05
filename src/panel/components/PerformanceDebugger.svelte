<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { perfMonitor } from '@/lib/performance-monitor';
  import { mathRenderer } from '@/lib/math-renderer';

  export let isVisible = false;
  let metrics: any[] = [];
  let memoryInfo: any = null;
  let cacheStats: any = null;
  let updateInterval: number;

  export function toggleDebugger() {
    isVisible = !isVisible;
    if (isVisible) {
      updateStats();
      updateInterval = setInterval(updateStats, 1000);
    } else {
      clearInterval(updateInterval);
    }
  }

  function updateStats() {
    metrics = perfMonitor.getMetrics();
    memoryInfo = perfMonitor.logMemoryUsage('Debug');
    cacheStats = mathRenderer.getCacheStats();
  }

  function clearMetrics() {
    perfMonitor.clearMetrics();
    updateStats();
  }

  function clearMathCache() {
    mathRenderer.clearCache();
    updateStats();
  }

  function togglePerformanceMonitoring() {
    const isEnabled = perfMonitor.isMonitoringEnabled();
    perfMonitor.setEnabled(!isEnabled);
  }

  onMount(() => {
    // 添加键盘快捷键
    function handleKeydown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDebugger();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
</script>

<!-- 调试面板 -->
{#if isVisible}
  <div class="debug-panel">
    <div class="debug-header">
      <h3>性能调试器</h3>
      <button class="close-btn" on:click={toggleDebugger}>×</button>
    </div>

    <div class="debug-content">
      <!-- 控制按钮 -->
      <div class="debug-controls">
        <button on:click={togglePerformanceMonitoring}>
          {perfMonitor.isMonitoringEnabled() ? '禁用' : '启用'}监控
        </button>
        <button on:click={clearMetrics}>清除指标</button>
        <button on:click={clearMathCache}>清除数学缓存</button>
      </div>

      <!-- 内存信息 -->
      {#if memoryInfo}
        <div class="debug-section">
          <h4>内存使用</h4>
          <div class="memory-info">
            <div>已用: {memoryInfo.used}MB</div>
            <div>总计: {memoryInfo.total}MB</div>
            <div>限制: {memoryInfo.limit}MB</div>
          </div>
        </div>
      {/if}

      <!-- 缓存统计 -->
      {#if cacheStats}
        <div class="debug-section">
          <h4>数学公式缓存</h4>
          <div class="cache-info">
            <div>缓存条目: {cacheStats.size}/{cacheStats.maxSize}</div>
            <div>过期时间: {cacheStats.expiryTime / 1000}秒</div>
          </div>
        </div>
      {/if}

      <!-- 性能指标 -->
      <div class="debug-section">
        <h4>性能指标</h4>
        <div class="metrics-list">
          {#each metrics.slice(-10) as metric}
            <div class="metric-item" class:slow={metric.duration && metric.duration > 16}>
              <span class="metric-name">{metric.name}</span>
              <span class="metric-duration">
                {metric.duration ? `${metric.duration.toFixed(2)}ms` : '进行中...'}
              </span>
            </div>
          {/each}
          {#if metrics.length === 0}
            <div class="no-metrics">暂无性能数据</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .debug-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 80vh;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
  }

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .debug-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #374151;
  }

  .debug-content {
    padding: 16px;
    max-height: calc(80vh - 60px);
    overflow-y: auto;
  }

  .debug-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .debug-controls button {
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .debug-controls button:hover {
    background: #f3f4f6;
  }

  .debug-section {
    margin-bottom: 16px;
  }

  .debug-section h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .memory-info,
  .cache-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  .metrics-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .metric-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: #f9fafb;
    border-radius: 4px;
    font-size: 11px;
  }

  .metric-item.slow {
    background: #fef2f2;
    color: #dc2626;
  }

  .metric-name {
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-duration {
    font-family: monospace;
    margin-left: 8px;
  }

  .no-metrics {
    text-align: center;
    color: #9ca3af;
    font-size: 12px;
    padding: 16px;
  }
</style>

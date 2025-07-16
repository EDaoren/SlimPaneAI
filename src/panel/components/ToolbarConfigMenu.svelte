<script lang="ts">
  import { toolbarConfigStore } from '../stores/toolbar-config';
  import { createEventDispatcher, onMount, tick } from 'svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  $: config = $toolbarConfigStore;

  let menuElement: HTMLDivElement;

  function handleToggle(key: keyof typeof config) {
    toolbarConfigStore.updateConfig({ [key]: !config[key] });
  }

  function handleClose() {
    isOpen = false;
    dispatch('close');
  }

  function handleReset() {
    toolbarConfigStore.reset();
  }



  // 点击外部关闭菜单
  function handleOutsideClick(event: MouseEvent) {
    if (isOpen && event.target instanceof Element) {
      const menu = document.querySelector('.toolbar-config-menu');
      if (menu && !menu.contains(event.target)) {
        handleClose();
      }
    }
  }
</script>

<svelte:window on:click={handleOutsideClick} />

{#if isOpen}
  <div
    class="toolbar-config-menu"
    bind:this={menuElement}

  >
    <div class="menu-header">
      <h3>工具条设置</h3>
      <button class="close-btn" on:click={handleClose} title="关闭">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="menu-content">
      <div class="config-item">
        <label class="config-label">
          <input
            type="checkbox"
            checked={config.showClearButton}
            on:change={() => handleToggle('showClearButton')}
          />
          <span>显示清空按钮</span>
        </label>
      </div>

      <div class="config-item">
        <label class="config-label">
          <input
            type="checkbox"
            checked={config.showPageChat}
            on:change={() => handleToggle('showPageChat')}
          />
          <span>显示网页聊天</span>
        </label>
      </div>

      <div class="config-item">
        <label class="config-label">
          <input
            type="checkbox"
            checked={config.compactMode}
            on:change={() => handleToggle('compactMode')}
          />
          <span>紧凑模式</span>
        </label>
      </div>

      <div class="menu-actions">
        <button class="reset-btn" on:click={handleReset}>
          重置默认
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .toolbar-config-menu {
    position: absolute;
    z-index: 1000;
    min-width: 200px;
    max-width: 250px;
    width: 220px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 0;

    /* 关键定位：从右下角向上展开，右对齐让菜单向左展开 */
    bottom: 100%;
    right: 0;
    margin-bottom: 0.5rem;

    /* 限制高度避免超出屏幕 */
    max-height: 300px;
    overflow-y: auto;

    /* 确保不会超出左边界 */
    min-width: 200px;

    /* 动画效果 */
    opacity: 1;
    transform: scale(1);
    transform-origin: bottom right;
    transition: opacity 0.2s ease, transform 0.2s ease;

    /* 确保内容可见 */
    box-sizing: border-box;
  }



  /* 高度受限时的处理 */
  @media (max-height: 600px) {
    .toolbar-config-menu {
      max-height: 200px;
    }
  }

  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-primary);
  }

  .menu-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    padding: 0.25rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .menu-content {
    padding: 0.5rem;
  }

  .config-item {
    padding: 0.5rem 0;
  }

  .config-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .config-label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: #007bff;
  }

  .menu-actions {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-primary);
    margin-top: 0.5rem;
  }

  .reset-btn {
    width: 100%;
    padding: 0.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    background: var(--bg-tertiary);
  }

  /* 深色主题支持 */
  :global(.dark) .toolbar-config-menu {
    background: var(--bg-secondary);
    border-color: var(--border-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .menu-header {
    border-bottom-color: var(--border-secondary);
  }

  :global(.dark) .menu-actions {
    border-top-color: var(--border-secondary);
  }
</style>

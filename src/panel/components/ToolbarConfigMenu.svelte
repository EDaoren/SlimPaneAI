<script lang="ts">
  import { toolbarConfigStore } from '../stores/toolbar-config';
  import { createEventDispatcher, onMount, tick } from 'svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  $: config = $toolbarConfigStore;

  let menuElement: HTMLDivElement;
  let menuPosition = { top: '100%', right: '0', left: 'auto', bottom: 'auto' };

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

  // 计算菜单最佳位置
  async function calculateMenuPosition() {
    if (!menuElement) return;

    await tick(); // 确保DOM已更新

    // 获取触发按钮的位置（通过父容器）
    const container = menuElement.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();

    // 视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 菜单尺寸
    const menuWidth = menuRect.width || 200;
    const menuHeight = menuRect.height || 200;

    // 计算各个方向的可用空间
    const spaceRight = viewportWidth - containerRect.right;
    const spaceLeft = containerRect.left;
    const spaceBelow = viewportHeight - containerRect.bottom;
    const spaceAbove = containerRect.top;

    // 默认位置：右下
    let position = {
      top: '100%',
      right: '0',
      left: 'auto',
      bottom: 'auto',
      transform: 'none'
    };

    // 水平方向定位
    let alignHorizontal = 'right'; // 默认右对齐

    if (spaceRight < menuWidth && spaceLeft > spaceRight) {
      // 右侧空间不足，左侧空间更多 - 向左展开
      alignHorizontal = 'left';
      position.right = 'auto';
      position.left = '0';
    }

    // 垂直方向定位
    let alignVertical = 'bottom'; // 默认向下展开

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      // 下方空间不足，上方空间更多 - 向上展开
      alignVertical = 'top';
      position.top = 'auto';
      position.bottom = '100%';
    }

    // 检查菜单是否会超出视口
    if (alignVertical === 'top') {
      // 向上展开时，检查顶部是否有足够空间
      if (containerRect.top - menuHeight < 0) {
        // 顶部空间不足，使用固定位置并添加滚动
        position.bottom = 'auto';
        position.top = '0';
        position.maxHeight = `${containerRect.top}px`;
      }
    } else {
      // 向下展开时，检查底部是否有足够空间
      if (containerRect.bottom + menuHeight > viewportHeight) {
        // 底部空间不足，限制最大高度
        position.maxHeight = `${viewportHeight - containerRect.bottom - 10}px`;
      }
    }

    // 检查水平方向是否会超出视口
    if (alignHorizontal === 'left') {
      // 向左展开时，检查左侧是否有足够空间
      if (containerRect.left - menuWidth < 0) {
        // 左侧空间不足，居中显示
        position.left = '50%';
        position.transform = 'translateX(-50%)';
      }
    } else {
      // 向右展开时，检查右侧是否有足够空间
      if (containerRect.right + menuWidth > viewportWidth) {
        // 右侧空间不足，居中显示
        position.right = 'auto';
        position.left = '50%';
        position.transform = 'translateX(-50%)';
      }
    }

    console.log('SlimPaneAI: Menu position calculated:', {
      alignHorizontal,
      alignVertical,
      position,
      spaces: { spaceRight, spaceLeft, spaceBelow, spaceAbove },
      containerRect: {
        top: containerRect.top,
        right: containerRect.right,
        bottom: containerRect.bottom,
        left: containerRect.left
      }
    });

    menuPosition = position;
  }

  // 当菜单打开时计算位置
  $: if (isOpen && menuElement) {
    calculateMenuPosition();
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
    style="
      top: {menuPosition.top};
      right: {menuPosition.right};
      left: {menuPosition.left};
      bottom: {menuPosition.bottom};
      transform: {menuPosition.transform};
      max-height: {menuPosition.maxHeight || 'none'};
    "
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
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 0;
    margin: 0.25rem;

    /* 确保菜单不会超出视口 */
    overflow-y: auto;

    /* 平滑的定位过渡 */
    transition: all 0.2s ease;

    /* 确保内容可见 */
    box-sizing: border-box;
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

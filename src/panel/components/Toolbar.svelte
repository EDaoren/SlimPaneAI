<script lang="ts">
  import { chatStore } from '../stores/chat';

  function openSettings() {
    window.chrome?.runtime?.openOptionsPage();
  }

  function handleNewChat() {
    chatStore.createNewSession();
  }

  function handleClearChat() {
    if (confirm('确定要清空当前对话吗？')) {
      chatStore.clearCurrentSession();
    }
  }

  // 可以添加更多工具栏功能
  function handleExportChat() {
    // TODO: 实现导出功能
    console.log('导出对话功能待实现');
  }
</script>

<div class="toolbar">
  <!-- 新建对话 -->
  <button
    class="toolbar-button"
    on:click={handleNewChat}
    title="新建对话"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>

  <!-- 清空对话 -->
  <button
    class="toolbar-button"
    on:click={handleClearChat}
    title="清空当前对话"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>

  <!-- 分隔线 -->
  <div class="toolbar-divider"></div>

  <!-- 导出对话 -->
  <button
    class="toolbar-button"
    on:click={handleExportChat}
    title="导出对话"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </button>

  <!-- 另一个分隔线 -->
  <div class="toolbar-divider"></div>

  <!-- 设置 -->
  <button
    class="toolbar-button"
    on:click={openSettings}
    title="设置"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>
</div>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    background: #f9fafb;
    border-left: 1px solid #e5e7eb;
    gap: 8px;
    width: 56px;
    height: 100%;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .toolbar-button:hover {
    background: #e5e7eb;
    color: #374151;
    transform: scale(1.05);
  }

  .toolbar-button:active {
    transform: scale(0.95);
  }

  .toolbar-divider {
    width: 24px;
    height: 1px;
    background: #d1d5db;
    margin: 4px 0;
  }

  /* 工具提示样式增强 */
  .toolbar-button:hover::after {
    content: attr(title);
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: #1f2937;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-right: 8px;
    z-index: 1000;
    opacity: 0;
    animation: fadeIn 0.2s ease forwards;
  }

  .toolbar-button:hover::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 4px solid transparent;
    border-left-color: #1f2937;
    margin-right: 4px;
    z-index: 1000;
    opacity: 0;
    animation: fadeIn 0.2s ease forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>

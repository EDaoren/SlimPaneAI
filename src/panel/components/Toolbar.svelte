<script lang="ts">
  import { chatStore } from '../stores/chat';
  import { t } from '@/lib/i18n';

  export let onToggleChatHistory: () => void;

  function openSettings() {
    window.chrome?.runtime?.openOptionsPage();
  }

  function handleNewChat() {
    chatStore.createNewSession();
  }

  function handleChatHistory() {
    onToggleChatHistory();
  }


</script>

<div class="toolbar">
  <!-- 新建对话 -->
  <button
    class="toolbar-button"
    on:click={handleNewChat}
    title={$t('chat.newChat')}
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>



  <!-- 聊天记录 -->
  <button
    class="toolbar-button"
    on:click={handleChatHistory}
    title={$t('chat.messageHistory')}
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  </button>

  <!-- 分隔线 -->
  <div class="toolbar-divider"></div>

  <!-- 设置 -->
  <button
    class="toolbar-button"
    on:click={openSettings}
    title={$t('common.settings')}
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
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-primary);
    gap: 8px;
    width: 56px;
    height: 100%;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .toolbar-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    transform: scale(1.05);
  }

  .toolbar-button:active {
    transform: scale(0.95);
  }

  .toolbar-divider {
    width: 24px;
    height: 1px;
    background: var(--border-secondary);
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

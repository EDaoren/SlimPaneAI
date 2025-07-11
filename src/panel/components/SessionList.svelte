<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChatSession } from '@/types';
  import { chatStore } from '../stores/chat';
  import { t } from '@/lib/i18n';
  
  export let sessions: ChatSession[];
  export let currentSessionId: string | undefined;
  
  const dispatch = createEventDispatcher<{
    select: string;
    close: void;
  }>();
  
  function selectSession(sessionId: string) {
    dispatch('select', sessionId);
  }
  
  function deleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this chat session?')) {
      chatStore.deleteSession(sessionId);
    }
  }
  
  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  function createNewSession() {
    chatStore.createNewSession();
    dispatch('close');
  }
</script>

<div class="session-list">
  <!-- Header -->
  <div class="session-header">
    <h2 class="session-title">{$t('chat.messageHistory')}</h2>
    <div class="header-actions">
      <button
        class="header-button"
        on:click={createNewSession}
        title={$t('chat.newChat')}
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        class="header-button"
        on:click={() => dispatch('close')}
        title={$t('common.close')}
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Session List -->
  <div class="session-content">
    {#if sessions.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg class="icon-large" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 class="empty-title">{$t('chat.noChats')}</h3>
        <p class="empty-description">{$t('chat.noChatDesc')}</p>
        <button
          class="btn-primary"
          on:click={createNewSession}
        >
          {$t('chat.newChat')}
        </button>
      </div>
    {:else}
      <div class="sessions-container">
        {#each sessions as session (session.id)}
          <div
            class="session-item {session.id === currentSessionId ? 'active' : ''}"
            on:click={() => selectSession(session.id)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && selectSession(session.id)}
          >
            <div class="session-content-wrapper">
              <div class="session-info">
                <h3 class="session-title-text">
                  {session.title}
                </h3>
                <p class="session-meta">
                  {formatDate(session.updatedAt)} · {session.messages.filter(m => m.type !== 'system').length} {$t('chat.messages')}
                </p>
              </div>

              <button
                class="delete-button"
                on:click={(e) => deleteSession(session.id, e)}
                title={$t('chat.deleteSession')}
              >
                <svg class="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

<style>
  .session-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .session-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-secondary);
    background: var(--bg-secondary);
  }

  .session-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .header-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    transform: scale(1.05);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .session-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
  }

  .empty-icon {
    width: 4rem;
    height: 4rem;
    margin-bottom: 1rem;
    background: var(--bg-tertiary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-large {
    width: 2rem;
    height: 2rem;
    color: var(--text-muted);
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  .empty-description {
    color: var(--text-secondary);
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
  }

  .sessions-container {
    padding: 0.75rem;
  }

  .session-item {
    padding: 0.875rem;
    margin-bottom: 0.5rem;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .session-item:hover {
    background: var(--bg-tertiary);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .session-item.active {
    background: #eff6ff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .session-content-wrapper {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0 0 0.25rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .delete-button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.7;
  }

  .delete-button:hover {
    background: #fef2f2;
    color: #dc2626;
    opacity: 1;
    transform: scale(1.1);
  }

  .icon-small {
    width: 1rem;
    height: 1rem;
  }

  /* 滚动条样式 */
  .session-content::-webkit-scrollbar {
    width: 6px;
  }

  .session-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .session-content::-webkit-scrollbar-thumb {
    background: var(--border-secondary);
    border-radius: 3px;
  }

  .session-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
</style></div>

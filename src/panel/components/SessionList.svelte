<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChatSession } from '@/types';
  import { chatStore } from '../stores/chat';
  
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

<div class="session-list h-full flex flex-col bg-white">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    <h2 class="text-lg font-semibold text-gray-900">Chat Sessions</h2>
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        on:click={createNewSession}
        title="New Chat"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        class="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        on:click={() => dispatch('close')}
        title="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Session List -->
  <div class="flex-1 overflow-y-auto">
    {#if sessions.length === 0}
      <div class="flex items-center justify-center h-full p-6">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No chat sessions</h3>
          <p class="text-gray-600 mb-4">Start a new conversation to begin.</p>
          <button
            class="btn-primary"
            on:click={createNewSession}
          >
            New Chat
          </button>
        </div>
      </div>
    {:else}
      <div class="p-2">
        {#each sessions as session (session.id)}
          <div
            class="session-item p-3 rounded-lg cursor-pointer transition-colors {session.id === currentSessionId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}"
            on:click={() => selectSession(session.id)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && selectSession(session.id)}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-gray-900 truncate">
                  {session.title}
                </h3>
                <p class="text-xs text-gray-500 mt-1">
                  {formatDate(session.updatedAt)} · {session.messages.filter(m => m.type !== 'system').length} messages
                </p>
              </div>
              
              <button
                class="flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                on:click={(e) => deleteSession(session.id, e)}
                title="Delete session"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

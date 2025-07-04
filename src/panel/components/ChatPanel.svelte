<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { chatStore } from '../stores/chat';
  import { settingsStore } from '../stores/settings';
  import MessageList from './MessageList.svelte';
  import VirtualMessageList from './VirtualMessageList.svelte';
  import ChatInput from './ChatInput.svelte';
  import SessionList from './SessionList.svelte';
  import Toolbar from './Toolbar.svelte';
  
  let showSessions = false;
  let messagesContainer: HTMLElement;

  $: currentSession = $chatStore.currentSession;
  $: sessions = $chatStore.sessions;
  $: isStreaming = $chatStore.isStreaming;
  $: modelSettings = $settingsStore.modelSettings;

  onMount(() => {
    // Don't create session automatically - let user start the conversation
    // Sessions will be created when user sends first message
  });

  afterUpdate(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function handleSendMessage(event: CustomEvent<{ message: string; modelId?: string }>) {
    const { message, modelId } = event.detail;
    chatStore.sendMessage(message, modelId);
  }

  function handleNewChat() {
    chatStore.createNewSession();
    showSessions = false;
  }

  function handleSessionSelect(event: CustomEvent<string>) {
    chatStore.switchSession(event.detail);
    showSessions = false;
  }

  function handleClearChat() {
    if (currentSession && confirm('Clear current chat?')) {
      chatStore.clearCurrentSession();
    }
  }

  function toggleSessions() {
    showSessions = !showSessions;
  }

  // Check if any models are configured
  $: hasModels = Object.keys(modelSettings).length > 0;

  // 决定是否使用虚拟滚动（当消息数量较多时）
  $: useVirtualScroll = currentSession && currentSession.messages.length > 50;
</script>

<div class="chat-panel">
  <!-- Session List Overlay -->
  {#if showSessions}
    <div class="session-overlay">
      <SessionList
        {sessions}
        currentSessionId={currentSession?.id}
        on:select={handleSessionSelect}
        on:close={() => showSessions = false}
      />
    </div>
  {/if}

  <!-- Main Content Area with Toolbar -->
  <div class="main-content">
    <!-- Messages Area -->
    <div class="messages-container" bind:this={messagesContainer}>

      {#if !currentSession || currentSession.messages.length === 0}
        <!-- Empty Chat State -->
        <div class="flex items-center justify-center h-full px-4">
          <div class="text-center max-w-sm">
            <!-- Greeting -->
            <div class="mb-8">
              <h2 class="text-2xl font-semibold text-gray-900 mb-2">你好，</h2>
              <p class="text-lg text-gray-600">我今天能帮你什么？</p>
            </div>

            <!-- Quick Actions -->
            <div class="space-y-3">
              <div class="w-full p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl hover:shadow-md transition-all duration-200">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">开始对话</div>
                    <div class="text-sm text-gray-500">在下方输入框输入问题</div>
                  </div>
                </div>
              </div>

              <div class="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all duration-200">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">选择文本处理</div>
                    <div class="text-sm text-gray-500">在网页上选择文本，右键使用 AI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if useVirtualScroll}
        <VirtualMessageList messages={currentSession.messages} {isStreaming} />
      {:else}
        <MessageList messages={currentSession.messages} {isStreaming} />
      {/if}
    </div>

    <!-- Chat Input -->
    <div class="input-container">
      <ChatInput
        disabled={isStreaming}
        on:send={handleSendMessage}
      />
    </div>
  </div>

  <!-- Right Toolbar -->
  <Toolbar />
</div>

<style>
  .chat-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: row;
    background: white;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .session-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 10;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    padding-bottom: 0;
    min-height: 0;
  }

  .input-container {
    flex-shrink: 0;
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background: white;
  }
</style>

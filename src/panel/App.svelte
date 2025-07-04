<script lang="ts">
  import { onMount } from 'svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import PerformanceDebugger from './components/PerformanceDebugger.svelte';
  import { chatStore } from './stores/chat';
  import { settingsStore } from './stores/settings';
  import type { ExtensionMessage, TextSelectionMessage } from '@/types';

  let isLoading = true;

  onMount(async () => {
    console.log('🚀 SlimPaneAI Panel mounting...');

    // Load settings and chat history
    await settingsStore.loadSettings();
    await chatStore.loadChatHistory();

    console.log('📡 Setting up message listener...');
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    console.log('✅ Message listener set up successfully');

    isLoading = false;
    console.log('✅ Panel mounted and ready');
  });

  function handleMessage(message: ExtensionMessage) {
    console.log('🎯 [Panel] Received message:', message);

    switch (message.type) {
      case 'text-selected':
        console.log('📝 Handling text selection');
        handleTextSelection(message as TextSelectionMessage);
        break;
      case 'llm-chunk':
      case 'llm-response':
      case 'llm-error':
        console.log('🤖 Forwarding to chat store');
        chatStore.handleMessage(message);
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  function handleTextSelection(message: TextSelectionMessage) {
    const { text, action } = message.payload;
    chatStore.handleTextSelection(text, action);
  }
</script>

<div class="app h-full flex flex-col bg-white">
  <main class="flex-1 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-gray-500">加载中...</div>
      </div>
    {:else}
      <ChatPanel />
    {/if}
  </main>

  <!-- 性能调试器 -->
  <PerformanceDebugger />
</div>

<style>
  .app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>

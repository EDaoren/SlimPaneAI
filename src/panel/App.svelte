<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import { chatStore } from './stores/chat';
  import { settingsStore } from './stores/settings';
  import { applyTheme } from '@/lib/theme-manager';
  import { initializeLanguage, t } from '@/lib/i18n';
  import type { ExtensionMessage, TextSelectionMessage } from '@/types';

  let isLoading = true;
  let unsubscribeSettings: (() => void) | null = null;

  // 响应式应用主题变化和语言初始化
  $: if ($settingsStore.userPreferences) {
    applyTheme($settingsStore.userPreferences);
    // 初始化国际化系统
    initializeLanguage($settingsStore.userPreferences);
  }

  onMount(async () => {
    console.log('🚀 SlimPaneAI Panel mounting...');

    // Load settings and chat history
    await settingsStore.loadSettings();
    await chatStore.loadChatHistory();

    // 国际化初始化通过响应式语句处理

    console.log('📡 Setting up message listener...');
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    console.log('✅ Message listener set up successfully');

    // Listen for storage changes (settings updates from options page)
    chrome.storage.onChanged.addListener(handleStorageChange);
    console.log('✅ Storage change listener set up');

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
      case 'storage-updated':
        console.log('💾 Storage updated, refreshing settings...');
        settingsStore.forceRefresh();
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  function handleTextSelection(message: TextSelectionMessage) {
    const { text, action } = message.payload;
    chatStore.handleTextSelection(text, action);
  }

  function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }) {
    console.log('🔄 [Panel] Storage changed:', changes);

    // Check if userPreferences changed
    if (changes.userPreferences) {
      const newPreferences = changes.userPreferences.newValue;
      if (newPreferences) {
        console.log('🎨 [Panel] Applying new theme preferences:', newPreferences);
        // Force refresh settings store to get latest data
        settingsStore.forceRefresh();
      }
    }
  }

  onDestroy(() => {
    // Clean up listeners
    if (chrome.runtime.onMessage.hasListener(handleMessage)) {
      chrome.runtime.onMessage.removeListener(handleMessage);
    }
    if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  });
</script>

<div class="app h-full flex flex-col bg-white">
  <main class="flex-1 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-gray-500">{$t('chat.loading')}</div>
      </div>
    {:else}
      <ChatPanel />
    {/if}
  </main>
</div>

<style>
  .app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>

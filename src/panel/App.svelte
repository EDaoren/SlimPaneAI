<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import { chatStore } from './stores/chat';
  import { settingsStore } from './stores/settings';
  import { pageChatStore } from './stores/page-chat';
  import { applyTheme } from '@/lib/theme-manager';
  import { initializeLanguage, t } from '@/lib/i18n';
  import type { ExtensionMessage, TextSelectionMessage, TabSwitchedMessage, PageNavigatedMessage } from '@/types';

  let isLoading = true;
  let unsubscribeSettings: (() => void) | null = null;
  let chatPanel: ChatPanel;

  // 响应式应用主题变化和语言初始化
  $: if ($settingsStore.userPreferences) {
    applyTheme($settingsStore.userPreferences);
    initializeLanguage($settingsStore.userPreferences);
  }

  onMount(async () => {
    // Load settings and chat history
    await settingsStore.loadSettings();
    await chatStore.loadChatHistory();

    // Initialize page chat state
    await pageChatStore.initialize();

    // 国际化初始化通过响应式语句处理

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    // Listen for storage changes (settings updates from options page)
    chrome.storage.onChanged.addListener(handleStorageChange);

    isLoading = false;
  });

  async function handleMessage(message: ExtensionMessage, sender: any, sendResponse: (response?: any) => void) {
    console.log('🎯 [Panel] Received message:', message);

    switch (message.type) {
      case 'text-selected':
        handleTextSelection(message as TextSelectionMessage);
        break;
      case 'llm-chunk':
      case 'llm-response':
      case 'llm-error':
        chatStore.handleMessage(message);
        break;
      case 'storage-updated':
        settingsStore.forceRefresh();
        break;
      case 'tab-switched':
        await handleTabSwitch(message as TabSwitchedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      case 'page-navigated':
        await handlePageNavigation(message as PageNavigatedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      case 'spa-page-navigated':
        await handleSPAPageNavigation(message);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      case 'page-content-extracted':
      case 'pdf-processing-status':
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }

    // Always send a response to prevent port closure
    if (sendResponse) {
      sendResponse({ received: true });
    }
  }

  function handleTextSelection(message: TextSelectionMessage) {
    const { text, action } = message.payload;
    chatStore.handleTextSelection(text, action);
  }

  // Handle tab switch globally to ensure page chat store is updated
  async function handleTabSwitch(message: TabSwitchedMessage) {
    // Use the new checkAndExtractIfNeeded method which handles enabled state checking
    await pageChatStore.checkAndExtractIfNeeded(message.payload.url, message.payload.title);
  }

  // Handle page navigation globally
  async function handlePageNavigation(message: PageNavigatedMessage) {
    // Use the new checkAndExtractIfNeeded method which handles enabled state checking
    await pageChatStore.checkAndExtractIfNeeded(message.payload.url, message.payload.title);
  }

  // Handle SPA page navigation globally
  async function handleSPAPageNavigation(message: any) {
    // Use the new checkAndExtractIfNeeded method with SPA-specific handling
    await pageChatStore.checkAndExtractIfNeeded(message.payload.url, message.payload.title, {
      isSPA: true,
      source: message.payload.source,
      oldUrl: message.payload.oldUrl
    });
  }

  function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }) {
    // Check if userPreferences changed
    if (changes.userPreferences) {
      const newPreferences = changes.userPreferences.newValue;
      if (newPreferences) {
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
      <ChatPanel bind:this={chatPanel} />
    {/if}
  </main>


</div>

<style>
  .app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>

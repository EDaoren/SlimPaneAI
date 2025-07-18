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
      case 'tab-switched':
        console.log('🔄 Tab switched, handling globally');
        await handleTabSwitch(message as TabSwitchedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      case 'page-navigated':
        console.log('🧭 Page navigated, handling globally');
        await handlePageNavigation(message as PageNavigatedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        break;
      case 'page-content-extracted':
      case 'pdf-processing-status':
        console.log('📄 Page content message, forwarding to ChatPanel');
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
    console.log('SlimPaneAI: Global tab switch handler, URL:', message.payload.url);

    // Get current page chat state
    let currentState: any;
    const unsubscribe = pageChatStore.subscribe(state => {
      currentState = state;
    });
    unsubscribe();

    if (currentState.enabled) {
      console.log('SlimPaneAI: Page chat is enabled, refreshing content for new tab');
      // Refresh page chat content for the new tab
      await pageChatStore.refresh();
    } else {
      console.log('SlimPaneAI: Page chat is disabled, clearing old content to prepare for potential future use');
      // Clear old content so that when user enables page chat, it will extract the current page
      pageChatStore.setPageContent('', '', '', null, null);
    }
  }

  // Handle page navigation globally
  async function handlePageNavigation(message: PageNavigatedMessage) {
    console.log('SlimPaneAI: Global page navigation handler, URL:', message.payload.url);

    // Get current page chat state
    let currentState: any;
    const unsubscribe = pageChatStore.subscribe(state => {
      currentState = state;
    });
    unsubscribe();

    if (currentState.enabled) {
      console.log('SlimPaneAI: Page chat is enabled, refreshing content for navigated page');
      await pageChatStore.refresh();
    } else {
      console.log('SlimPaneAI: Page chat is disabled, clearing old content to prepare for potential future use');
      pageChatStore.setPageContent('', '', '', null, null);
    }
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

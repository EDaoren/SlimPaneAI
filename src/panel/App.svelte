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

  // 响应式应用主题变化和语言初始化 - 添加防抖机制
  let lastPreferencesHash = '';
  $: if ($settingsStore.userPreferences) {
    // 创建偏好设置的简单哈希来避免重复应用
    const currentHash = JSON.stringify({
      theme: $settingsStore.userPreferences.theme,
      language: $settingsStore.userPreferences.language,
      fontSize: $settingsStore.userPreferences.fontSize,
      messageDensity: $settingsStore.userPreferences.messageDensity
    });

    if (currentHash !== lastPreferencesHash) {
      lastPreferencesHash = currentHash;

      // 使用 setTimeout 来避免同步更新导致的闪烁
      setTimeout(() => {
        applyTheme($settingsStore.userPreferences);
        initializeLanguage($settingsStore.userPreferences);
      }, 0);
    }
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
    let shouldRespond = false;

    switch (message.type) {
      case 'text-selected':
        handleTextSelection(message as TextSelectionMessage);
        shouldRespond = true;
        break;
      case 'llm-chunk':
      case 'llm-response':
      case 'llm-error':
        chatStore.handleMessage(message);
        shouldRespond = true;
        break;
      case 'storage-updated':
        // DISABLED: This was causing race conditions with manual updates
        shouldRespond = true;
        break;
      case 'user-preferences-updated':
        // Handle userPreferences updates from options page for theme/language sync
        if (message.payload.userPreferences) {
          // Update only userPreferences in the store to trigger theme/language changes
          settingsStore.updateUserPreferencesFromExternal(message.payload.userPreferences);
        }
        shouldRespond = true;
        break;
      case 'model-settings-updated':
        // Handle modelSettings updates from options page for model list sync
        if (message.payload.modelSettings) {
          settingsStore.updateModelSettingsFromExternal(message.payload.modelSettings);
        }
        shouldRespond = true;
        break;
      case 'service-providers-updated':
        // Handle serviceProviders updates from options page
        if (message.payload.serviceProviders) {
          settingsStore.updateServiceProvidersFromExternal(message.payload.serviceProviders);
        }
        shouldRespond = true;
        break;
      case 'tab-switched':
        await handleTabSwitch(message as TabSwitchedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        shouldRespond = true;
        break;
      case 'page-navigated':
        await handlePageNavigation(message as PageNavigatedMessage);
        if (chatPanel && chatPanel.handlePageContentMessage) {
          chatPanel.handlePageContentMessage(message);
        }
        shouldRespond = true;
        break;
      case 'spa-page-navigated':
        await handleSPAPageNavigation(message);
        shouldRespond = true;
        break;
      default:
        // Unknown message type - don't respond to avoid interfering with other handlers
        break;
    }

    // Only send a response for messages we actually handle
    if (shouldRespond && sendResponse) {
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
    // DISABLED: This was causing race conditions with manual updates
    // Check if userPreferences changed
    if (changes.userPreferences) {
      const newPreferences = changes.userPreferences.newValue;
      if (newPreferences) {
        // DISABLED: Force refresh settings store to get latest data
        // settingsStore.forceRefresh();
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

<script lang="ts">
  import { settingsStore } from '../stores/settings';
  import { chatStore } from '../stores/chat';
  import { t } from '@/lib/i18n';

  function openOptions() {
    window.chrome?.runtime?.openOptionsPage();
  }

  function handleNewChat() {
    chatStore.createNewSession();
  }

  $: modelEntries = Object.entries($settingsStore.modelSettings);
  $: hasModels = modelEntries.length > 0;
  $: currentModel = $settingsStore.userPreferences.defaultModel;
  $: sessions = $chatStore.sessions;
</script>

<header class="border-b border-gray-100 bg-white">
  <div class="flex items-center justify-between p-3">
    <div class="flex items-center gap-3">
      <!-- Logo and Title -->
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 class="text-lg font-semibold text-gray-900">SlimPaneAI</h1>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- New Chat Button -->
      <button
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        on:click={handleNewChat}
        title={$t('chat.newChat')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- Settings Button -->
      <button
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        on:click={openOptions}
        title={$t('common.settings')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
</header>

<script lang="ts">
  import { settingsStore } from '../stores/settings';

  function openOptions() {
    window.chrome?.runtime?.openOptionsPage();
  }

  $: modelEntries = Object.entries($settingsStore.modelSettings);
  $: hasModels = modelEntries.length > 0;
  $: currentModel = $settingsStore.userPreferences.defaultModel;
</script>

<header class="border-b border-gray-100 bg-white">
  <div class="flex items-center justify-between p-4">
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        title="聊天记录"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 class="text-lg font-semibold text-gray-900">SlimPaneAI</h1>
    </div>

    <div class="flex items-center gap-2">
      <!-- Model Selector -->
      {#if hasModels}
        <select
          class="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
          value={currentModel}
          on:change={(e) => {
            settingsStore.updateUserPreferences({
              defaultModel: e.target.value
            });
          }}
        >
          {#each modelEntries as [id, config]}
            <option value={id}>
              {config.provider === 'openai' ? 'GPT' :
               config.provider === 'claude' ? 'Claude' :
               config.provider === 'gemini' ? 'Gemini' :
               config.provider.toUpperCase()} - {config.model}
            </option>
          {/each}
        </select>
      {/if}

      <button
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        on:click={openOptions}
        title="设置"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
</header>

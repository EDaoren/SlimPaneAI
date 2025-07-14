<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '../panel/stores/settings';
  import { applyTheme, watchSystemTheme } from '@/lib/theme-manager';
  import ModelConfigForm from '../panel/components/ModelConfigForm.svelte';
  import ServiceProviderManager from '../panel/components/ServiceProviderManager.svelte';
  import CustomSelect from '../panel/components/CustomSelect.svelte';
  import { getModelDisplayOptions } from '../lib/service-providers';
  import { t, initializeLanguage, setLanguage, currentLanguage } from '@/lib/i18n';
  import type { ModelConfig, ServiceProviderSettings } from '../types';

  // 导航状态
  let currentPage = 'ai-models'; // 当前页面

  // 模型配置状态
  let showAddModel = false;
  let editingModel: string | null = null;
  let editingConfig: ModelConfig | null = null;
  let showInlineForm = false;

  // 语言初始化状态
  let languageInitialized = false;

  // 导航菜单项
  let navigationItems = [];

  // 导航菜单项 - 只有在语言真正初始化后才更新，避免使用初始状态
  $: if (languageInitialized) {
    console.log('🔄 [Options] Language changed to:', $currentLanguage, 'updating navigationItems');
    navigationItems = [
      {
        id: 'ai-models',
        title: $t('settings.models'),
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
        description: $t('settings.modelSettings')
      },
      {
        id: 'preferences',
        title: $t('settings.preferences'),
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        description: $t('settings.general')
      },
      {
        id: 'appearance',
        title: $t('settings.appearance'),
        icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z',
        description: $t('settings.theme')
      },
      {
        id: 'about',
        title: $t('settings.about'),
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        description: $t('settings.about')
      }
    ];
    console.log('🔄 [Options] NavigationItems updated for language', $currentLanguage, ':', navigationItems.map(item => ({ id: item.id, title: item.title })));
  }

  $: modelEntries = Object.entries($settingsStore.modelSettings);
  $: serviceProviders = $settingsStore.serviceProviders;
  $: userPreferences = $settingsStore.userPreferences;
  $: modelOptions = getModelDisplayOptions(serviceProviders);
  $: hasModels = modelOptions.length > 0;

  // 应用主题变化和语言初始化
  $: if (userPreferences && !$settingsStore.isLoading && !languageInitialized) {
    console.log('🌍 [Options] Applying preferences (settings loaded):', userPreferences);
    applyTheme(userPreferences);
    // 只有在设置完全加载后且未初始化时才初始化国际化系统
    console.log('🌍 [Options] Initializing language (first time):', userPreferences.language);
    initializeLanguage(userPreferences);
    languageInitialized = true;
  }

  // 单独处理主题变化（不影响语言初始化）
  $: if (userPreferences && !$settingsStore.isLoading && languageInitialized) {
    applyTheme(userPreferences);
  }

  onMount(async () => {
    await settingsStore.loadSettings();

    // Initialize service providers if none exist
    if (Object.keys($settingsStore.serviceProviders).length === 0) {
      const { getDefaultServiceProviders } = await import('@/lib/service-providers');
      const defaultProviders = getDefaultServiceProviders();
      await settingsStore.saveServiceProviders(defaultProviders);
    }

    // 应用初始主题（语言初始化由响应式语句处理）
    const currentSettings = settingsStore.getCurrentState();
    if (currentSettings.userPreferences) {
      console.log('🌍 [Options] onMount - Applying loaded preferences:', currentSettings.userPreferences);
      applyTheme(currentSettings.userPreferences);
      // 语言初始化由响应式语句处理，这里不重复初始化
    }

    // 监听系统主题变化
    const unwatch = watchSystemTheme(() => {
      const currentSettings = settingsStore.getCurrentState();
      if (currentSettings.userPreferences?.theme === 'auto') {
        applyTheme(currentSettings.userPreferences);
      }
    });

    return unwatch;

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
  });

  function handleMessage(message: any) {
    console.log('🎯 [Options] Received message:', message);

    switch (message.type) {
      case 'storage-updated':
        console.log('💾 Storage updated, refreshing settings...');
        settingsStore.forceRefresh();
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // 导航函数
  function navigateTo(pageId: string) {
    currentPage = pageId;
    // 切换页面时重置模型配置状态
    showAddModel = false;
    showInlineForm = false;
    editingModel = null;
    editingConfig = null;
  }

  function handleAddModel() {
    // 如果没有模型，显示内联表单；如果有模型，显示模态框
    if (modelEntries.length === 0) {
      showInlineForm = true;
    } else {
      showAddModel = true;
    }
    editingModel = null;
    editingConfig = null;
  }

  function handleEditModel(id: string, config: ModelConfig) {
    showAddModel = true;
    editingModel = id;
    editingConfig = { ...config };
  }

  function handleDeleteModel(id: string) {
    if (confirm('确定要删除这个模型配置吗？')) {
      settingsStore.removeModelConfig(id);
    }
  }

  function handleModelSaved(event: CustomEvent<{ id: string; config: ModelConfig }>) {
    const { id, config } = event.detail;
    settingsStore.addModelConfig(id, config);
    showAddModel = false;
    showInlineForm = false;
    editingModel = null;
    editingConfig = null;
  }

  function handleCancel() {
    showAddModel = false;
    showInlineForm = false;
    editingModel = null;
    editingConfig = null;
  }

  async function handleDefaultModelChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      defaultModel: target.value
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }

  async function handleDefaultModelSelectChange(event: CustomEvent) {
    const newPreferences = {
      ...userPreferences,
      defaultModel: event.detail.value
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }



  async function handleThemeChange(theme: 'light' | 'dark' | 'auto') {
    const newPreferences = {
      ...userPreferences,
      theme
    };
    await settingsStore.saveUserPreferences(newPreferences);
    // 立即应用主题
    applyTheme(newPreferences);
  }

  async function handleLanguageChange(language: 'en' | 'zh') {
    console.log('🌍 [Options] Language change requested:', language);
    const newPreferences = {
      ...userPreferences,
      language
    };
    await settingsStore.saveUserPreferences(newPreferences);
    // 立即切换界面语言
    console.log('🌍 [Options] Setting language immediately:', language);
    setLanguage(language);
  }

  async function handleFontSizeChange(fontSize: 'small' | 'medium' | 'large') {
    const newPreferences = {
      ...userPreferences,
      fontSize
    };
    await settingsStore.saveUserPreferences(newPreferences);
    // 立即应用字体大小
    applyTheme(newPreferences);
  }

  async function handleMessageDensityChange(messageDensity: 'compact' | 'normal' | 'relaxed') {
    const newPreferences = {
      ...userPreferences,
      messageDensity
    };
    await settingsStore.saveUserPreferences(newPreferences);
    // 立即应用消息密度
    applyTheme(newPreferences);
  }



  async function handleServiceProvidersUpdate(e: CustomEvent<{ serviceProviders: ServiceProviderSettings }>) {
    const { serviceProviders } = e.detail;
    console.log('💾 [OptionsApp] Saving service providers:', serviceProviders);
    await settingsStore.saveServiceProviders(serviceProviders);
    console.log('✅ [OptionsApp] Service providers saved successfully');
  }

  function getProviderBadgeClass(provider: string) {
    switch (provider) {
      case 'openai': return 'model-badge-openai';
      case 'claude': return 'model-badge-claude';
      case 'gemini': return 'model-badge-gemini';
      default: return 'model-badge-custom';
    }
  }

  function getProviderName(provider: string) {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'claude': return 'Claude';
      case 'gemini': return 'Gemini';
      default: return '自定义';
    }
  }
</script>

<!-- 主布局容器 -->
<div class="app-container">
  <!-- 侧边栏 -->
  <div class="sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div class="logo-text">
          <h1 class="logo-title">SlimPaneAI</h1>
          <p class="logo-subtitle">v0.0.1</p>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      {#each navigationItems as item}
        <button
          class="nav-item {currentPage === item.id ? 'nav-item-active' : ''}"
          on:click={() => navigateTo(item.id)}
        >
          <div class="nav-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
            </svg>
          </div>
          <div class="nav-content">
            <span class="nav-title">{item.title}</span>
            <span class="nav-description">{item.description}</span>
          </div>
        </button>
      {/each}
    </nav>
  </div>

  <!-- 主内容区域 -->
  <div class="main-content">
    <!-- 内容头部 -->
    <div class="content-header">
      {#if currentPage === 'ai-models'}
        <div class="flex items-center justify-between">
          <div>
            <h2 class="content-title">{$t('settings.modelSettings')}</h2>
            <p class="content-subtitle">
              {$t('settings.modelSettings')}
            </p>
          </div>
        </div>
      {:else if currentPage === 'preferences'}
        <div>
          <h2 class="content-title">{$t('settings.preferences')}</h2>
          <p class="content-subtitle">{$t('settings.general')}</p>
        </div>
      {:else if currentPage === 'appearance'}
        <div>
          <h2 class="content-title">{$t('settings.appearance')}</h2>
          <p class="content-subtitle">{$t('settings.theme')}</p>
        </div>
      {:else if currentPage === 'about'}
        <div>
          <h2 class="content-title">{$t('settings.about')}</h2>
          <p class="content-subtitle">{$t('settings.about')}</p>
        </div>
      {/if}
    </div>

    <!-- 内容主体 -->
    <div class="content-body">
      {#if currentPage === 'ai-models'}
        <!-- AI 模型配置内容 -->
        <ServiceProviderManager
          {serviceProviders}
          on:update={handleServiceProvidersUpdate}
        />
      {:else if currentPage === 'preferences'}
        <!-- 偏好设置内容 -->
        <div class="settings-grid">
          <!-- 默认模型 -->
          {#if hasModels}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">{$t('settings.defaultModel')}</h3>
                <p class="setting-description">{$t('settings.selectDefaultModel')}</p>
              </div>
              <div class="setting-control">
                <CustomSelect
                  options={modelOptions}
                  bind:value={userPreferences.defaultModel}
                  placeholder={$t('settings.selectDefaultModel')}
                  size="md"
                  variant="default"
                  on:change={handleDefaultModelSelectChange}
                />
              </div>
            </div>
          {:else}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">{$t('settings.defaultModel')}</h3>
                <p class="setting-description">{$t('settings.modelSettings')}</p>
              </div>
              <div class="setting-control">
                <button
                  class="btn-primary"
                  on:click={() => currentPage = 'ai-models'}
                >
                  {$t('settings.addModel')}
                </button>
              </div>
            </div>
          {/if}





          <!-- 快捷键设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.shortcuts')}</h3>
              <p class="setting-description">{$t('settings.shortcutsDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="shortcut-list">
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('settings.toggleSidebar')}</span>
                  <kbd class="shortcut-key">Ctrl + Shift + Y</kbd>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('chat.sendMessage')}</span>
                  <kbd class="shortcut-key">Enter</kbd>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('settings.newLine')}</span>
                  <kbd class="shortcut-key">Shift + Enter</kbd>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('chat.clearChat')}</span>
                  <kbd class="shortcut-key">Ctrl + Shift + Delete</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if currentPage === 'appearance'}
        <!-- 外观设置内容 -->
        <div class="settings-grid">
          <!-- 主题设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.theme')}</h3>
              <p class="setting-description">{$t('settings.themeDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="theme-options">
                <button
                  class="theme-option {userPreferences.theme === 'light' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('light')}
                >
                  <div class="theme-preview theme-light">
                    <div class="theme-preview-content">
                      <div class="theme-preview-header"></div>
                      <div class="theme-preview-body">
                        <div class="theme-preview-text"></div>
                        <div class="theme-preview-text short"></div>
                      </div>
                    </div>
                  </div>
                  <span class="theme-name">{$t('settings.themeLight')}</span>
                  <span class="theme-description">{$t('settings.themeLightDesc')}</span>
                </button>

                <button
                  class="theme-option {userPreferences.theme === 'dark' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('dark')}
                >
                  <div class="theme-preview theme-dark">
                    <div class="theme-preview-content">
                      <div class="theme-preview-header"></div>
                      <div class="theme-preview-body">
                        <div class="theme-preview-text"></div>
                        <div class="theme-preview-text short"></div>
                      </div>
                    </div>
                  </div>
                  <span class="theme-name">{$t('settings.themeDark')}</span>
                  <span class="theme-description">{$t('settings.themeDarkDesc')}</span>
                </button>

                <button
                  class="theme-option {userPreferences.theme === 'auto' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('auto')}
                >
                  <div class="theme-preview theme-auto">
                    <div class="theme-preview-content">
                      <div class="theme-preview-header"></div>
                      <div class="theme-preview-body">
                        <div class="theme-preview-text"></div>
                        <div class="theme-preview-text short"></div>
                      </div>
                    </div>
                  </div>
                  <span class="theme-name">{$t('settings.themeAuto')}</span>
                  <span class="theme-description">{$t('settings.themeAutoDesc')}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 语言设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.language')}</h3>
              <p class="setting-description">{$t('settings.languageDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="language-options">
                <button
                  class="language-option {userPreferences.language === 'zh' ? 'language-option-active' : ''}"
                  on:click={() => handleLanguageChange('zh')}
                >
                  <div class="language-flag">🇨🇳</div>
                  <div class="language-info">
                    <span class="language-name">{$t('settings.languageChinese')}</span>
                    <span class="language-description">{$t('settings.languageChineseDesc')}</span>
                  </div>
                </button>
                <button
                  class="language-option {userPreferences.language === 'en' ? 'language-option-active' : ''}"
                  on:click={() => handleLanguageChange('en')}
                >
                  <div class="language-flag">🇺🇸</div>
                  <div class="language-info">
                    <span class="language-name">{$t('settings.languageEnglish')}</span>
                    <span class="language-description">{$t('settings.languageEnglishDesc')}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- 字体设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.fontSize')}</h3>
              <p class="setting-description">{$t('settings.fontSizeDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="font-size-options">
                <button
                  class="font-size-option font-size-small {userPreferences.fontSize === 'small' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('small')}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeSmall')}</span>
                </button>
                <button
                  class="font-size-option font-size-medium {userPreferences.fontSize === 'medium' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('medium')}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeMedium')}</span>
                </button>
                <button
                  class="font-size-option font-size-large {userPreferences.fontSize === 'large' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('large')}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeLarge')}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 消息密度 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.messageDensity')}</h3>
              <p class="setting-description">{$t('settings.messageDensityDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="density-options">
                <button
                  class="density-option {userPreferences.messageDensity === 'compact' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('compact')}
                >
                  <div class="density-preview density-compact">
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                  </div>
                  <span>{$t('settings.densityCompact')}</span>
                </button>
                <button
                  class="density-option {userPreferences.messageDensity === 'normal' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('normal')}
                >
                  <div class="density-preview density-normal">
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                  </div>
                  <span>{$t('settings.densityNormal')}</span>
                </button>
                <button
                  class="density-option {userPreferences.messageDensity === 'relaxed' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('relaxed')}
                >
                  <div class="density-preview density-relaxed">
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                  </div>
                  <span>{$t('settings.densityRelaxed')}</span>
                </button>
              </div>
            </div>
          </div>


        </div>
      {:else if currentPage === 'about'}
        <!-- 关于页面内容 -->
        <div class="about-content">
          <div class="about-header">
            <div class="about-icon">
              <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 class="about-title">SlimPaneAI</h3>
            <p class="about-version">版本 0.0.1</p>
            <p class="about-description">轻量级 AI 助手浏览器扩展</p>
          </div>

          <div class="about-info">
            <div class="info-item">
              <h4>功能特性</h4>
              <ul>
                <li>支持多种 AI 模型（OpenAI、Claude、Gemini）</li>
                <li>侧边栏智能对话</li>
                <li>文本选择增强功能</li>
                <li>本地安全存储</li>
              </ul>
            </div>
            <div class="info-item">
              <h4>开发信息</h4>
              <p>基于 Svelte + TypeScript 开发</p>
              <p>使用 Manifest V3 规范</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
<!-- 模态框 -->
{#if showAddModel}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-xl font-semibold text-gray-900">
          {editingModel ? '编辑模型' : '添加模型'}
        </h2>
      </div>

      <div class="modal-body">
        <ModelConfigForm
          modelId={editingModel}
          existingConfig={editingConfig}
          on:save={handleModelSaved}
          on:cancel={handleCancel}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  /* 主布局 */
  .app-container {
    display: flex;
    min-height: 100vh;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  /* 侧边栏 */
  .sidebar {
    width: 280px;
    background: var(--bg-primary);
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .sidebar-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
  }

  .logo-text {
    flex: 1;
  }

  .logo-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.2;
  }

  .logo-subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1;
  }

  /* 导航菜单 */
  .sidebar-nav {
    flex: 1;
    padding: 1rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-muted);
  }

  .nav-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .nav-item-active {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    flex-shrink: 0;
  }

  .nav-item-active .nav-icon {
    background: rgba(59, 130, 246, 0.2);
  }

  .nav-content {
    flex: 1;
    min-width: 0;
  }

  .nav-title {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .nav-description {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.125rem;
    line-height: 1.25;
  }

  .nav-item-active .nav-description {
    color: #6366f1;
  }

  /* 主内容区域 */
  .main-content {
    flex: 1;
    margin-left: 280px;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    transition: background-color 0.2s ease;
  }

  .content-header {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-primary);
    padding: 1.5rem 2rem 1rem;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .content-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.25rem 0;
    line-height: 1.3;
  }

  .content-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.4;
  }

  .content-body {
    flex: 1;
    padding: 1.5rem 2rem;
    background: var(--bg-secondary);
    transition: background-color 0.2s ease;
  }

  /* 设置网格 */
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .setting-item {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.2s ease;
  }

  .setting-item:hover {
    border-color: var(--border-secondary);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .setting-header {
    margin-bottom: 1.5rem;
  }

  .setting-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  .setting-description {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  .setting-control {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }



  /* 快捷键列表 */
  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--border-primary);
  }

  .shortcut-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .shortcut-key {
    background: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--text-muted);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  /* 主题选项 */
  .theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    text-align: center;
  }

  .theme-option:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .theme-option-active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .theme-preview {
    width: 4rem;
    height: 3rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    overflow: hidden;
    position: relative;
  }

  .theme-preview-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .theme-preview-header {
    height: 0.75rem;
    opacity: 0.8;
  }

  .theme-preview-body {
    flex: 1;
    padding: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .theme-preview-text {
    height: 0.25rem;
    border-radius: 0.125rem;
    opacity: 0.6;
  }

  .theme-preview-text.short {
    width: 60%;
  }

  .theme-light {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  }

  .theme-light .theme-preview-header {
    background: #f1f5f9;
  }

  .theme-light .theme-preview-text {
    background: #cbd5e1;
  }

  .theme-dark {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  }

  .theme-dark .theme-preview-header {
    background: #374151;
  }

  .theme-dark .theme-preview-text {
    background: #6b7280;
  }

  .theme-auto {
    background: linear-gradient(135deg, #ffffff 0%, #1f2937 100%);
  }

  .theme-auto .theme-preview-header {
    background: linear-gradient(90deg, #f1f5f9 0%, #374151 100%);
  }

  .theme-auto .theme-preview-text {
    background: linear-gradient(90deg, #cbd5e1 0%, #6b7280 100%);
  }

  .theme-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  .theme-description {
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* 语言选项 */
  .language-options {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .language-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    min-width: 200px;
  }

  .language-option:hover {
    border-color: #3b82f6;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .language-option-active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .language-flag {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .language-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .language-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  .language-description {
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* 字体大小选项 */
  .font-size-options {
    display: flex;
    gap: 1rem;
  }

  .font-size-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    min-width: 4rem;
  }

  .font-size-option:hover {
    border-color: #3b82f6;
  }

  .font-size-active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .font-size-preview {
    font-weight: 600;
    color: #374151;
  }

  .font-size-small .font-size-preview {
    font-size: 1rem;
  }

  .font-size-medium .font-size-preview {
    font-size: 1.25rem;
  }

  .font-size-large .font-size-preview {
    font-size: 1.5rem;
  }

  /* 消息密度选项 */
  .density-options {
    display: flex;
    gap: 1rem;
  }

  .density-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    min-width: 4rem;
  }

  .density-option:hover {
    border-color: #3b82f6;
  }

  .density-active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .density-preview {
    width: 2rem;
    height: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.125rem;
  }

  .density-message {
    height: 0.25rem;
    background: #cbd5e1;
    border-radius: 0.125rem;
  }

  .density-compact {
    gap: 0.0625rem;
  }

  .density-normal {
    gap: 0.125rem;
  }

  .density-relaxed {
    gap: 0.25rem;
  }

  /* 关于页面 */
  .about-content {
    max-width: 42rem;
  }

  .about-header {
    text-align: center;
    padding: 3rem 0;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 3rem;
  }

  .about-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5rem;
    height: 5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 1rem;
    margin: 0 auto 1.5rem;
    box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.3);
  }

  .about-title {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .about-version {
    font-size: 1rem;
    color: #6b7280;
    margin: 0 0 1rem 0;
  }

  .about-description {
    font-size: 1.125rem;
    color: #4b5563;
    margin: 0;
  }

  .about-info {
    display: grid;
    gap: 2rem;
  }

  .info-item {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 2rem;
  }

  .info-item h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 1rem 0;
  }

  .info-item ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .info-item li {
    padding: 0.5rem 0;
    color: #4b5563;
    border-bottom: 1px solid #f1f5f9;
  }

  .info-item li:last-child {
    border-bottom: none;
  }

  .info-item p {
    color: #4b5563;
    margin: 0.5rem 0;
  }

  /* 模态框 */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    background: white;
    border-radius: 1rem;
    max-width: 48rem;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: slideIn 0.3s ease-out;
  }

  .modal-header {
    padding: 0;
    border-bottom: none;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    flex-shrink: 0;
  }

  .modal-body {
    padding: 0;
    background: white;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  /* 动画 */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 响应式设计 */
  @media (max-width: 1024px) {
    .sidebar {
      width: 240px;
    }

    .main-content {
      margin-left: 240px;
    }

    .modal-content {
      max-width: 90vw;
      max-height: 85vh;
    }
  }

  @media (max-width: 768px) {
    .app-container {
      flex-direction: column;
    }

    .sidebar {
      position: relative;
      width: 100%;
      height: auto;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }

    .main-content {
      margin-left: 0;
    }

    .sidebar-nav {
      display: flex;
      overflow-x: auto;
      padding: 1rem;
      gap: 0.5rem;
    }

    .nav-item {
      flex-shrink: 0;
      min-width: 200px;
    }

    .content-header,
    .content-body {
      padding: 1rem;
    }

    .settings-grid {
      gap: 1rem;
    }

    .setting-item {
      padding: 1.5rem;
    }

    .theme-options {
      flex-direction: column;
    }

    .modal-content {
      max-width: 95vw;
      max-height: 90vh;
      margin: 1rem;
    }

    .modal-overlay {
      padding: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .sidebar-header {
      padding: 1rem;
    }

    .logo-icon {
      width: 2.5rem;
      height: 2.5rem;
    }

    .logo-title {
      font-size: 1.125rem;
    }

    .nav-item {
      min-width: 160px;
      padding: 0.75rem;
    }

    .nav-icon {
      width: 2rem;
      height: 2rem;
    }

    .content-title {
      font-size: 1.25rem;
    }

    .about-header {
      padding: 2rem 0;
    }

    .about-icon {
      width: 4rem;
      height: 4rem;
    }

    .about-title {
      font-size: 1.5rem;
    }

    .modal-content {
      max-width: 100vw;
      max-height: 100vh;
      margin: 0;
      border-radius: 0;
    }

    .modal-overlay {
      padding: 0;
    }
  }


</style>

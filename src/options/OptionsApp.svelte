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
  import WebChatConfigSettings from './components/WebChatConfigSettings.svelte';

  // 导航状态
  let currentPage = 'ai-models'; // 当前页面

  // 模型配置状态
  let showAddModel = false;
  let editingModel: string | null = null;
  let editingConfig: ModelConfig | null = null;
  let showInlineForm = false;

  // 语言初始化状态
  let languageInitialized = false;

  // 简化的状态管理
  let isUpdatingSettings = false;
  let currentUpdateOperation: string | null = null;

  // 直接使用 userPreferences，移除本地状态缓存
  // 这样可以避免状态不一致的问题

  // 导航菜单项
  let navigationItems: Array<{id: string, name: string, icon: string, title: string, description?: string}> = [];

  // 导航菜单项 - 只有在语言真正初始化后才更新，避免使用初始状态
  $: if (languageInitialized && $currentLanguage) {
    console.log('🔄 [Options] Language changed to:', $currentLanguage, 'updating navigationItems');
    try {
      navigationItems = [
        {
          id: 'ai-models',
          name: $t('settings.models'),
          title: $t('settings.models'),
          icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
          description: $t('settings.modelSettings')
        },
        {
          id: 'preferences',
          name: $t('settings.preferences'),
          title: $t('settings.preferences'),
          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
          description: $t('settings.general')
        },
        {
          id: 'web-chat',
          name: $t('settings.webChat'),
          title: $t('settings.webChat'),
          icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
          description: $t('settings.webChatDescription')
        },
        {
          id: 'appearance',
          name: $t('settings.appearance'),
          title: $t('settings.appearance'),
          icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z',
          description: $t('settings.theme')
        },
        {
          id: 'about',
          name: $t('settings.about'),
          title: $t('settings.about'),
          icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          description: $t('settings.about')
        }
      ];
      console.log('🔄 [Options] NavigationItems updated for language', $currentLanguage, ':', navigationItems.map(item => ({ id: item.id, title: item.title })));
    } catch (error) {
      console.error('❌ [Options] Error updating navigation items:', error);
    }
  }

  // 安全的响应式变量，添加防护措施
  $: modelEntries = $settingsStore?.modelSettings ? Object.entries($settingsStore.modelSettings) : [];
  $: serviceProviders = $settingsStore?.serviceProviders || {};
  $: userPreferences = $settingsStore?.userPreferences;
  $: modelOptions = serviceProviders ? getModelDisplayOptions(serviceProviders) : [];
  $: hasModels = modelOptions.length > 0;

  // 统一的设置初始化逻辑 - 只在首次加载时执行
  $: if (userPreferences && !$settingsStore.isLoading && !languageInitialized && !isUpdatingSettings) {
    try {
      console.log('🌍 [Options] First-time initialization:', userPreferences);

      // 初始化语言
      initializeLanguage(userPreferences);
      languageInitialized = true;

      // 应用初始主题
      applyTheme(userPreferences);

      console.log('✅ [Options] Initial setup completed');
    } catch (error) {
      console.error('❌ [Options] Error in initial setup:', error);
    }
  }

  onMount(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 [Options] Starting app initialization');
        await settingsStore.loadSettings();

        // Initialize service providers if none exist
        if (Object.keys($settingsStore.serviceProviders).length === 0) {
          const { getDefaultServiceProviders } = await import('@/lib/service-providers');
          const defaultProviders = getDefaultServiceProviders();
          await settingsStore.saveServiceProviders(defaultProviders);
        }

        // 监听系统主题变化
        const unwatch = watchSystemTheme(() => {
          const currentSettings = settingsStore.getCurrentState();
          if (currentSettings.userPreferences?.theme === 'auto' && !isUpdatingSettings) {
            // 只在非更新状态下响应系统主题变化，避免冲突
            applyTheme(currentSettings.userPreferences);
          }
        });

        console.log('✅ [Options] App initialization completed');
        return unwatch;
      } catch (error) {
        console.error('❌ [Options] App initialization failed:', error);
      }
    };

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    // Initialize the app
    initializeApp();

    // 清理函数
    return () => {
      // 清理状态
      isUpdatingSettings = false;
      currentUpdateOperation = null;

      // 移除消息监听器
      chrome.runtime.onMessage.removeListener(handleMessage);

      console.log('🧹 [Options] Component cleanup completed');
    };
  });

  function handleMessage(message: any) {
    console.log('🎯 [Options] Received message:', message);

    switch (message.type) {
      case 'storage-updated':
        // DISABLED: This was causing race conditions with manual updates
        console.log('💾 Storage updated message received, but ignoring to prevent race conditions');
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // 简化的设置更新函数
  async function updateSetting(key: string, value: any, applyImmediately = false) {
    // 防止重复操作
    if (isUpdatingSettings) {
      console.log('⏳ [Options] Settings update in progress, ignoring:', key);
      return;
    }

    // 防护措施：确保userPreferences存在
    if (!userPreferences) {
      console.error('❌ [Options] Cannot update setting: userPreferences is null');
      return;
    }

    try {
      console.log(`🔧 [Options] Updating setting: ${key} =`, value);
      isUpdatingSettings = true;
      currentUpdateOperation = key;

      const newPreferences = {
        ...userPreferences,
        [key]: value
      };

      // 保存到存储 - 这会触发 store 更新
      await settingsStore.saveUserPreferences(newPreferences);

      // 立即应用特定设置（如果需要）
      if (applyImmediately) {
        switch (key) {
          case 'theme':
            applyTheme(newPreferences);
            break;
          case 'language':
            setLanguage(value);
            break;
          case 'fontSize':
          case 'messageDensity':
            applyTheme(newPreferences);
            break;
        }
      }

      console.log(`✅ [Options] Setting ${key} updated successfully`);

    } catch (error) {
      console.error(`❌ [Options] Failed to update setting ${key}:`, error);
    } finally {
      // 确保状态重置
      isUpdatingSettings = false;
      currentUpdateOperation = null;
    }
  }

  // 强制重置状态的函数（用于调试）
  function forceResetSettingsState() {
    console.log('🔄 [Options] Force resetting settings state');
    isUpdatingSettings = false;
    currentUpdateOperation = null;
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

  // 重写的设置处理函数，使用统一的更新机制
  async function handleDefaultModelChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    await updateSetting('defaultModel', target.value);
  }

  async function handleDefaultModelSelectChange(event: CustomEvent) {
    await updateSetting('defaultModel', event.detail.value);
  }

  async function handleThemeChange(theme: 'light' | 'dark' | 'auto') {
    console.log('🎨 [Options] Theme change requested:', theme, 'Current state:', { isUpdatingSettings, userPreferences: !!userPreferences });
    await updateSetting('theme', theme, true);
  }

  async function handleLanguageChange(language: 'en' | 'zh') {
    console.log('🌍 [Options] Language change requested:', language, 'Current state:', { isUpdatingSettings, userPreferences: !!userPreferences });
    await updateSetting('language', language, true);
  }

  async function handleFontSizeChange(fontSize: 'small' | 'medium' | 'large') {
    console.log('📝 [Options] Font size change requested:', fontSize, 'Current state:', { isUpdatingSettings, userPreferences: !!userPreferences });
    await updateSetting('fontSize', fontSize, true);
  }

  async function handleMessageDensityChange(messageDensity: 'compact' | 'normal' | 'relaxed') {
    console.log('📏 [Options] Message density change requested:', messageDensity, 'Current state:', { isUpdatingSettings, userPreferences: !!userPreferences });
    await updateSetting('messageDensity', messageDensity, true);
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
      {:else if currentPage === 'web-chat'}
        <div>
          <h2 class="content-title">{$t('settings.webChat')}</h2>
          <p class="content-subtitle">{$t('settings.webChatDescription')}</p>
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
          {#if hasModels && userPreferences}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">{$t('settings.defaultModel') || '默认模型'}</h3>
                <p class="setting-description">{$t('settings.selectDefaultModel') || '选择默认模型'}</p>
              </div>
              <div class="setting-control">
                <CustomSelect
                  options={modelOptions}
                  bind:value={userPreferences.defaultModel}
                  placeholder={$t('settings.selectDefaultModel') || '选择默认模型'}
                  size="md"
                  variant="default"
                  on:change={handleDefaultModelSelectChange}
                />
              </div>
            </div>
          {:else}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">{$t('settings.defaultModel') || '默认模型'}</h3>
                <p class="setting-description">{$t('settings.modelSettings') || '模型设置'}</p>
              </div>
              <div class="setting-control">
                <button
                  class="btn-primary"
                  on:click={() => currentPage = 'ai-models'}
                >
                  {$t('settings.addModel') || '添加模型'}
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
                <!-- 移除打开/关闭侧边栏快捷键，因为没有生效 -->
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('chat.sendMessage')}</span>
                  <kbd class="shortcut-key">Enter</kbd>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-name">{$t('settings.newLine')}</span>
                  <kbd class="shortcut-key">Shift + Enter</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if currentPage === 'web-chat'}
        <!-- 网页聊天配置内容 -->
        <WebChatConfigSettings />
      {:else if currentPage === 'appearance'}
        <!-- 外观设置内容 -->
        <div class="settings-grid">
          <!-- 调试面板已移除，避免红色按钮闪烁 -->
          <!-- 主题设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.theme')}</h3>
              <p class="setting-description">{$t('settings.themeDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="theme-options">
                <button
                  class="theme-option {userPreferences?.theme === 'light' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('light')}
                  disabled={isUpdatingSettings || !userPreferences}
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
                  <span class="theme-name">{$t('settings.themeLight') || '浅色'}</span>
                  <span class="theme-description">{$t('settings.themeLightDesc') || '浅色主题'}</span>
                </button>

                <button
                  class="theme-option {userPreferences?.theme === 'dark' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('dark')}
                  disabled={isUpdatingSettings || !userPreferences}
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
                  <span class="theme-name">{$t('settings.themeDark') || '深色'}</span>
                  <span class="theme-description">{$t('settings.themeDarkDesc') || '深色主题'}</span>
                </button>

                <button
                  class="theme-option {userPreferences?.theme === 'auto' ? 'theme-option-active' : ''}"
                  on:click={() => handleThemeChange('auto')}
                  disabled={isUpdatingSettings || !userPreferences}
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
          {#if userPreferences}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">{$t('settings.language') || '语言'}</h3>
                <p class="setting-description">{$t('settings.languageDesc') || '选择界面语言'}</p>
              </div>
              <div class="setting-control">
                <div class="language-options">
                  <button
                    class="language-option {userPreferences?.language === 'zh' ? 'language-option-active' : ''}"
                    on:click={() => handleLanguageChange('zh')}
                    disabled={isUpdatingSettings || !userPreferences}
                  >
                    <div class="language-flag">🇨🇳</div>
                    <div class="language-info">
                      <span class="language-name">{$t('settings.languageChinese') || '中文'}</span>
                      <span class="language-description">{$t('settings.languageChineseDesc') || '简体中文'}</span>
                    </div>
                  </button>
                  <button
                    class="language-option {userPreferences?.language === 'en' ? 'language-option-active' : ''}"
                    on:click={() => handleLanguageChange('en')}
                    disabled={isUpdatingSettings || !userPreferences}
                  >
                    <div class="language-flag">🇺🇸</div>
                    <div class="language-info">
                      <span class="language-name">{$t('settings.languageEnglish') || 'English'}</span>
                      <span class="language-description">{$t('settings.languageEnglishDesc') || 'English'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          {/if}

          <!-- 字体设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">{$t('settings.fontSize')}</h3>
              <p class="setting-description">{$t('settings.fontSizeDesc')}</p>
            </div>
            <div class="setting-control">
              <div class="font-size-options">
                <button
                  class="font-size-option font-size-small {userPreferences?.fontSize === 'small' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('small')}
                  disabled={isUpdatingSettings || !userPreferences}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeSmall') || '小'}</span>
                </button>
                <button
                  class="font-size-option font-size-medium {userPreferences?.fontSize === 'medium' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('medium')}
                  disabled={isUpdatingSettings || !userPreferences}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeMedium') || '中'}</span>
                </button>
                <button
                  class="font-size-option font-size-large {userPreferences?.fontSize === 'large' ? 'font-size-active' : ''}"
                  on:click={() => handleFontSizeChange('large')}
                  disabled={isUpdatingSettings || !userPreferences}
                >
                  <span class="font-size-preview">Aa</span>
                  <span>{$t('settings.fontSizeLarge') || '大'}</span>
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
                  class="density-option {userPreferences?.messageDensity === 'compact' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('compact')}
                  disabled={isUpdatingSettings || !userPreferences}
                >
                  <div class="density-preview density-compact">
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                  </div>
                  <span>{$t('settings.densityCompact') || '紧凑'}</span>
                </button>
                <button
                  class="density-option {userPreferences?.messageDensity === 'normal' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('normal')}
                  disabled={isUpdatingSettings || !userPreferences}
                >
                  <div class="density-preview density-normal">
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                    <div class="density-message"></div>
                  </div>
                  <span>{$t('settings.densityNormal') || '正常'}</span>
                </button>
                <button
                  class="density-option {userPreferences?.messageDensity === 'relaxed' ? 'density-active' : ''}"
                  on:click={() => handleMessageDensityChange('relaxed')}
                  disabled={isUpdatingSettings || !userPreferences}
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
            <p class="about-version">{$t('about.version')} 0.0.1</p>
            <p class="about-description">{$t('about.description')}</p>
          </div>

          <div class="about-info">
            <div class="info-item">
              <h4>{$t('about.features')}</h4>
              <ul>
                {#if $currentLanguage === 'zh'}
                  <li>支持多种 AI 模型（OpenAI、Claude、Gemini、自定义）</li>
                  <li>侧边栏智能对话界面</li>
                  <li>网页内容智能问答与分析</li>
                  <li>智能内容提取与处理</li>
                  <li>多主题界面切换（浅色/深色/自动）</li>
                  <li>多语言支持（中文/英文）</li>
                  <li>对话历史管理与搜索</li>
                  <li>自定义模型配置与管理</li>
                  <li>数学公式渲染支持</li>
                  <li>本地数据存储，保护隐私</li>
                {:else}
                  <li>Support for multiple AI models (OpenAI, Claude, Gemini, Custom)</li>
                  <li>Sidebar intelligent chat interface</li>
                  <li>Web content Q&A and analysis</li>
                  <li>Intelligent content extraction and processing</li>
                  <li>Multi-theme interface switching (Light/Dark/Auto)</li>
                  <li>Multi-language support (Chinese/English)</li>
                  <li>Chat history management and search</li>
                  <li>Custom model configuration and management</li>
                  <li>Math formula rendering support</li>
                  <li>Local data storage for privacy protection</li>
                {/if}
              </ul>
            </div>

            <div class="info-item">
              <h4>{$t('about.developer')}</h4>
              <p><strong>SlimPaneAI Team</strong></p>
              <p>{$t('about.version')}: 0.0.1</p>
              <p>{$currentLanguage === 'zh' ? '更新时间' : 'Last Updated'}: 2024-12</p>
              <p>{$currentLanguage === 'zh' ? '基于 Svelte + TypeScript 开发' : 'Built with Svelte + TypeScript'}</p>
              <p>{$currentLanguage === 'zh' ? '使用 Manifest V3 规范' : 'Using Manifest V3 specification'}</p>
            </div>

            <div class="info-item">
              <h4>{$t('about.license')}</h4>
              <p>MIT License</p>
              <p>{$currentLanguage === 'zh' ? '本项目采用 MIT 开源协议，允许自由使用和修改。' : 'This project is licensed under the MIT License, allowing free use and modification.'}</p>
            </div>

            <div class="info-item">
              <h4>{$t('about.support')}</h4>
              <p>{$currentLanguage === 'zh' ? '如有问题或建议，欢迎反馈：' : 'For questions or suggestions, please contact:'}</p>
              <ul>
                <li>{$currentLanguage === 'zh' ? '功能建议和问题反馈' : 'Feature requests and bug reports'}</li>
                <li>{$currentLanguage === 'zh' ? '使用帮助和技术支持' : 'Usage help and technical support'}</li>
                <li>{$currentLanguage === 'zh' ? '开源贡献和协作' : 'Open source contributions and collaboration'}</li>
              </ul>
            </div>

            <div class="info-item">
              <h4>{$t('about.acknowledgments')}</h4>
              <p>{$currentLanguage === 'zh' ? '感谢以下技术和服务的支持：' : 'Thanks to the following technologies and services:'}</p>
              <ul>
                <li>Svelte & SvelteKit</li>
                <li>Chrome Extensions API</li>
                <li>OpenAI API</li>
                <li>Anthropic Claude API</li>
                <li>Google Gemini API</li>
              </ul>
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
    /* 确保侧边栏高度与主内容区域一致 */
    top: 0;
    left: 0;
  }

  .sidebar-header {
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border-primary);
    /* 确保侧边栏头部高度固定，适度缩小 */
    height: 85px; /* 使用固定高度而不是最小高度 */
    display: flex;
    align-items: center;
    box-sizing: border-box; /* 确保边框包含在高度内 */
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
    width: 2.25rem;
    height: 2.25rem;
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
    width: 2.25rem;
    height: 2.25rem;
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
    /* 确保主内容区域高度与侧边栏一致 */
    min-height: 100vh;
    height: 100vh;
  }

  .content-header {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-primary);
    padding: 1.25rem 2rem 1rem;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    /* 确保内容头部高度与侧边栏头部一致，适度缩小 */
    height: 85px; /* 使用固定高度与侧边栏完全对齐 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box; /* 确保边框包含在高度内 */
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
    /* 网格布局：固定标题区域宽度，减少语言切换时的跳动 */
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
    align-items: start;
  }

  .setting-item:hover {
    border-color: var(--border-secondary);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .setting-header {
    /* 移除 margin-bottom，因为现在使用网格布局 */
    margin-bottom: 0;
    /* 固定宽度和高度，防止文本长度变化导致布局跳动 */
    min-width: 260px;
    min-height: 80px; /* 固定最小高度 */
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .setting-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    /* 确保标题不会因为长度变化而换行 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* 固定标题高度 */
    height: 1.75rem;
    line-height: 1.75rem;
  }

  .setting-description {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
    /* 固定描述文本高度，防止换行导致高度变化 */
    height: 2.4em; /* 固定高度，约2行 */
    line-height: 1.2;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .setting-control {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    /* 确保控制区域有足够的最小宽度 */
    min-width: 300px;
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
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
    /* 固定最小宽度和高度，减少语言切换时的跳动 */
    min-width: 200px;
    width: 100%;
    min-height: 180px; /* 固定最小高度 */
    justify-content: space-between;
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
    /* 固定标题高度 */
    height: 1.25rem;
    line-height: 1.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .theme-description {
    font-size: 0.75rem;
    color: #6b7280;
    /* 固定描述高度 */
    height: 1rem;
    line-height: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    /* 增加最小宽度和高度，确保中英文切换时尺寸稳定 */
    min-width: 240px;
    flex: 1;
    max-width: 300px;
    min-height: 80px; /* 固定最小高度 */
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
    /* 确保文本区域有固定的最小宽度 */
    min-width: 120px;
    flex: 1;
  }

  .language-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    /* 防止文本换行导致高度变化 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* 固定标题高度 */
    height: 1.25rem;
    line-height: 1.25rem;
  }

  .language-description {
    font-size: 0.75rem;
    color: #6b7280;
    /* 固定描述高度 */
    height: 1rem;
    line-height: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    /* 增加最小宽度和高度，确保中英文切换时尺寸稳定 */
    min-width: 80px;
    flex: 1;
    max-width: 120px;
    min-height: 100px; /* 固定最小高度 */
    justify-content: center;
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
    /* 增加最小宽度和高度，确保中英文切换时尺寸稳定 */
    min-width: 80px;
    flex: 1;
    max-width: 120px;
    min-height: 100px; /* 固定最小高度 */
    justify-content: center;
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
      /* 移动端改为单列布局 */
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .setting-header {
      /* 移动端标题区域不需要固定宽度 */
      min-width: unset;
    }

    .setting-title {
      /* 移动端允许标题换行 */
      white-space: normal;
    }

    .setting-control {
      /* 移动端控制区域不需要最小宽度 */
      min-width: unset;
    }

    .theme-options {
      flex-direction: column;
    }

    .language-option {
      /* 移动端语言选项占满宽度 */
      min-width: unset;
      max-width: unset;
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

  /* 平滑过渡效果 */
  :global(html) {
    transition: background-color 0.2s ease, color 0.2s ease !important;
  }

  :global(body) {
    transition: background-color 0.2s ease, color 0.2s ease !important;
  }

  /* 所有主要元素的平滑过渡 */
  :global(.settings-container),
  :global(.setting-item),
  :global(.theme-option),
  :global(.language-option),
  :global(.font-size-option),
  :global(.density-option),
  :global(button),
  :global(input),
  :global(select),
  :global(textarea) {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
  }

  /* 调试面板样式已移除 */


</style>

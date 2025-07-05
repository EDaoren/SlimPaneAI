<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '../panel/stores/settings';
  import ModelConfigForm from '../panel/components/ModelConfigForm.svelte';
  import ServiceProviderManager from '../panel/components/ServiceProviderManager.svelte';
  import type { ModelConfig, ServiceProviderSettings } from '../types';

  // 导航状态
  let currentPage = 'ai-models'; // 当前页面

  // 模型配置状态
  let showAddModel = false;
  let editingModel: string | null = null;
  let editingConfig: ModelConfig | null = null;
  let showInlineForm = false;

  // 导航菜单项
  const navigationItems = [
    {
      id: 'ai-models',
      title: 'AI 模型',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      description: '管理服务提供商和模型'
    },
    {
      id: 'preferences',
      title: '偏好设置',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      description: '自定义使用体验'
    },
    {
      id: 'appearance',
      title: '外观',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z',
      description: '界面主题和显示设置'
    },
    {
      id: 'about',
      title: '关于',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      description: '版本信息和帮助'
    }
  ];

  $: modelEntries = Object.entries($settingsStore.modelSettings);
  $: serviceProviders = $settingsStore.serviceProviders;
  $: userPreferences = $settingsStore.userPreferences;

  onMount(async () => {
    await settingsStore.loadSettings();

    // Initialize service providers if none exist
    if (Object.keys($settingsStore.serviceProviders).length === 0) {
      const { getDefaultServiceProviders } = await import('@/lib/service-providers');
      const defaultProviders = getDefaultServiceProviders();
      await settingsStore.saveServiceProviders(defaultProviders);
    }

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

  async function handleLanguageChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      language: target.value as 'en' | 'zh'
    };
    await settingsStore.saveUserPreferences(newPreferences);
  }

  async function handleThemeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const newPreferences = {
      ...userPreferences,
      theme: target.value as 'light' | 'dark' | 'auto'
    };
    await settingsStore.saveUserPreferences(newPreferences);
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
            <h2 class="content-title">AI 模型配置</h2>
            <p class="content-subtitle">
              管理您的 AI 服务提供商和模型配置
            </p>
          </div>
        </div>
      {:else if currentPage === 'preferences'}
        <div>
          <h2 class="content-title">偏好设置</h2>
          <p class="content-subtitle">自定义您的使用体验</p>
        </div>
      {:else if currentPage === 'appearance'}
        <div>
          <h2 class="content-title">外观设置</h2>
          <p class="content-subtitle">界面主题和显示设置</p>
        </div>
      {:else if currentPage === 'about'}
        <div>
          <h2 class="content-title">关于 SlimPaneAI</h2>
          <p class="content-subtitle">版本信息和帮助</p>
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
          {#if modelEntries.length > 0}
            <div class="setting-item">
              <div class="setting-header">
                <h3 class="setting-title">默认模型</h3>
                <p class="setting-description">选择默认使用的 AI 模型</p>
              </div>
              <div class="setting-control">
                <select
                  class="form-select"
                  value={userPreferences.defaultModel}
                  on:change={handleDefaultModelChange}
                >
                  <option value="">请选择默认模型</option>
                  {#each modelEntries as [id, config]}
                    <option value={id}>{getProviderName(config.provider)} - {config.model}</option>
                  {/each}
                </select>
              </div>
            </div>
          {/if}

          <!-- 语言设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">界面语言</h3>
              <p class="setting-description">选择界面显示语言</p>
            </div>
            <div class="setting-control">
              <select
                class="form-select"
                value={userPreferences.language}
                on:change={handleLanguageChange}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <!-- 主题设置 -->
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">主题模式</h3>
              <p class="setting-description">选择界面主题</p>
            </div>
            <div class="setting-control">
              <select
                class="form-select"
                value={userPreferences.theme}
                on:change={handleThemeChange}
              >
                <option value="auto">跟随系统</option>
                <option value="light">浅色模式</option>
                <option value="dark">深色模式</option>
              </select>
            </div>
          </div>
        </div>
      {:else if currentPage === 'appearance'}
        <!-- 外观设置内容 -->
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-header">
              <h3 class="setting-title">界面主题</h3>
              <p class="setting-description">自定义界面外观和颜色</p>
            </div>
            <div class="setting-control">
              <div class="theme-options">
                <div class="theme-option">
                  <div class="theme-preview theme-light"></div>
                  <span>浅色</span>
                </div>
                <div class="theme-option">
                  <div class="theme-preview theme-dark"></div>
                  <span>深色</span>
                </div>
                <div class="theme-option">
                  <div class="theme-preview theme-auto"></div>
                  <span>自动</span>
                </div>
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
    background: #f8fafc;
  }

  /* 侧边栏 */
  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #f1f5f9;
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
    color: #111827;
    margin: 0;
    line-height: 1.2;
  }

  .logo-subtitle {
    font-size: 0.75rem;
    color: #6b7280;
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
    color: #6b7280;
  }

  .nav-item:hover {
    background: #f8fafc;
    color: #374151;
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
    color: #9ca3af;
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
  }

  .content-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 1.5rem 2rem 1rem;
  }

  .content-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.25rem 0;
    line-height: 1.3;
  }

  .content-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.4;
  }

  .content-body {
    flex: 1;
    padding: 1.5rem 2rem;
  }

  /* 设置网格 */
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .setting-item {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.2s ease;
  }

  .setting-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .setting-header {
    margin-bottom: 1.5rem;
  }

  .setting-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .setting-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .setting-control {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 主题选项 */
  .theme-options {
    display: flex;
    gap: 1rem;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-option:hover {
    border-color: #3b82f6;
  }

  .theme-preview {
    width: 3rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }

  .theme-light {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  }

  .theme-dark {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  }

  .theme-auto {
    background: linear-gradient(135deg, #ffffff 0%, #1f2937 100%);
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

import { writable, derived } from 'svelte/store';
import type { UserPreferences } from '@/types';

// 语言类型
export type Language = 'zh' | 'en';

// 翻译键类型
export interface Translations {
  // 通用
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    confirm: string;
    loading: string;
    error: string;
    success: string;
    settings: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    search: string;
    clear: string;
    copy: string;
    paste: string;
    cut: string;
    select: string;
    selectAll: string;
    none: string;
    all: string;
    yes: string;
    no: string;
    examples: string;
    actions: string;
    done: string;
    or: string;
    add: string;
    update: string;
    confirmDelete: string;
  };

  // 聊天界面
  chat: {
    title: string;
    placeholder: string;
    send: string;
    newChat: string;
    clearChat: string;
    exportChat: string;
    thinking: string;
    typing: string;
    selectModel: string;
    noModels: string;
    modelNotConfigured: string;
    sendMessage: string;
    loading: string;
    messages: string;
    deleteSession: string;
    noChats: string;
    noChatDesc: string;
    messageHistory: string;
    userMessage: string;
    assistantMessage: string;
    systemMessage: string;
    errorMessage: string;
    retryMessage: string;
    copyMessage: string;
    deleteMessage: string;
    regenerateMessage: string;
    greeting: string;
    greetingDesc: string;
    emptyMessage: string;

    // 快速操作
    startChat: string;
    startChatDesc: string;
    textProcessing: string;
    textProcessingDesc: string;

    // 思考过程
    reasoning: string;
  };

  // 设置页面
  settings: {
    title: string;
    general: string;
    appearance: string;
    models: string;
    advanced: string;
    about: string;
    webChat: string;
    webChatDescription: string;
    
    // 模型设置
    modelSettings: string;
    addModel: string;
    editModel: string;
    deleteModel: string;
    modelProvider: string;
    modelName: string;
    apiKey: string;
    baseUrl: string;
    customModel: string;
    testConnection: string;
    connectionSuccessful: string;
    
    // 外观设置
    theme: string;
    themeDesc: string;
    themeLight: string;
    themeLightDesc: string;
    themeDark: string;
    themeDarkDesc: string;
    themeAuto: string;
    themeAutoDesc: string;
    language: string;
    languageDesc: string;
    languageChinese: string;
    languageChineseDesc: string;
    languageEnglish: string;
    languageEnglishDesc: string;
    fontSize: string;
    fontSizeDesc: string;
    fontSizeSmall: string;
    fontSizeMedium: string;
    fontSizeLarge: string;
    messageDensity: string;
    messageDensityDesc: string;
    densityCompact: string;
    densityNormal: string;
    densityRelaxed: string;

    // 快捷键设置
    shortcuts: string;
    shortcutsDesc: string;
    newLine: string;
    
    // 偏好设置
    preferences: string;
    defaultModel: string;
    selectDefaultModel: string;
    autoSave: string;
    showTimestamp: string;
    enableNotifications: string;
    enableSounds: string;

    // 模型配置表单
    updateModel: string;
    provider: string;
    model: string;
    enterModelName: string;
    selectModel: string;
    enterCustomModelName: string;
    apiKeyPlaceholder: string;
    apiKeyHelp: string;
    baseUrlOptional: string;
    baseUrlRequired: string;
    baseUrlPlaceholder: string;
    baseUrlHelp: string;
    baseUrlHelpCustom: string;
    advancedSettings: string;
    maxTokens: string;
    maxTokensPlaceholder: string;
    maxTokensHelp: string;
    temperature: string;
    temperatureFocused: string;
    temperatureCreative: string;

    // 服务提供商管理
    configureProviders: string;
    configureProvidersDesc: string;
    getStarted: string;
    serviceProviders: string;
    manageProvidersDesc: string;
    filterProviders: string;
    customApiKey: string;
    allProviders: string;
    enabled: string;
    builtinProviders: string;
    customProviders: string;
    noEnabledProviders: string;
    noEnabledProvidersDesc: string;

    // 服务提供商模态框
    addCustomProvider: string;
    editProvider: string;
    providerName: string;
    enterProviderName: string;
    enterApiKey: string;
    enterBaseUrl: string;
    testing: string;
    updateModelList: string;
    updating: string;
    modelsUpdated: string;
    updateFailed: string;
    availableModels: string;
    noModelsFound: string;

    // 验证消息
    pleaseEnterProviderName: string;
    pleaseEnterApiKey: string;
    pleaseEnterBaseUrl: string;
    pleaseFillApiKeyAndUrl: string;

    // 服务提供商卡片
    disabled: string;
    default: string;
    builtin: string;
    custom: string;
    modelsCount: string;
    apiStatus: string;
    configured: string;
    notConfigured: string;
    endpoint: string;
    defaultEndpoint: string;
    customEndpoint: string;
    settings: string;
    setAsDefault: string;
    delete: string;
    deleteConfirm: string;

    // 服务提供商模态框表单
    basicInfo: string;
    providerNameRequired: string;
    providerNamePlaceholder: string;
    icon: string;
    iconPlaceholder: string;
    apiConfiguration: string;
    apiKeyRequired: string;
    apiProxyUrl: string;
    optional: string;
    required: string;
    leaveEmptyForDefault: string;
    checkConnection: string;
    modelList: string;
    updateList: string;
    add: string;
  };

  // 右键菜单
  contextMenu: {
    summarize: string;
    translate: string;
    explain: string;
    analyze: string;
    rewrite: string;
  };

  // 错误信息
  errors: {
    networkError: string;
    apiError: string;
    configError: string;
    unknownError: string;
    invalidApiKey: string;
    modelNotFound: string;
    rateLimitExceeded: string;
    insufficientCredits: string;

    // 详细错误信息
    apiKeyExpired: string;
    checkApiKey: string;
    quotaExceeded: string;
    upgradeApiPlan: string;
    serverBusy: string;
    serverOverloaded: string;
    waitAndRetry: string;
    connectionFailed: string;
    checkConnection: string;
    modelNotConfigured: string;
    configureModel: string;
    clickSettings: string;
    requestTimeout: string;
    timeoutDetails: string;
    simplifyQuestion: string;
    requestFailed: string;
    retryLater: string;
    accessDenied: string;
    permissionError: string;
    checkPermissions: string;
    serverError: string;
    providerError: string;
    tryOtherModel: string;
  };

  // 提示信息
  prompts: {
    deleteConfirm: string;
    clearChatConfirm: string;
    unsavedChanges: string;
    resetSettings: string;
    exportSuccess: string;
    importSuccess: string;
  };

  // 关于页面
  about: {
    version: string;
    description: string;
    features: string;
    developer: string;
    contact: string;
    license: string;
    acknowledgments: string;
    changelog: string;
    support: string;
  };

  // 页面内容
  pageContent: {
    title: string;
    disabled: string;
    enable: string;
    noContent: string;

    settings: string;
    autoExtract: string;
    includeImages: string;
    includeLinks: string;
    maxTokens: string;
    excludeSelectors: string;
    includeSelectors: string;
    domainSettings: string;
    enableForDomain: string;
    disableForDomain: string;
    resetDomain: string;
    contentPreview: string;
    tokenCount: string;
    wordCount: string;
    lastExtracted: string;

    contentTooLarge: string;
    contentEmpty: string;
    extractionError: string;
    unsupportedPage: string;
    processingPdf: string;
    pdfProgress: string;
    pdfComplete: string;
    pdfError: string;
    useContent: string;

    tokenWarning: string;
    tokenError: string;
    extractionFailed: string;
    pdfProcessingFailed: string;
    smartSettings: string;
    applySmartSettings: string;
    exportSettings: string;
    importSettings: string;
  };

  // 页面聊天
  pageChat: {
    title: string;
    enable: string;
    disable: string;
    enabled: string;
    disabled: string;
    toggle: string;
    description: string;
    noPageContent: string;
    extractFirst: string;
    usePageContent: string;
    pageContentUsed: string;
    clearPageContent: string;
    refreshPageContent: string;
    autoMode: string;
    manualMode: string;
    smartMode: string;
    settings: string;
    help: string;
    examples: string;
    tips: string;
    limitations: string;
    troubleshooting: string;
  };

  // 网页聊天配置
  webChatConfig: {
    title: string;
    description: string;
    mode: string;
    modeText: string;
    modeReadability: string;
    modeTextDesc: string;
    modeReadabilityDesc: string;

    // 全局配置
    globalSettings: string;
    removeElements: string;
    removeElementsDesc: string;
    removeElementsPlaceholder: string;

    // Readability 配置
    readabilitySettings: string;
    charThreshold: string;
    charThresholdDesc: string;
    maxElemsToDivide: string;
    maxElemsToDivideDesc: string;
    keepClasses: string;
    keepClassesDesc: string;
    preserveLinks: string;
    preserveLinksDesc: string;

    // 元数据配置
    metadataSettings: string;
    metadataEnabled: string;
    metadataDisabled: string;
    metadataDescription: string;
    manageFields: string;
    fieldsManager: string;
    fieldsCount: string;
    enabledFields: string;
    templateSettings: string;
    outputTemplate: string;
    templateDescription: string;
    autoGenerate: string;

    // 域名规则
    domainRules: string;
    domainRulesEnabled: string;
    domainRulesDisabled: string;
    domainRulesDescription: string;
    addDomainRule: string;
    editDomainRule: string;
    deleteDomainRule: string;
    noDomainRules: string;
    noDomainRulesDesc: string;

    // 域名规则编辑器
    domainRuleEditor: string;
    addRule: string;
    editRule: string;
    basicConfig: string;
    domain: string;
    domainPlaceholder: string;
    domainHelp: string;
    ruleName: string;
    ruleNamePlaceholder: string;
    ruleNameHelp: string;
    suggestFromCurrentPage: string;

    // 元数据字段管理
    metadataFieldsManager: string;
    addField: string;
    editField: string;
    deleteField: string;
    fieldKey: string;
    fieldName: string;
    fieldSelector: string;
    fieldEnabled: string;
    fieldDisabled: string;
    predefinedField: string;
    customField: string;
    addPredefinedField: string;
    addCustomField: string;
    selectPredefinedField: string;
    fieldKeyRequired: string;
    fieldNameRequired: string;
    cssSelector: string;
    cssSelectorPlaceholder: string;

    // 预定义字段
    authorField: string;
    dateField: string;
    tagsField: string;
    titleField: string;
    votesField: string;
    viewsField: string;
    sourceField: string;
    locationField: string;
    categoryField: string;
    commentCountField: string;
    readingTimeField: string;
    wordCountField: string;

    // 验证和错误
    validationErrors: string;
    domainRequired: string;
    nameRequired: string;
    invalidDomain: string;
    duplicateDomain: string;
    fieldKeyExists: string;
    invalidSelector: string;

    // 操作按钮
    saveChanges: string;
    discardChanges: string;
    resetToDefault: string;
    exportConfig: string;
    importConfig: string;
    testConfig: string;
    previewExtraction: string;

    // 状态信息
    saving: string;
    saved: string;
    saveFailed: string;
    loading: string;
    loadFailed: string;
    configUpdated: string;
    configReset: string;

    // 字段状态消息
    noEnabledFields: string;
    noEnabledFieldsDesc: string;
  };
}

// 当前语言 store
export const currentLanguage = writable<Language>('zh');

// 语言初始化状态
let isLanguageInitialized = false;

// 翻译函数 store
export const t = derived(
  currentLanguage,
  ($currentLanguage) => {
    const translations = getTranslations($currentLanguage);
    
    return (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: any = translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }
      
      if (typeof value !== 'string') {
        return key;
      }
      
      // 替换参数
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() || match;
        });
      }
      
      return value;
    };
  }
);

// 设置语言
export function setLanguage(language: Language) {
  try {
    console.log('🌍 [i18n] Setting language to:', language);

    // 使用 requestAnimationFrame 来平滑更新语言
    requestAnimationFrame(() => {
      currentLanguage.set(language);
    });

    console.log('✅ [i18n] Language set successfully');
  } catch (error) {
    console.error('❌ [i18n] Failed to set language:', error);
  }
}

// 从用户偏好初始化语言
export function initializeLanguage(preferences: UserPreferences) {
  try {
    if (!preferences || !preferences.language) {
      console.warn('⚠️ [i18n] No language preference found, using default');
      return;
    }

    const targetLanguage = preferences.language as Language;
    console.log('🌍 [i18n] Initializing language to:', targetLanguage);

    // 检查是否需要更新语言
    let currentLang: Language = 'zh'; // 默认值
    const unsubscribe = currentLanguage.subscribe(lang => currentLang = lang);
    unsubscribe(); // 立即取消订阅，只获取当前值

    if (currentLang !== targetLanguage) {
      setLanguage(targetLanguage);
      isLanguageInitialized = true;
      console.log('✅ [i18n] Language initialized successfully');
    } else {
      console.log('ℹ️ [i18n] Language already set to target language');
      isLanguageInitialized = true;
    }
  } catch (error) {
    console.error('❌ [i18n] Failed to initialize language:', error);
  }
}

// 获取翻译对象
function getTranslations(language: Language): Translations {
  switch (language) {
    case 'en':
      return englishTranslations;
    case 'zh':
    default:
      return chineseTranslations;
  }
}

// 中文翻译
const chineseTranslations: Translations = {
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    confirm: '确认',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    settings: '设置',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    search: '搜索',
    clear: '清空',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    select: '选择',
    selectAll: '全选',
    none: '无',
    all: '全部',
    yes: '是',
    no: '否',
    examples: '示例',
    actions: '操作',
    done: '完成',
    or: '或',
    update: '更新',
    confirmDelete: '确定要删除吗？',
  },

  chat: {
    title: 'AI 助手',
    placeholder: '输入您的问题...',
    send: '发送',
    newChat: '新对话',
    clearChat: '清空对话',
    exportChat: '导出对话',
    thinking: '思考中...',
    typing: '正在输入...',
    selectModel: '选择模型',
    noModels: '未配置模型',
    modelNotConfigured: '请先配置 AI 模型',
    sendMessage: '发送消息',
    messageHistory: '消息历史',
    userMessage: '用户消息',
    assistantMessage: 'AI 回复',
    systemMessage: '系统消息',
    errorMessage: '错误消息',
    retryMessage: '重试',
    copyMessage: '复制消息',
    deleteMessage: '删除消息',
    regenerateMessage: '重新生成',
    loading: '加载中...',
    messages: '条消息',
    deleteSession: '删除对话',
    noChats: '暂无聊天记录',
    noChatDesc: '开始新的对话来创建聊天记录',
    greeting: '你好，',
    greetingDesc: '我今天能帮你什么？',
    emptyMessage: '空消息',

    // 快速操作
    startChat: '开始对话',
    startChatDesc: '在下方输入框输入问题',
    textProcessing: '选择文本处理',
    textProcessingDesc: '在网页上选择文本，右键使用 AI',

    // 思考过程
    reasoning: '思考过程',
  },

  settings: {
    title: '设置',
    general: '通用',
    appearance: '外观',
    models: '模型',
    advanced: '高级',
    about: '关于',
    webChat: '网页聊天',
    webChatDescription: '配置网页内容提取和处理规则',
    
    modelSettings: '模型设置',
    addModel: '添加模型',
    editModel: '编辑模型',
    deleteModel: '删除模型',
    modelProvider: '服务提供商',
    modelName: '模型名称',
    apiKey: 'API 密钥',
    baseUrl: '基础 URL',
    customModel: '自定义模型',
    testConnection: '测试连接',
    connectionSuccessful: '连接成功',
    
    theme: '主题',
    themeDesc: '选择界面的颜色主题',
    themeLight: '浅色',
    themeLightDesc: '明亮清爽的界面',
    themeDark: '深色',
    themeDarkDesc: '护眼的深色界面',
    themeAuto: '跟随系统',
    themeAutoDesc: '自动适应系统主题',
    language: '语言',
    languageDesc: '选择界面显示语言',
    languageChinese: '中文',
    languageChineseDesc: '简体中文界面',
    languageEnglish: 'English',
    languageEnglishDesc: 'English interface',
    fontSize: '字体大小',
    fontSizeDesc: '调整聊天消息的字体大小',
    fontSizeSmall: '小',
    fontSizeMedium: '中',
    fontSizeLarge: '大',
    messageDensity: '消息密度',
    messageDensityDesc: '调整消息之间的间距',
    densityCompact: '紧凑',
    densityNormal: '正常',
    densityRelaxed: '宽松',

    shortcuts: '快捷键',
    shortcutsDesc: '查看常用操作的快捷键',
    newLine: '换行',
    
    preferences: '偏好设置',
    defaultModel: '默认模型',
    selectDefaultModel: '选择默认模型',
    autoSave: '自动保存',
    showTimestamp: '显示时间戳',
    enableNotifications: '启用通知',
    enableSounds: '启用声音',

    // 模型配置表单
    updateModel: '更新模型',
    provider: '服务商',
    model: '模型',
    enterModelName: '输入模型名称 (例如: gpt-4, claude-3-opus)',
    selectModel: '选择模型',
    enterCustomModelName: '输入自定义模型名称',
    apiKeyPlaceholder: '输入您的 API 密钥',
    apiKeyHelp: '您的 API 密钥将安全地存储在本地，不会被分享。',
    baseUrlOptional: '(可选)',
    baseUrlRequired: '*',
    baseUrlPlaceholder: '输入 API 基础 URL',
    baseUrlHelp: '留空将使用默认端点',
    baseUrlHelpCustom: '自定义 API 端点 URL',
    advancedSettings: '高级设置',
    maxTokens: '最大令牌数',
    maxTokensPlaceholder: '输入最大令牌数 (例如: 4096)',
    maxTokensHelp: '控制模型生成回复的最大长度',

    temperature: '温度值',
    temperatureFocused: '更专注 (0)',
    temperatureCreative: '更创意 (2)',

    // 服务提供商管理
    configureProviders: '配置 AI 服务提供商',
    configureProvidersDesc: '开始配置您的 AI 服务提供商，支持 OpenAI、Claude、Gemini 等多种服务。',
    getStarted: '开始配置',
    serviceProviders: '服务提供商',
    manageProvidersDesc: '管理您的 AI 服务提供商配置，支持内置和自定义服务商',
    filterProviders: '过滤服务商',
    customApiKey: '自定义 API 密钥',
    allProviders: '全部服务商',
    enabled: '已启用',
    builtinProviders: '内置服务商',
    customProviders: '自定义服务商',
    noEnabledProviders: '没有启用的服务提供商',
    noEnabledProvidersDesc: '请至少启用一个服务提供商并配置 API Key 才能使用 AI 功能。',

    // 服务提供商模态框
    addCustomProvider: '添加自定义服务商',
    editProvider: '编辑服务商',
    providerName: '服务商名称',
    enterProviderName: '输入服务商名称',
    enterApiKey: '输入 API Key',
    enterBaseUrl: '输入 API 端点 URL',
    testing: '测试中...',
    updateModelList: '更新模型列表',
    updating: '更新中...',
    modelsUpdated: '模型列表已更新',
    updateFailed: '更新失败',
    availableModels: '可用模型',
    noModelsFound: '未找到模型',

    // 验证消息
    pleaseEnterProviderName: '请输入服务提供商名称',
    pleaseEnterApiKey: '请输入 API Key',
    pleaseEnterBaseUrl: '请输入 API 端点 URL',
    pleaseFillApiKeyAndUrl: '请先填写 API Key 和端点 URL',

    // 服务提供商卡片
    disabled: '已禁用',
    default: '默认',
    builtin: '内置',
    custom: '自定义',
    modelsCount: '个模型',
    apiStatus: 'API状态',
    configured: '已配置',
    notConfigured: '未配置',
    endpoint: '端点',
    defaultEndpoint: '默认',
    customEndpoint: '自定义',
    settings: '设置',
    setAsDefault: '设为默认',
    delete: '删除',
    deleteConfirm: '确定要删除服务提供商 "{name}" 吗？',

    // 服务提供商模态框表单
    basicInfo: '基本信息',
    providerNameRequired: '服务商名称 *',
    providerNamePlaceholder: '例如: OpenAI',
    icon: '图标',
    iconPlaceholder: '例如: 🤖',
    apiConfiguration: 'API 配置',
    apiKeyRequired: 'API Key *',
    apiProxyUrl: 'API 代理 URL',
    optional: '(可选)',
    required: '*',
    leaveEmptyForDefault: '留空使用默认端点',
    checkConnection: '检查连接',
    modelList: '模型列表',
    updateList: '更新列表',
    add: '添加',
  },

  contextMenu: {
    summarize: '用 AI 总结',
    translate: '用 AI 翻译',
    explain: '用 AI 解释',
    analyze: '用 AI 分析',
    rewrite: '用 AI 重写',
  },

  errors: {
    networkError: '网络连接错误',
    apiError: 'API 调用失败',
    configError: '配置错误',
    unknownError: '未知错误',
    invalidApiKey: 'API 密钥无效',
    modelNotFound: '模型未找到',
    rateLimitExceeded: '请求频率超限',
    insufficientCredits: '余额不足',

    // 详细错误信息
    apiKeyExpired: 'API 密钥无效或已过期',
    checkApiKey: '请检查并更新您的 API 密钥',
    quotaExceeded: '您的 API 使用配额已达上限',
    upgradeApiPlan: '请稍后再试或升级您的 API 计划',
    serverBusy: '服务器繁忙',
    serverOverloaded: '当前服务器负载过高，请稍后再试',
    waitAndRetry: '建议等待几分钟后重新发送消息',
    connectionFailed: '无法连接到AI服务',
    checkConnection: '请检查网络连接或稍后重试',
    modelNotConfigured: '模型未配置',
    configureModel: '请先配置AI模型',
    clickSettings: '点击右侧工具栏的设置按钮进行配置',
    requestTimeout: '请求超时',
    timeoutDetails: '请求处理时间过长',
    simplifyQuestion: '请稍后重试，或尝试简化问题',
    requestFailed: '请求失败',
    retryLater: '请稍后重试',
    accessDenied: '访问被拒绝',
    permissionError: 'API密钥没有访问权限',
    checkPermissions: '请检查API密钥的权限设置',
    serverError: '服务器错误',
    providerError: 'AI服务提供商服务器出现问题',
    tryOtherModel: '请稍后重试，或尝试切换其他模型',
  },

  prompts: {
    deleteConfirm: '确定要删除吗？此操作无法撤销。',
    clearChatConfirm: '确定要清空当前对话吗？此操作无法撤销。',
    unsavedChanges: '有未保存的更改，确定要离开吗？',
    resetSettings: '确定要重置所有设置吗？',
    exportSuccess: '导出成功',
    importSuccess: '导入成功',
  },

  about: {
    version: '版本',
    description: '轻量级 AI 助手浏览器扩展，为您提供智能对话体验',
    features: '功能特性',
    developer: '开发者',
    contact: '联系方式',
    license: '开源协议',
    acknowledgments: '致谢',
    changelog: '更新日志',
    support: '技术支持'
  },

  pageContent: {
    title: '页面内容',
    disabled: '此域名的内容提取已禁用',
    enable: '启用内容提取',
    noContent: '暂无页面内容',

    settings: '设置',
    autoExtract: '自动提取',
    includeImages: '包含图片',
    includeLinks: '包含链接',
    maxTokens: '最大Token数',
    excludeSelectors: '排除选择器',
    includeSelectors: '包含选择器',
    domainSettings: '域名设置',
    enableForDomain: '为此域名启用',
    disableForDomain: '为此域名禁用',
    resetDomain: '重置域名设置',
    contentPreview: '内容预览',
    tokenCount: 'Token数量',
    wordCount: '字数',
    lastExtracted: '最后提取时间',

    contentTooLarge: '内容过大',
    contentEmpty: '内容为空',
    extractionError: '提取错误',
    unsupportedPage: '不支持的页面',
    processingPdf: '正在处理PDF文档...',
    pdfProgress: 'PDF处理进度',
    pdfComplete: 'PDF处理完成',
    pdfError: 'PDF处理错误',
    useContent: '使用此内容',

    tokenWarning: '内容较长，可能需要分块处理',
    tokenError: '内容过长，建议缩减或分块',
    extractionFailed: '内容提取失败',
    pdfProcessingFailed: 'PDF处理失败',
    smartSettings: '智能设置',
    applySmartSettings: '应用智能设置',
    exportSettings: '导出设置',
    importSettings: '导入设置',
  },

  pageChat: {
    title: '网页聊天',
    enable: '启用网页聊天模式',
    disable: '关闭网页聊天模式',
    enabled: '基于网页内容',
    disabled: '网页聊天模式已关闭',
    toggle: '切换网页聊天模式',
    description: '基于当前页面内容进行对话',
    noPageContent: '暂无页面内容',
    extractFirst: '先提取内容',
    usePageContent: '使用页面内容',
    pageContentUsed: '正在使用页面内容',
    clearPageContent: '清除页面内容',
    refreshPageContent: '刷新页面内容',

    autoMode: '自动模式',
    manualMode: '手动模式',
    smartMode: '智能模式',
    settings: '设置',
    help: '帮助',
    examples: '示例',
    tips: '提示',
    limitations: '限制',
    troubleshooting: '故障排除',
  },

  // 网页聊天配置
  webChatConfig: {
    title: '网页聊天配置',
    description: '配置网页内容提取和处理规则',
    mode: '提取模式',
    modeText: 'Text模式',
    modeReadability: 'Readability模式',
    modeTextDesc: '简单提取页面文本内容',
    modeReadabilityDesc: '智能提取文章主体内容',

    // 全局配置
    globalSettings: '全局配置',
    removeElements: '移除元素',
    removeElementsDesc: '指定要从页面中移除的元素（CSS选择器）',
    removeElementsPlaceholder: '例如: .ad, .sidebar, nav, footer',

    // Readability 配置
    readabilitySettings: 'Readability配置',
    charThreshold: '字符阈值',
    charThresholdDesc: '判断内容块是否为正文的最小字符数',
    maxElemsToDivide: '最大元素分割数',
    maxElemsToDivideDesc: '处理大型内容块时的最大分割数',
    keepClasses: '保留CSS类',
    keepClassesDesc: '保留元素的CSS类名',
    preserveLinks: '保留链接',
    preserveLinksDesc: '保留文本中的链接',

    // 元数据配置
    metadataSettings: '元信息配置',
    metadataEnabled: '已启用',
    metadataDisabled: '已禁用',
    metadataDescription: '提取页面元信息（作者、日期、标签等）',
    manageFields: '管理字段',
    fieldsManager: '元信息字段管理',
    fieldsCount: '个字段',
    enabledFields: '个已启用',
    templateSettings: '模板设置',
    outputTemplate: '输出模板',
    templateDescription: '使用 {key} 格式引用字段值',
    autoGenerate: '自动生成',

    // 域名规则
    domainRules: '域名特定规则',
    domainRulesEnabled: '已启用',
    domainRulesDisabled: '已禁用',
    domainRulesDescription: '为特定网站配置专门的提取规则，覆盖全局设置',
    addDomainRule: '添加域名规则',
    editDomainRule: '编辑域名规则',
    deleteDomainRule: '删除域名规则',
    noDomainRules: '暂无域名规则',
    noDomainRulesDesc: '点击"添加域名规则"按钮创建新规则',

    // 域名规则编辑器
    domainRuleEditor: '域名规则编辑器',
    addRule: '添加域名规则',
    editRule: '编辑域名规则',
    basicConfig: '基础配置',
    domain: '域名',
    domainPlaceholder: 'example.com',
    domainHelp: '输入域名，如：zhihu.com',
    ruleName: '规则名称',
    ruleNamePlaceholder: '规则显示名称',
    ruleNameHelp: '用于识别这个规则的友好名称',
    suggestFromCurrentPage: '从当前页面推荐',

    // 元数据字段管理
    metadataFieldsManager: '元信息字段管理',
    addField: '添加字段',
    editField: '编辑字段',
    deleteField: '删除字段',
    fieldKey: '字段键名',
    fieldName: '显示名称',
    fieldSelector: 'CSS选择器',
    fieldEnabled: '已启用',
    fieldDisabled: '已禁用',
    predefinedField: '预定义',
    customField: '自定义字段',
    addPredefinedField: '添加预定义字段',
    addCustomField: '添加自定义字段',
    selectPredefinedField: '选择预定义字段',
    fieldKeyRequired: '字段键名 *',
    fieldNameRequired: '显示名称 *',
    cssSelector: 'CSS选择器',
    cssSelectorPlaceholder: '例如: .author, .username',

    // 预定义字段
    authorField: '作者信息',
    dateField: '发布时间',
    tagsField: '标签分类',
    titleField: '文章标题',
    votesField: '点赞数',
    viewsField: '阅读量',
    sourceField: '内容来源',
    locationField: '地理位置',
    categoryField: '内容分类',
    commentCountField: '评论数',
    readingTimeField: '阅读时长',
    wordCountField: '字数统计',

    // 验证和错误
    validationErrors: '验证错误',
    domainRequired: '域名不能为空',
    nameRequired: '规则名称不能为空',
    invalidDomain: '无效的域名格式',
    duplicateDomain: '该域名已存在规则',
    fieldKeyExists: '字段键名已存在',
    invalidSelector: '无效的CSS选择器',

    // 操作按钮
    saveChanges: '保存更改',
    discardChanges: '放弃更改',
    resetToDefault: '重置为默认',
    exportConfig: '导出配置',
    importConfig: '导入配置',
    testConfig: '测试配置',
    previewExtraction: '预览提取结果',

    // 状态信息
    saving: '保存中...',
    saved: '已保存',
    saveFailed: '保存失败',
    loading: '加载中...',
    loadFailed: '加载失败',
    configUpdated: '配置已更新',
    configReset: '配置已重置',

    // 字段状态消息
    noEnabledFields: '暂无启用的字段',
    noEnabledFieldsDesc: '点击"管理字段"开始配置',
  },
};

// 英文翻译
const englishTranslations: Translations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    settings: 'Settings',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    clear: 'Clear',
    copy: 'Copy',
    paste: 'Paste',
    cut: 'Cut',
    select: 'Select',
    selectAll: 'Select All',
    none: 'None',
    all: 'All',
    yes: 'Yes',
    no: 'No',
    examples: 'Examples',
    actions: 'Actions',
    done: 'Done',
    or: 'Or',
    update: 'Update',
    confirmDelete: 'Are you sure you want to delete?',
  },

  chat: {
    title: 'AI Assistant',
    placeholder: 'Type your question...',
    send: 'Send',
    newChat: 'New Chat',
    clearChat: 'Clear Chat',
    exportChat: 'Export Chat',
    thinking: 'Thinking...',
    typing: 'Typing...',
    selectModel: 'Select Model',
    noModels: 'No Models Configured',
    modelNotConfigured: 'Please configure AI models first',
    sendMessage: 'Send Message',
    messageHistory: 'Message History',
    userMessage: 'User Message',
    assistantMessage: 'AI Response',
    systemMessage: 'System Message',
    errorMessage: 'Error Message',
    retryMessage: 'Retry',
    copyMessage: 'Copy Message',
    deleteMessage: 'Delete Message',
    regenerateMessage: 'Regenerate',
    greeting: 'Hello,',
    greetingDesc: 'How can I help you today?',
    emptyMessage: 'Empty message',
    loading: 'Loading...',

    messages: 'messages',
    deleteSession: 'Delete Session',
    noChats: 'No Chat History',
    noChatDesc: 'Start a new conversation to create chat history',

    // 快速操作
    startChat: 'Start Chat',
    startChatDesc: 'Type your question in the input box below',
    textProcessing: 'Text Processing',
    textProcessingDesc: 'Select text on webpage, right-click to use AI',

    // 思考过程
    reasoning: 'Reasoning',
  },

  settings: {
    title: 'Settings',
    general: 'General',
    appearance: 'Appearance',
    models: 'Models',
    advanced: 'Advanced',
    about: 'About',
    webChat: 'Web Chat',
    webChatDescription: 'Configure web content extraction and processing rules',
    
    modelSettings: 'Model Settings',
    addModel: 'Add Model',
    editModel: 'Edit Model',
    deleteModel: 'Delete Model',
    modelProvider: 'Provider',
    modelName: 'Model Name',
    apiKey: 'API Key',
    baseUrl: 'Base URL',
    customModel: 'Custom Model',
    testConnection: 'Test Connection',
    connectionSuccessful: 'Connection Successful',
    
    theme: 'Theme',
    themeDesc: 'Choose the interface color theme',
    themeLight: 'Light',
    themeLightDesc: 'Bright and clean interface',
    themeDark: 'Dark',
    themeDarkDesc: 'Eye-friendly dark interface',
    themeAuto: 'Auto',
    themeAutoDesc: 'Automatically adapt to system theme',
    language: 'Language',
    languageDesc: 'Choose interface display language',
    languageChinese: '中文',
    languageChineseDesc: 'Simplified Chinese interface',
    languageEnglish: 'English',
    languageEnglishDesc: 'English interface',
    fontSize: 'Font Size',
    fontSizeDesc: 'Adjust chat message font size',
    fontSizeSmall: 'Small',
    fontSizeMedium: 'Medium',
    fontSizeLarge: 'Large',
    messageDensity: 'Message Density',
    messageDensityDesc: 'Adjust spacing between messages',
    densityCompact: 'Compact',
    densityNormal: 'Normal',
    densityRelaxed: 'Relaxed',

    shortcuts: 'Shortcuts',
    shortcutsDesc: 'View shortcuts for common operations',
    newLine: 'New Line',
    
    preferences: 'Preferences',
    defaultModel: 'Default Model',
    selectDefaultModel: 'Select Default Model',
    autoSave: 'Auto Save',
    showTimestamp: 'Show Timestamp',
    enableNotifications: 'Enable Notifications',
    enableSounds: 'Enable Sounds',

    // 模型配置表单
    updateModel: 'Update Model',
    provider: 'Provider',
    model: 'Model',
    enterModelName: 'Enter model name (e.g., gpt-4, claude-3-opus)',
    selectModel: 'Select Model',
    enterCustomModelName: 'Enter custom model name',
    apiKeyPlaceholder: 'Enter your API key',
    apiKeyHelp: 'Your API key will be stored securely locally and not shared.',
    baseUrlOptional: '(Optional)',
    baseUrlRequired: '*',
    baseUrlPlaceholder: 'Enter API base URL',
    baseUrlHelp: 'Leave empty to use default endpoint',
    baseUrlHelpCustom: 'Custom API endpoint URL',
    advancedSettings: 'Advanced Settings',
    maxTokens: 'Max Tokens',
    maxTokensPlaceholder: 'Enter max tokens (e.g., 4096)',
    maxTokensHelp: 'Control the maximum length of model responses',

    temperature: 'Temperature',
    temperatureFocused: 'More Focused (0)',
    temperatureCreative: 'More Creative (2)',

    // 服务提供商管理
    configureProviders: 'Configure AI Service Providers',
    configureProvidersDesc: 'Start configuring your AI service providers, supporting OpenAI, Claude, Gemini and more.',
    getStarted: 'Get Started',
    serviceProviders: 'Service Providers',
    manageProvidersDesc: 'Manage your AI service provider configurations, supporting built-in and custom providers',
    filterProviders: 'Filter Providers',
    customApiKey: 'Custom API Key',
    allProviders: 'All Providers',
    enabled: 'Enabled',
    builtinProviders: 'Built-in Providers',
    customProviders: 'Custom Providers',
    noEnabledProviders: 'No Enabled Service Providers',
    noEnabledProvidersDesc: 'Please enable at least one service provider and configure API Key to use AI features.',

    // 服务提供商模态框
    addCustomProvider: 'Add Custom Provider',
    editProvider: 'Edit Provider',
    providerName: 'Provider Name',
    enterProviderName: 'Enter provider name',
    enterApiKey: 'Enter API Key',
    enterBaseUrl: 'Enter API endpoint URL',
    testing: 'Testing...',
    updateModelList: 'Update Model List',
    updating: 'Updating...',
    modelsUpdated: 'Model list updated',
    updateFailed: 'Update failed',
    availableModels: 'Available Models',
    noModelsFound: 'No models found',

    // 验证消息
    pleaseEnterProviderName: 'Please enter provider name',
    pleaseEnterApiKey: 'Please enter API Key',
    pleaseEnterBaseUrl: 'Please enter API endpoint URL',
    pleaseFillApiKeyAndUrl: 'Please fill in API Key and endpoint URL first',

    // 服务提供商卡片
    disabled: 'Disabled',
    default: 'Default',
    builtin: 'Built-in',
    custom: 'Custom',
    modelsCount: 'models',
    apiStatus: 'API Status',
    configured: 'Configured',
    notConfigured: 'Not Configured',
    endpoint: 'Endpoint',
    defaultEndpoint: 'Default',
    customEndpoint: 'Custom',
    settings: 'Settings',
    setAsDefault: 'Set as Default',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete service provider "{name}"?',

    // 服务提供商模态框表单
    basicInfo: 'Basic Information',
    providerNameRequired: 'Provider Name *',
    providerNamePlaceholder: 'e.g., OpenAI',
    icon: 'Icon',
    iconPlaceholder: 'e.g., 🤖',
    apiConfiguration: 'API Configuration',
    apiKeyRequired: 'API Key *',
    apiProxyUrl: 'API Proxy URL',
    optional: '(Optional)',
    required: '*',
    leaveEmptyForDefault: 'Leave empty to use default endpoint',
    checkConnection: 'Check Connection',
    modelList: 'Model List',
    updateList: 'Update List',
    add: 'Add',
  },

  contextMenu: {
    summarize: 'Summarize with AI',
    translate: 'Translate with AI',
    explain: 'Explain with AI',
    analyze: 'Analyze with AI',
    rewrite: 'Rewrite with AI',
  },

  errors: {
    networkError: 'Network connection error',
    apiError: 'API call failed',
    configError: 'Configuration error',
    unknownError: 'Unknown error',
    invalidApiKey: 'Invalid API key',
    modelNotFound: 'Model not found',
    rateLimitExceeded: 'Rate limit exceeded',
    insufficientCredits: 'Insufficient credits',

    // 详细错误信息
    apiKeyExpired: 'API key is invalid or expired',
    checkApiKey: 'Please check and update your API key',
    quotaExceeded: 'Your API usage quota has been reached',
    upgradeApiPlan: 'Please try again later or upgrade your API plan',
    serverBusy: 'Server busy',
    serverOverloaded: 'Server is currently overloaded, please try again later',
    waitAndRetry: 'Please wait a few minutes and try again',
    connectionFailed: 'Unable to connect to AI service',
    checkConnection: 'Please check your network connection or try again later',
    modelNotConfigured: 'Model not configured',
    configureModel: 'Please configure AI model first',
    clickSettings: 'Click the settings button in the toolbar to configure',
    requestTimeout: 'Request timeout',
    timeoutDetails: 'Request processing took too long',
    simplifyQuestion: 'Please try again later or simplify your question',
    requestFailed: 'Request failed',
    retryLater: 'Please try again later',
    accessDenied: 'Access denied',
    permissionError: 'API key does not have access permission',
    checkPermissions: 'Please check API key permissions',
    serverError: 'Server error',
    providerError: 'AI service provider server error',
    tryOtherModel: 'Please try again later or switch to another model',
  },

  prompts: {
    deleteConfirm: 'Are you sure you want to delete? This action cannot be undone.',
    clearChatConfirm: 'Are you sure you want to clear the current chat? This action cannot be undone.',
    unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
    resetSettings: 'Are you sure you want to reset all settings?',
    exportSuccess: 'Export successful',
    importSuccess: 'Import successful',
  },

  about: {
    version: 'Version',
    description: 'A lightweight AI assistant browser extension that provides intelligent conversation experience',
    features: 'Features',
    developer: 'Developer',
    contact: 'Contact',
    license: 'License',
    acknowledgments: 'Acknowledgments',
    changelog: 'Changelog',
    support: 'Support'
  },

  pageContent: {
    title: 'Page Content',
    disabled: 'Content extraction is disabled for this domain',
    enable: 'Enable Content Extraction',
    noContent: 'No page content available',

    settings: 'Settings',
    autoExtract: 'Auto Extract',
    includeImages: 'Include Images',
    includeLinks: 'Include Links',
    maxTokens: 'Max Tokens',
    excludeSelectors: 'Exclude Selectors',
    includeSelectors: 'Include Selectors',
    domainSettings: 'Domain Settings',
    enableForDomain: 'Enable for this domain',
    disableForDomain: 'Disable for this domain',
    resetDomain: 'Reset domain settings',
    contentPreview: 'Content Preview',
    tokenCount: 'Token Count',
    wordCount: 'Word Count',
    lastExtracted: 'Last Extracted',

    contentTooLarge: 'Content Too Large',
    contentEmpty: 'Content Empty',
    extractionError: 'Extraction Error',
    unsupportedPage: 'Unsupported Page',
    processingPdf: 'Processing PDF document...',
    pdfProgress: 'PDF Processing Progress',
    pdfComplete: 'PDF Processing Complete',
    pdfError: 'PDF Processing Error',
    useContent: 'Use This Content',

    tokenWarning: 'Content is long, may need chunking',
    tokenError: 'Content too long, consider reducing or chunking',
    extractionFailed: 'Content extraction failed',
    pdfProcessingFailed: 'PDF processing failed',
    smartSettings: 'Smart Settings',
    applySmartSettings: 'Apply Smart Settings',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
  },

  pageChat: {
    title: 'Page Chat',
    enable: 'Enable page chat mode',
    disable: 'Disable page chat mode',
    enabled: 'Based on page content',
    disabled: 'Page chat mode disabled',
    toggle: 'Toggle page chat mode',
    description: 'Chat based on current page content',
    noPageContent: 'No page content available',
    extractFirst: 'Extract content first',
    usePageContent: 'Use page content',
    pageContentUsed: 'Using page content',
    clearPageContent: 'Clear page content',
    refreshPageContent: 'Refresh page content',

    autoMode: 'Auto Mode',
    manualMode: 'Manual Mode',
    smartMode: 'Smart Mode',
    settings: 'Settings',
    help: 'Help',
    examples: 'Examples',
    tips: 'Tips',
    limitations: 'Limitations',
    troubleshooting: 'Troubleshooting',
  },

  // Web Chat Configuration
  webChatConfig: {
    title: 'Web Chat Configuration',
    description: 'Configure web content extraction and processing rules',
    mode: 'Extraction Mode',
    modeText: 'Text Mode',
    modeReadability: 'Readability Mode',
    modeTextDesc: 'Simple text content extraction',
    modeReadabilityDesc: 'Intelligent article content extraction',

    // Global Settings
    globalSettings: 'Global Settings',
    removeElements: 'Remove Elements',
    removeElementsDesc: 'Specify elements to remove from page (CSS selectors)',
    removeElementsPlaceholder: 'e.g., .ad, .sidebar, nav, footer',

    // Readability Settings
    readabilitySettings: 'Readability Settings',
    charThreshold: 'Character Threshold',
    charThresholdDesc: 'Minimum characters to consider content as main text',
    maxElemsToDivide: 'Max Elements to Divide',
    maxElemsToDivideDesc: 'Maximum divisions when processing large content blocks',
    keepClasses: 'Keep CSS Classes',
    keepClassesDesc: 'Preserve CSS class names on elements',
    preserveLinks: 'Preserve Links',
    preserveLinksDesc: 'Keep links in extracted text',

    // Metadata Settings
    metadataSettings: 'Metadata Settings',
    metadataEnabled: 'Enabled',
    metadataDisabled: 'Disabled',
    metadataDescription: 'Extract page metadata (author, date, tags, etc.)',
    manageFields: 'Manage Fields',
    fieldsManager: 'Metadata Fields Manager',
    fieldsCount: 'fields',
    enabledFields: 'enabled',
    templateSettings: 'Template Settings',
    outputTemplate: 'Output Template',
    templateDescription: 'Use {key} format to reference field values',
    autoGenerate: 'Auto Generate',

    // Domain Rules
    domainRules: 'Domain-Specific Rules',
    domainRulesEnabled: 'Enabled',
    domainRulesDisabled: 'Disabled',
    domainRulesDescription: 'Configure specific extraction rules for websites, overriding global settings',
    addDomainRule: 'Add Domain Rule',
    editDomainRule: 'Edit Domain Rule',
    deleteDomainRule: 'Delete Domain Rule',
    noDomainRules: 'No Domain Rules',
    noDomainRulesDesc: 'Click "Add Domain Rule" button to create new rules',

    // Domain Rule Editor
    domainRuleEditor: 'Domain Rule Editor',
    addRule: 'Add Domain Rule',
    editRule: 'Edit Domain Rule',
    basicConfig: 'Basic Configuration',
    domain: 'Domain',
    domainPlaceholder: 'example.com',
    domainHelp: 'Enter domain, e.g., zhihu.com',
    ruleName: 'Rule Name',
    ruleNamePlaceholder: 'Rule display name',
    ruleNameHelp: 'Friendly name to identify this rule',
    suggestFromCurrentPage: 'Suggest from Current Page',

    // Metadata Fields Manager
    metadataFieldsManager: 'Metadata Fields Manager',
    addField: 'Add Field',
    editField: 'Edit Field',
    deleteField: 'Delete Field',
    fieldKey: 'Field Key',
    fieldName: 'Display Name',
    fieldSelector: 'CSS Selector',
    fieldEnabled: 'Enabled',
    fieldDisabled: 'Disabled',
    predefinedField: 'Predefined',
    customField: 'Custom Field',
    addPredefinedField: 'Add Predefined Field',
    addCustomField: 'Add Custom Field',
    selectPredefinedField: 'Select Predefined Field',
    fieldKeyRequired: 'Field Key *',
    fieldNameRequired: 'Display Name *',
    cssSelector: 'CSS Selector',
    cssSelectorPlaceholder: 'e.g., .author, .username',

    // Predefined Fields
    authorField: 'Author Information',
    dateField: 'Publication Date',
    tagsField: 'Tags/Categories',
    titleField: 'Article Title',
    votesField: 'Vote Count',
    viewsField: 'View Count',
    sourceField: 'Content Source',
    locationField: 'Geographic Location',
    categoryField: 'Content Category',
    commentCountField: 'Comment Count',
    readingTimeField: 'Reading Time',
    wordCountField: 'Word Count',

    // Validation and Errors
    validationErrors: 'Validation Errors',
    domainRequired: 'Domain is required',
    nameRequired: 'Rule name is required',
    invalidDomain: 'Invalid domain format',
    duplicateDomain: 'Domain rule already exists',
    fieldKeyExists: 'Field key already exists',
    invalidSelector: 'Invalid CSS selector',

    // Action Buttons
    saveChanges: 'Save Changes',
    discardChanges: 'Discard Changes',
    resetToDefault: 'Reset to Default',
    exportConfig: 'Export Configuration',
    importConfig: 'Import Configuration',
    testConfig: 'Test Configuration',
    previewExtraction: 'Preview Extraction',

    // Status Information
    saving: 'Saving...',
    saved: 'Saved',
    saveFailed: 'Save Failed',
    loading: 'Loading...',
    loadFailed: 'Load Failed',
    configUpdated: 'Configuration Updated',
    configReset: 'Configuration Reset',

    // Field status messages
    noEnabledFields: 'No enabled fields',
    noEnabledFieldsDesc: 'Click "Manage Fields" to start configuration',
  },
};

# 模型设置页面国际化修复

## 问题描述

模型设置页面和API设置页面中有大量硬编码的中文文本，没有使用国际化系统，导致用户切换到英文时这些页面仍然显示中文。

## 涉及的组件

1. **ModelConfigForm.svelte** - 模型配置表单
2. **ServiceProviderManager.svelte** - 服务提供商管理器
3. **ServiceProviderModal.svelte** - 服务提供商模态框

## 修复内容

### 1. 扩展翻译文件 (`src/lib/i18n/index.ts`)

#### 新增翻译键类型定义
```typescript
// 模型配置表单
editModel: string;
addModel: string;
updateModel: string;
cancel: string;
close: string;
provider: string;
model: string;
customModel: string;
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
testConnection: string;
testing: string;
connectionSuccessful: string;
connectionFailed: string;
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
```

#### 中文翻译
```typescript
// 模型配置表单
editModel: '编辑模型',
addModel: '添加模型',
updateModel: '更新模型',
cancel: '取消',
close: '关闭',
provider: '服务商',
model: '模型',
customModel: '自定义模型',
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
maxTokensPlaceholder: '默认',
maxTokensHelp: '生成的最大令牌数量（留空使用默认值）',
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

// 验证消息
pleaseEnterProviderName: '请输入服务提供商名称',
pleaseEnterApiKey: '请输入 API Key',
pleaseEnterBaseUrl: '请输入 API 端点 URL',
pleaseFillApiKeyAndUrl: '请先填写 API Key 和端点 URL',
```

#### 英文翻译
```typescript
// 模型配置表单
editModel: 'Edit Model',
addModel: 'Add Model',
updateModel: 'Update Model',
cancel: 'Cancel',
close: 'Close',
provider: 'Provider',
model: 'Model',
customModel: 'Custom Model',
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
maxTokensPlaceholder: 'Default',
maxTokensHelp: 'Maximum number of tokens to generate (leave empty for default)',
temperature: 'Temperature',
temperatureFocused: 'More Focused (0)',
temperatureCreative: 'More Creative (2)',

// 验证消息
pleaseEnterProviderName: 'Please enter provider name',
pleaseEnterApiKey: 'Please enter API Key',
pleaseEnterBaseUrl: 'Please enter API endpoint URL',
pleaseFillApiKeyAndUrl: 'Please fill in API Key and endpoint URL first',
```

### 2. 修复 ModelConfigForm 组件

#### 导入国际化
```typescript
import { t } from '@/lib/i18n';
```

#### 替换硬编码文本
```typescript
// 修改前
{ id: 'custom', name: '自定义', icon: '⚙️' }

// 修改后
{ id: 'custom', name: $t('settings.customModel'), icon: '⚙️' }
```

```typescript
// 修改前
<h2>{modelId ? '编辑模型' : '添加模型'}</h2>

// 修改后
<h2>{modelId ? $t('settings.editModel') : $t('settings.addModel')}</h2>
```

### 3. 修复 ServiceProviderManager 组件

#### 导入国际化
```typescript
import { t } from '@/lib/i18n';
```

#### 替换过滤选项
```typescript
// 修改前
const filterOptions = [
  { id: 'all', name: '全部服务商', icon: '📋' },
  { id: 'enabled', name: '已启用', icon: '✅' },
  { id: 'builtin', name: '内置服务商', icon: '🏠' },
  { id: 'custom', name: '自定义服务商', icon: '⚙️' }
];

// 修改后
const filterOptions = [
  { id: 'all', name: $t('settings.allProviders'), icon: '📋' },
  { id: 'enabled', name: $t('settings.enabled'), icon: '✅' },
  { id: 'builtin', name: $t('settings.builtinProviders'), icon: '🏠' },
  { id: 'custom', name: $t('settings.customProviders'), icon: '⚙️' }
];
```

### 4. 修复 ServiceProviderModal 组件

#### 导入国际化
```typescript
import { t } from '@/lib/i18n';
```

#### 替换验证消息
```typescript
// 修改前
if (!formData.name?.trim()) {
  alert('请输入服务提供商名称');
  return false;
}

// 修改后
if (!formData.name?.trim()) {
  alert($t('settings.pleaseEnterProviderName'));
  return false;
}
```

## 修复效果

### 修复前
- ❌ 模型配置表单显示硬编码中文
- ❌ 服务提供商管理器显示中文标签
- ❌ 验证消息和提示都是中文
- ❌ 高级设置选项没有翻译

### 修复后
- ✅ 所有表单标签支持中英文切换
- ✅ 占位符文本正确翻译
- ✅ 帮助文本和提示信息国际化
- ✅ 按钮文本支持多语言
- ✅ 验证消息和错误提示翻译
- ✅ 状态提示（连接成功/失败）翻译

## 涉及的文件

- `src/lib/i18n/index.ts` - 扩展翻译键和翻译内容
- `src/panel/components/ModelConfigForm.svelte` - 模型配置表单国际化
- `src/panel/components/ServiceProviderManager.svelte` - 服务提供商管理器国际化
- `src/panel/components/ServiceProviderModal.svelte` - 服务提供商模态框国际化
- `model-settings-i18n-demo.html` - 修复效果演示页面

## 总结

通过这次修复，模型设置页面和API设置页面现在完全支持国际化：

1. **完整覆盖** - 所有用户可见的文本都支持翻译
2. **一致体验** - 与其他页面的国际化保持一致
3. **用户友好** - 验证消息和错误提示都有对应语言版本
4. **易于维护** - 所有文本都通过翻译键管理，便于后续添加新语言

现在用户可以享受完全本地化的模型配置和API设置体验，无论选择中文还是英文界面。

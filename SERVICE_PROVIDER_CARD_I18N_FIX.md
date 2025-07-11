# 服务提供商卡片国际化修复

## 问题描述

服务提供商卡片组件 (`ServiceProviderCard.svelte`) 和服务提供商模态框 (`ServiceProviderModal.svelte`) 中包含大量硬编码的中文文本，没有使用国际化系统，导致用户切换到英文时这些组件仍然显示中文。

## 涉及的组件

1. **ServiceProviderCard.svelte** - 服务提供商卡片
2. **ServiceProviderModal.svelte** - 服务提供商编辑模态框

## 修复内容

### 1. 扩展翻译文件 (`src/lib/i18n/index.ts`)

#### 新增服务提供商卡片翻译键
```typescript
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
```

#### 中文翻译
```typescript
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
updateList: 'Update list',
add: '添加',
```

#### 英文翻译
```typescript
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
```

### 2. 修复 ServiceProviderCard 组件

#### 导入国际化
```typescript
import { t } from '@/lib/i18n';
```

#### 替换状态标签
```typescript
// 修改前
{#if !provider.enabled}
  已禁用
{:else if provider.isDefault}
  默认
{:else if provider.isBuiltIn}
  内置
{:else}
  自定义
{/if}

// 修改后
{#if !provider.enabled}
  {$t('settings.disabled')}
{:else if provider.isDefault}
  {$t('settings.default')}
{:else if provider.isBuiltIn}
  {$t('settings.builtin')}
{:else}
  {$t('settings.custom')}
{/if}
```

#### 替换统计信息
```typescript
// 修改前
<span class="stat-label">API状态</span>
<span class="stat-value">{provider.apiKey ? '已配置' : '未配置'}</span>

// 修改后
<span class="stat-label">{$t('settings.apiStatus')}</span>
<span class="stat-value">{provider.apiKey ? $t('settings.configured') : $t('settings.notConfigured')}</span>
```

#### 替换操作按钮
```typescript
// 修改前
设置
设为默认
删除

// 修改后
{$t('settings.settings')}
{$t('settings.setAsDefault')}
{$t('settings.delete')}
```

#### 替换确认对话框
```typescript
// 修改前
if (confirm(`确定要删除服务提供商 "${provider.name}" 吗？`))

// 修改后
if (confirm($t('settings.deleteConfirm', { name: provider.name })))
```

### 3. 修复 ServiceProviderModal 组件

#### 导入国际化
```typescript
import { t } from '@/lib/i18n';
```

#### 替换表单标题
```typescript
// 修改前
<h3 class="section-title">基本信息</h3>
<h3 class="section-title">API 配置</h3>

// 修改后
<h3 class="section-title">{$t('settings.basicInfo')}</h3>
<h3 class="section-title">{$t('settings.apiConfiguration')}</h3>
```

#### 替换表单标签
```typescript
// 修改前
<label for="name" class="form-label">服务商名称 *</label>
<label for="apiKey" class="form-label">API Key *</label>

// 修改后
<label for="name" class="form-label">{$t('settings.providerNameRequired')}</label>
<label for="apiKey" class="form-label">{$t('settings.apiKeyRequired')}</label>
```

#### 替换占位符文本
```typescript
// 修改前
placeholder="例如: OpenAI"
placeholder="输入您的 API Key"

// 修改后
placeholder={$t('settings.providerNamePlaceholder')}
placeholder={$t('settings.enterApiKey')}
```

## 修复效果

### 修复前
- ❌ 服务提供商卡片显示硬编码中文
- ❌ 状态标签、统计信息都是中文
- ❌ 操作按钮和确认对话框是中文
- ❌ 模态框表单标签和占位符是中文

### 修复后
- ✅ 所有状态标签支持中英文切换
- ✅ 统计信息和操作按钮正确翻译
- ✅ 确认对话框支持参数化翻译
- ✅ 模态框表单完全国际化
- ✅ 占位符文本和帮助信息翻译

## 特殊功能

### 参数化翻译
删除确认对话框使用了参数化翻译，可以动态插入服务提供商名称：

```typescript
// 翻译键定义
deleteConfirm: '确定要删除服务提供商 "{name}" 吗？'
deleteConfirm: 'Are you sure you want to delete service provider "{name}"?'

// 使用方式
$t('settings.deleteConfirm', { name: provider.name })
```

### 条件翻译
根据服务提供商类型显示不同的翻译：

```typescript
// 状态标签
{#if !provider.enabled}
  {$t('settings.disabled')}
{:else if provider.isDefault}
  {$t('settings.default')}
{:else if provider.isBuiltIn}
  {$t('settings.builtin')}
{:else}
  {$t('settings.custom')}
{/if}

// 端点类型
{provider.baseUrl ? $t('settings.customEndpoint') : $t('settings.defaultEndpoint')}
```

## 涉及的文件

- `src/lib/i18n/index.ts` - 扩展翻译键和翻译内容
- `src/panel/components/ServiceProviderCard.svelte` - 服务提供商卡片国际化
- `src/panel/components/ServiceProviderModal.svelte` - 服务提供商模态框国际化
- `service-provider-card-i18n-demo.html` - 修复效果演示页面

## 总结

通过这次修复，服务提供商相关的所有组件现在完全支持国际化：

1. **完整覆盖** - 卡片、模态框、按钮、标签全部翻译
2. **动态内容** - 支持参数化翻译和条件翻译
3. **用户体验** - 状态提示、确认对话框都本地化
4. **一致性** - 与其他组件的国际化风格保持一致

现在用户可以享受完全本地化的服务提供商管理体验，无论选择中文还是英文界面，所有文本都能正确显示对应语言的内容。

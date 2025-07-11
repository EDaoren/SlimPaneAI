# 设置页面国际化修复

## 问题描述

用户反馈设置页面左侧的按钮栏国际化没有生效，即使设置为英文，导航按钮仍然显示中文。

## 问题分析

### 根本原因
1. **设置页面缺少国际化初始化** - `OptionsApp.svelte` 没有调用 `initializeLanguage` 函数
2. **侧边栏面板缺少国际化初始化** - `App.svelte` 没有初始化国际化系统
3. **语言切换不立即生效** - 用户切换语言后界面没有立即更新
4. **默认设置缺少语言字段** - 背景脚本和主题管理器的默认设置没有包含 `language` 字段
5. **初始化时机问题** - 使用 `getCurrentState()` 可能在设置加载完成前被调用

### 具体问题
- 设置页面导入了 `t` 翻译函数，但没有初始化语言设置
- 当用户偏好设置加载后，没有调用 `initializeLanguage` 来设置正确的语言
- 语言切换时没有调用 `setLanguage` 来立即更新界面
- 背景脚本的默认设置中缺少 `language: 'zh'` 字段
- 主题管理器的默认设置中缺少 `language: 'zh'` 字段
- 使用 `getCurrentState()` 的时机可能过早，导致获取不到正确的设置

## 修复方案

### 1. 修复设置页面国际化 (`src/options/OptionsApp.svelte`)

#### 导入国际化函数
```typescript
// 修改前
import { t } from '@/lib/i18n';

// 修改后
import { t, initializeLanguage, setLanguage } from '@/lib/i18n';
```

#### 在 onMount 中初始化语言
```typescript
onMount(async () => {
  await settingsStore.loadSettings();
  
  // 应用初始主题和语言
  const currentSettings = settingsStore.getCurrentState();
  if (currentSettings.userPreferences) {
    applyTheme(currentSettings.userPreferences);
    // ✅ 初始化国际化系统
    initializeLanguage(currentSettings.userPreferences);
  }
  
  // ... 其他初始化代码
});
```

#### 使用响应式语句初始化语言
```typescript
// 修改前 - 在 onMount 中手动初始化
onMount(async () => {
  await settingsStore.loadSettings();
  const currentSettings = settingsStore.getCurrentState();
  if (currentSettings.userPreferences) {
    initializeLanguage(currentSettings.userPreferences); // ❌ 可能过早
  }
});

// 修改后 - 使用响应式语句
$: if (userPreferences) {
  applyTheme(userPreferences);
  // ✅ 响应式初始化，确保设置加载完成后执行
  initializeLanguage(userPreferences);
}
```

#### 语言切换时立即更新界面
```typescript
async function handleLanguageChange(language: 'en' | 'zh') {
  const newPreferences = {
    ...userPreferences,
    language
  };
  await settingsStore.saveUserPreferences(newPreferences);
  // ✅ 立即切换界面语言
  setLanguage(language);
}
```

### 2. 修复侧边栏面板国际化 (`src/panel/App.svelte`)

#### 导入国际化函数
```typescript
// 添加导入
import { initializeLanguage } from '@/lib/i18n';
```

#### 在 onMount 中初始化语言
```typescript
onMount(async () => {
  console.log('🚀 SlimPaneAI Panel mounting...');

  // Load settings and chat history
  await settingsStore.loadSettings();
  await chatStore.loadChatHistory();

  // ✅ Initialize internationalization
  const currentSettings = settingsStore.getCurrentState();
  if (currentSettings.userPreferences) {
    initializeLanguage(currentSettings.userPreferences);
  }

  // ... 其他初始化代码
});
```

### 3. 修复默认设置中的语言字段

#### 背景脚本默认设置 (`src/background/service-worker.ts`)
```typescript
// 修改前 - 缺少 language 字段
userPreferences: {
  theme: 'auto',
  defaultModel: '',
  lastSelectedModel: '',
  fontSize: 'medium',
  messageDensity: 'normal',
  ...existingData.userPreferences,
}

// 修改后 - 添加 language 字段
userPreferences: {
  theme: 'auto',
  language: 'zh',  // ✅ 添加默认语言
  defaultModel: '',
  lastSelectedModel: '',
  fontSize: 'medium',
  messageDensity: 'normal',
  ...existingData.userPreferences,
}
```

#### 主题管理器默认设置 (`src/lib/theme-manager.ts`)
```typescript
// 修改前 - 缺少 language 字段
const defaultPreferences: UserPreferences = {
  theme: 'auto',
  defaultModel: '',
  lastSelectedModel: '',
  fontSize: 'medium',
  messageDensity: 'normal'
};

// 修改后 - 添加 language 字段
const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'zh',  // ✅ 添加默认语言
  defaultModel: '',
  lastSelectedModel: '',
  fontSize: 'medium',
  messageDensity: 'normal'
};
```

## 修复效果

### 修复前
- ❌ 设置页面导航按钮始终显示中文
- ❌ 即使用户选择英文，界面不会更新
- ❌ 侧边栏和设置页面语言不同步

### 修复后
- ✅ 设置页面根据用户偏好正确显示语言
- ✅ 语言切换立即生效，无需刷新页面
- ✅ 侧边栏和设置页面语言保持同步
- ✅ 完整的国际化体验

## 技术细节

### 国际化系统工作流程
1. **初始化阶段**：
   - 加载用户偏好设置
   - 调用 `initializeLanguage(preferences)` 设置语言
   - 界面根据语言显示对应文本

2. **语言切换阶段**：
   - 用户选择新语言
   - 保存到用户偏好设置
   - 调用 `setLanguage(language)` 立即更新界面

3. **响应式更新**：
   - 使用 Svelte 的响应式语法 `$t('key')`
   - 语言变化时自动重新渲染组件
   - 所有使用翻译的文本立即更新

### 翻译键映射
```typescript
// 导航按钮翻译
$: navigationItems = [
  {
    id: 'ai-models',
    title: $t('settings.models'),        // "AI 模型" / "Models"
    description: $t('settings.modelSettings')  // "模型设置" / "Model Settings"
  },
  {
    id: 'preferences',
    title: $t('settings.preferences'),   // "偏好设置" / "Preferences"
    description: $t('settings.general')      // "通用" / "General"
  },
  {
    id: 'appearance',
    title: $t('settings.appearance'),    // "外观" / "Appearance"
    description: $t('settings.theme')        // "主题" / "Theme"
  },
  {
    id: 'about',
    title: $t('settings.about'),         // "关于" / "About"
    description: $t('settings.about')        // "关于" / "About"
  }
];
```

## 验证方法

1. **打开设置页面**：
   - 检查左侧导航按钮是否显示正确语言
   - 默认应该显示中文

2. **切换语言**：
   - 在外观设置中选择英文
   - 导航按钮应该立即变为英文

3. **跨页面同步**：
   - 设置页面和侧边栏语言应该保持一致
   - 刷新页面后语言设置应该保持

## 相关文件

- `src/options/OptionsApp.svelte` - 设置页面主组件
- `src/panel/App.svelte` - 侧边栏面板主组件
- `src/lib/i18n/index.ts` - 国际化系统
- `settings-i18n-fix-demo.html` - 修复演示页面

## 总结

通过在设置页面和侧边栏面板中正确初始化国际化系统，现在用户可以享受完整的多语言体验。设置页面的左侧导航按钮能够正确响应语言设置，实现了真正的国际化支持。

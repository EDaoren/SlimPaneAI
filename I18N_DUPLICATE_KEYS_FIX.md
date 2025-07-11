# 国际化重复键修复

## 问题发现

在检查 `src/lib/i18n/index.ts` 文件时发现了多个重复的翻译键，这是导致国际化功能不生效的根本原因。

## 重复键列表

### 发现的重复键

1. **`editModel`** - 在第78行和第131行重复定义
2. **`addModel`** - 在第77行和第132行重复定义  
3. **`cancel`** - 在第12行（common）和第134行（settings）重复定义
4. **`close`** - 在第21行（common）和第135行（settings）重复定义
5. **`customModel`** - 在第84行和第138行重复定义
6. **`testConnection`** - 在第85行和第179行重复定义

### 问题影响

```javascript
// JavaScript 对象中的重复键问题
const translations = {
  settings: {
    editModel: '编辑模型',     // 第一次定义
    // ... 其他键 ...
    editModel: '编辑模型',     // 重复定义 - 会覆盖前面的值！
  }
};
```

由于JavaScript对象中重复的键会导致后面的值覆盖前面的值，这会造成：
- 翻译键解析不正确
- 某些组件无法获取到正确的翻译文本
- 语言切换功能不稳定
- 控制台出现翻译键未找到的警告

## 修复方案

### 1. 移除重复的翻译键定义

#### 类型定义修复 (`src/lib/i18n/index.ts`)

**修改前：**
```typescript
settings: {
  // 模型设置
  editModel: string;
  addModel: string;
  customModel: string;
  testConnection: string;
  
  // ... 其他键 ...
  
  // 模型配置表单 - 重复定义！
  editModel: string;      // ❌ 重复
  addModel: string;       // ❌ 重复
  cancel: string;         // ❌ 重复 (common中已有)
  close: string;          // ❌ 重复 (common中已有)
  customModel: string;    // ❌ 重复
  testConnection: string; // ❌ 重复
}
```

**修改后：**
```typescript
settings: {
  // 模型设置
  editModel: string;
  addModel: string;
  customModel: string;
  testConnection: string;
  
  // ... 其他键 ...
  
  // 模型配置表单 - 只保留独有的键
  updateModel: string;
  provider: string;
  model: string;
  // 移除重复的键定义
}
```

#### 中文翻译修复

**移除重复的键：**
```typescript
// 模型配置表单
// editModel: '编辑模型',     // ❌ 已删除重复定义
// addModel: '添加模型',      // ❌ 已删除重复定义
// cancel: '取消',           // ❌ 已删除重复定义
// close: '关闭',            // ❌ 已删除重复定义
// customModel: '自定义模型', // ❌ 已删除重复定义
// testConnection: '测试连接', // ❌ 已删除重复定义
updateModel: '更新模型',
provider: '服务商',
model: '模型',
```

#### 英文翻译修复

**移除重复的键：**
```typescript
// 模型配置表单
// editModel: 'Edit Model',     // ❌ 已删除重复定义
// addModel: 'Add Model',       // ❌ 已删除重复定义
// cancel: 'Cancel',           // ❌ 已删除重复定义
// close: 'Close',             // ❌ 已删除重复定义
// customModel: 'Custom Model', // ❌ 已删除重复定义
// testConnection: 'Test Connection', // ❌ 已删除重复定义
updateModel: 'Update Model',
provider: 'Provider',
model: 'Model',
```

### 2. 更新组件中的翻译键引用

#### ModelConfigForm.svelte 修复

```typescript
// 修改前
title={$t('settings.close')}

// 修改后
title={$t('common.close')}
```

```typescript
// 修改前
{$t('settings.cancel')}

// 修改后
{$t('common.cancel')}
```

#### ServiceProviderModal.svelte 修复

保持现有的翻译键引用，因为相关键没有重复问题。

### 3. 验证修复效果

#### 修复前的问题
- ❌ 某些按钮显示翻译键而不是文本
- ❌ 语言切换时部分文本不更新
- ❌ 控制台出现翻译键未找到的警告
- ❌ 国际化功能不稳定

#### 修复后的效果
- ✅ 所有翻译键都能正确解析
- ✅ 语言切换立即生效
- ✅ 没有翻译键冲突
- ✅ 国际化功能稳定可靠

## 技术细节

### JavaScript 对象重复键问题

```javascript
// 问题示例
const obj = {
  key: 'value1',
  key: 'value2'  // 会覆盖前面的值
};
console.log(obj.key); // 输出: 'value2'
```

### 翻译键命名空间设计

```typescript
// 正确的命名空间设计
interface Translations {
  common: {
    cancel: string;    // 通用的取消按钮
    close: string;     // 通用的关闭按钮
  };
  settings: {
    editModel: string; // 设置特有的编辑模型
    addModel: string;  // 设置特有的添加模型
  };
}
```

### 组件中的正确引用

```typescript
// 使用通用键
$t('common.cancel')
$t('common.close')

// 使用设置特有键
$t('settings.editModel')
$t('settings.addModel')
```

## 相关文件

- `src/lib/i18n/index.ts` - 翻译文件主体
- `src/panel/components/ModelConfigForm.svelte` - 模型配置表单
- `src/panel/components/ServiceProviderModal.svelte` - 服务提供商模态框
- `i18n-duplicate-keys-fix-demo.html` - 修复演示页面

## 预防措施

1. **代码审查** - 在添加新翻译键时检查是否已存在
2. **自动化检测** - 可以添加脚本检测重复键
3. **命名规范** - 使用清晰的命名空间避免冲突
4. **测试验证** - 在不同语言下测试所有功能

## 总结

通过移除重复的翻译键并更新组件引用，解决了国际化功能不生效的根本问题。现在所有的设置页面、模型配置表单、服务提供商管理等功能都能正确响应语言切换，为用户提供一致的多语言体验。

这个修复不仅解决了当前的问题，还为未来的国际化扩展奠定了良好的基础。

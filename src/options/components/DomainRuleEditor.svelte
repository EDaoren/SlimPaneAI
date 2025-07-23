<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { WebContentDomainManager } from '@/lib/web-content-config';
  import MetadataConfigSection from './MetadataConfigSection.svelte';
  import type {
    WebChatDomainRule,
    WebChatExtractionMode,
    WebChatMetadataField,
    DomainRuleOperationResult
  } from '@/types/web-content-config';

  // Props
  export let mode: WebChatExtractionMode = 'readability';
  export let editingRule: WebChatDomainRule | null = null;
  export let editingDomain: string = '';
  export let isEditing: boolean = false;

  // 事件派发器
  const dispatch = createEventDispatcher<{
    save: { domain: string; rule: WebChatDomainRule };
    cancel: void;
  }>();

  // 表单数据
  let formData = {
    domain: editingDomain,
    name: '',
    remove: '',
    metadataEnabled: false,
    metadataFields: [] as WebChatMetadataField[],
    metadataTemplate: '',
    charThreshold: 50,
    maxElemsToDivide: 5
  };

  // 状态管理
  let isSaving = false;
  let validationErrors: string[] = [];

  // 初始化表单数据
  $: {
    if (editingRule && isEditing) {
      formData.domain = editingDomain;
      formData.name = editingRule.name;
      formData.remove = editingRule.remove.join('\n');
      
      if (mode === 'readability' && editingRule.metadata) {
        formData.metadataEnabled = editingRule.metadata.enabled;
        formData.metadataFields = Array.isArray(editingRule.metadata.selectors)
          ? editingRule.metadata.selectors
          : [];
        formData.metadataTemplate = editingRule.metadata.format?.template || '';
      }

      if (editingRule.readabilityOptions) {
        formData.charThreshold = editingRule.readabilityOptions.charThreshold || 50;
        formData.maxElemsToDivide = editingRule.readabilityOptions.maxElemsToDivide || 5;
      }
    } else {
      // 新建模式的默认值
      formData.domain = editingDomain;
      formData.name = '';
      formData.remove = '';
      formData.metadataEnabled = mode === 'readability';
      formData.metadataFields = generateDefaultMetadataFields();
      formData.metadataTemplate = generateDefaultTemplate(formData.metadataFields);
    }
  }

  // 生成默认元信息字段
  function generateDefaultMetadataFields(): WebChatMetadataField[] {
    return [
      {
        key: 'author',
        name: '作者信息',
        selector: '.author, .username, .nick-name',
        enabled: true,
        isPredefined: true
      },
      {
        key: 'date',
        name: '发布时间',
        selector: '.date, .time, .publish-time',
        enabled: true,
        isPredefined: true
      },
      {
        key: 'tags',
        name: '标签分类',
        selector: '.tags, .tag, .category',
        enabled: true,
        isPredefined: true
      }
    ];
  }

  // 生成默认模板
  function generateDefaultTemplate(fields: WebChatMetadataField[]): string {
    const enabledFields = fields.filter(f => f.enabled);
    if (enabledFields.length === 0) return '';
    
    return enabledFields.map(field => `${field.name}: {${field.key}}`).join('\n');
  }

  // 表单验证
  function validateForm(): boolean {
    validationErrors = [];

    // 验证域名
    if (!formData.domain.trim()) {
      validationErrors.push('域名不能为空');
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain.trim())) {
      validationErrors.push('域名格式无效');
    }

    // 验证名称
    if (!formData.name.trim()) {
      validationErrors.push('规则名称不能为空');
    }

    // 验证移除选择器
    const removeSelectors = formData.remove.split('\n').map(s => s.trim()).filter(s => s);
    if (removeSelectors.length === 0) {
      validationErrors.push('至少需要一个移除选择器');
    }

    // 验证CSS选择器语法（简单验证）
    removeSelectors.forEach((selector, index) => {
      if (selector && !isValidSelector(selector)) {
        validationErrors.push(`移除选择器 ${index + 1} 语法可能无效: ${selector}`);
      }
    });

    return validationErrors.length === 0;
  }

  // 简单的CSS选择器验证
  function isValidSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  // 保存规则
  async function saveRule() {
    if (!validateForm()) return;

    isSaving = true;
    try {
      const rule: WebChatDomainRule = {
        name: formData.name.trim(),
        remove: formData.remove.split('\n').map(s => s.trim()).filter(s => s)
      };

      // 添加元信息配置（仅Readability模式）
      if (mode === 'readability' && formData.metadataEnabled) {
        rule.metadata = {
          enabled: true,
          selectors: formData.metadataFields,
          format: {
            template: formData.metadataTemplate,
            separator: '\n',
            includeEmpty: false
          }
        };
      }

      // 添加Readability参数覆盖
      if (mode === 'readability') {
        rule.readabilityOptions = {
          charThreshold: formData.charThreshold,
          maxElemsToDivide: formData.maxElemsToDivide
        };
      }

      let result: DomainRuleOperationResult;
      if (isEditing) {
        result = await WebContentDomainManager.updateDomainRule(formData.domain, rule);
      } else {
        result = await WebContentDomainManager.addDomainRule(formData.domain, rule);
      }

      if (result.success) {
        dispatch('save', { domain: formData.domain, rule });
      } else {
        validationErrors = [result.error || '保存失败'];
      }
    } catch (error) {
      console.error('Failed to save domain rule:', error);
      validationErrors = ['保存失败，请重试'];
    } finally {
      isSaving = false;
    }
  }

  // 取消编辑
  function cancel() {
    dispatch('cancel');
  }

  // 处理元信息字段变更
  function handleMetadataFieldsChange(event: CustomEvent<WebChatMetadataField[]>) {
    const fields = event.detail;
    formData.metadataFields = fields;
    // 不在这里更新模板，让 MetadataConfigSection 组件自己处理模板更新
    console.log('🔄 域名规则: 字段变更，字段数量:', fields.length, '启用数量:', fields.filter(f => f.enabled).length);
  }

  // 从当前页面推荐规则
  function suggestFromCurrentPage() {
    try {
      const suggestion = WebContentDomainManager.suggestDomainRuleFromCurrentPage();
      if (suggestion) {
        formData.domain = suggestion.domain;
        if (suggestion.suggestedRule.remove) {
          formData.remove = suggestion.suggestedRule.remove.join('\n');
        }
        if (suggestion.suggestedRule.name) {
          formData.name = suggestion.suggestedRule.name;
        }
      }
    } catch (error) {
      console.error('Failed to suggest rule:', error);
    }
  }
</script>

<div class="domain-rule-editor">
  <div class="editor-header">
    <h3>{isEditing ? '编辑域名规则' : '添加域名规则'}</h3>
    <div class="mode-indicator">
      <span class="mode-badge mode-{mode}">
        {mode === 'text' ? 'Text模式' : 'Readability模式'}
      </span>
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="validation-errors">
      {#each validationErrors as error}
        <div class="error-item">⚠️ {error}</div>
      {/each}
    </div>
  {/if}

  <form on:submit|preventDefault={saveRule}>
    <!-- 基础配置 -->
    <div class="form-section">
      <h4 class="section-title">🌐 基础配置</h4>
      
      <div class="form-group">
        <label class="form-label">域名</label>
        <div class="domain-input-group">
          <input
            type="text"
            bind:value={formData.domain}
            placeholder="example.com"
            class="form-input"
            disabled={isEditing}
            required
          />
          {#if !isEditing}
            <button type="button" class="btn-suggest" on:click={suggestFromCurrentPage}>
              从当前页面推荐
            </button>
          {/if}
        </div>
        <div class="form-help">输入域名，如：zhihu.com</div>
      </div>

      <div class="form-group">
        <label class="form-label">规则名称</label>
        <input
          type="text"
          bind:value={formData.name}
          placeholder="规则显示名称"
          class="form-input"
          required
        />
        <div class="form-help">用于识别这个规则的友好名称</div>
      </div>

      <div class="form-group">
        <label class="form-label">移除元素（CSS选择器）</label>
        <textarea
          bind:value={formData.remove}
          placeholder=".ad, .sidebar, nav, footer"
          class="form-textarea"
          rows="4"
          required
        ></textarea>
        <div class="form-help">每行一个CSS选择器，用于移除不需要的页面元素</div>
      </div>
    </div>

    <!-- Readability模式的额外配置 -->
    {#if mode === 'readability'}
      <!-- 元信息配置 -->
      <div class="form-section">
        <MetadataConfigSection
          bind:enabled={formData.metadataEnabled}
          bind:fields={formData.metadataFields}
          bind:template={formData.metadataTemplate}
          title="🏷️ 元信息配置"
          description="为此域名配置专门的元信息提取规则"
          compact={true}
          on:fieldsChange={handleMetadataFieldsChange}
        />
      </div>

      <!-- Readability参数 -->
      <div class="form-section">
        <h4 class="section-title">🔧 Readability参数</h4>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">字符阈值</label>
            <input
              type="number"
              bind:value={formData.charThreshold}
              min="0"
              max="1000"
              class="form-input"
            />
            <div class="form-help">小于此长度的段落将被移除</div>
          </div>

          <div class="form-group">
            <label class="form-label">最大元素分割数</label>
            <input
              type="number"
              bind:value={formData.maxElemsToDivide}
              min="1"
              max="20"
              class="form-input"
            />
            <div class="form-help">控制内容分析深度</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- 操作按钮 -->
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" on:click={cancel}>
        取消
      </button>
      <button type="submit" class="btn btn-primary" disabled={isSaving}>
        {#if isSaving}
          <div class="btn-spinner"></div>
        {/if}
        {isEditing ? '更新规则' : '添加规则'}
      </button>
    </div>
  </form>
</div>



<style>
  .domain-rule-editor {
    width: 100%;
    max-width: 800px;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .editor-header h3 {
    margin: 0;
    color: var(--text-primary);
  }

  .mode-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .mode-text {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .mode-readability {
    background: #f0f9ff;
    color: #0c4a6e;
    border: 1px solid #0ea5e9;
  }

  .validation-errors {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .error-item {
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .error-item:last-child {
    margin-bottom: 0;
  }

  .form-section {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.375rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
    font-family: monospace;
  }

  .template-textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    line-height: 1.5;
  }

  .form-help {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .domain-input-group {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .btn-suggest {
    padding: 0.625rem 1rem;
    background: #f3f4f6;
    border: 1px solid var(--border-primary);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .btn-suggest:hover {
    background: #e5e7eb;
    color: var(--text-primary);
  }

  .metadata-config {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--border-secondary);
  }

  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .toggle-slider {
    position: relative;
    width: 3rem;
    height: 1.5rem;
    background: #d1d5db;
    border-radius: 0.75rem;
    transition: background-color 0.2s;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  input[type="checkbox"]:checked + .toggle-slider {
    background: #3b82f6;
  }

  input[type="checkbox"]:checked + .toggle-slider::before {
    transform: translateX(1.5rem);
  }

  input[type="checkbox"] {
    display: none;
  }

  .toggle-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid var(--border-primary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background: var(--bg-secondary);
  }

  .btn-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* 模态框样式 */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-primary);
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .large-modal {
    width: 800px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-primary);
  }

  .modal-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-primary);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .domain-input-group {
      flex-direction: column;
    }

    .editor-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>

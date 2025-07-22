<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import MetadataFieldsManagerModal from './MetadataFieldsManagerModal.svelte';
  import type { WebChatMetadataField } from '@/types/web-content-config';

  // Props
  export let enabled: boolean = false;
  export let fields: WebChatMetadataField[] = [];
  export let template: string = '';
  export let title: string = '🏷️ 元信息提取配置';
  export let description: string = '提取作者、时间、标签等结构化信息，增强GPT理解';
  export let showToggle: boolean = true;
  export let compact: boolean = false;

  // 事件派发器
  const dispatch = createEventDispatcher<{
    enabledChange: boolean;
    fieldsChange: WebChatMetadataField[];
    templateChange: string;
  }>();

  // 内部状态
  let showFieldManager = false;

  // 响应式更新
  $: dispatch('enabledChange', enabled);
  $: dispatch('fieldsChange', fields);
  $: dispatch('templateChange', template);

  // 打开字段管理器
  function openFieldManager() {
    showFieldManager = true;
  }

  // 处理字段变更
  function handleFieldsChange(newFields: WebChatMetadataField[]) {
    fields = newFields;
    dispatch('fieldsChange', fields);
  }

  // 自动生成模板
  function autoGenerateTemplate() {
    const enabledFields = fields.filter(f => f.enabled);
    if (enabledFields.length === 0) {
      template = '';
      return;
    }
    
    template = enabledFields.map(field => `${field.name}: {${field.key}}`).join('\n');
  }

  // 切换启用状态
  function toggleEnabled() {
    enabled = !enabled;
  }
</script>

<div class="metadata-config-section" class:compact>
  <!-- 标题和开关 -->
  {#if showToggle}
    <div class="feature-toggle-header">
      <div class="feature-info">
        <h4 class="subsection-title">{title}</h4>
        <div class="feature-description">{description}</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" bind:checked={enabled} />
        <span class="toggle-slider"></span>
        <span class="toggle-label">{enabled ? '已启用' : '已禁用'}</span>
      </label>
    </div>
  {:else}
    <div class="section-header-simple">
      <h4 class="subsection-title">{title}</h4>
      <div class="feature-description">{description}</div>
    </div>
  {/if}

  {#if enabled || !showToggle}
    <div class="metadata-config">
      <!-- 字段概览卡片 -->
      <div class="fields-overview-card">
        <div class="overview-header">
          <div class="overview-title">
            <h4>📋 字段配置</h4>
            <div class="overview-badges">
              <span class="badge badge-total">{fields.length} 个字段</span>
              <span class="badge badge-enabled">{fields.filter(f => f.enabled).length} 个启用</span>
            </div>
          </div>
          <button type="button" class="btn-manage" on:click={openFieldManager}>
            <span class="btn-icon">⚙️</span>
            <span>管理字段</span>
          </button>
        </div>

        {#if fields.filter(field => field.enabled).length > 0}
          <div class="enabled-fields-preview">
            <div class="preview-label">已启用字段:</div>
            <div class="fields-tags">
              {#each fields.filter(field => field.enabled) as field}
                <span class="field-tag">
                  <span class="tag-icon">🏷️</span>
                  {field.name}
                </span>
              {/each}
            </div>
          </div>
        {:else}
          <div class="no-fields-message">
            <span class="message-icon">⚠️</span>
            <span>暂无启用的字段，点击"管理字段"开始配置</span>
          </div>
        {/if}
      </div>

      <!-- 模板配置区域 -->
      <div class="template-config-section">
        <div class="section-header">
          <h4>📝 输出模板</h4>
          <button type="button" class="btn-auto-generate" on:click={autoGenerateTemplate}>
            <span class="btn-icon">🔄</span>
            <span>自动生成</span>
          </button>
        </div>

        <div class="template-editor">
          <textarea
            bind:value={template}
            placeholder="作者: &#123;author&#125;&#10;发布时间: &#123;date&#125;&#10;标签: &#123;tags&#125;"
            class="template-textarea"
            rows={compact ? "3" : "5"}
          ></textarea>
          <div class="template-help">
            <div class="help-item">
              <span class="help-icon">💡</span>
              <span>使用 <code>&#123;字段键名&#125;</code> 作为占位符</span>
            </div>
            <div class="help-item">
              <span class="help-icon">📋</span>
              <span>支持多行格式，每行一个字段</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- 字段管理器模态框 -->
<MetadataFieldsManagerModal
  bind:fields={fields}
  bind:isOpen={showFieldManager}
  on:fieldsChange={(e) => handleFieldsChange(e.detail)}
  on:close={() => showFieldManager = false}
/>

<style>
  .metadata-config-section {
    width: 100%;
  }

  .metadata-config-section.compact {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--border-secondary);
  }

  .feature-toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .section-header-simple {
    margin-bottom: 1.5rem;
  }

  .feature-info {
    flex: 1;
  }

  .subsection-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  .feature-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    flex-shrink: 0;
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
    white-space: nowrap;
  }

  .metadata-config {
    margin-top: 1rem;
  }

  .fields-overview-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .overview-title h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }

  .overview-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-total {
    background: #f3f4f6;
    color: #374151;
  }

  .badge-enabled {
    background: #dcfce7;
    color: #166534;
  }

  .btn-manage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .btn-manage:hover {
    background: #4f46e5;
  }

  .btn-icon {
    font-size: 1rem;
  }

  .enabled-fields-preview {
    margin-top: 1rem;
  }

  .preview-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .fields-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .field-tag {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    background: #fef3c7;
    color: #92400e;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .tag-icon {
    font-size: 0.875rem;
  }

  .no-fields-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 1rem;
  }

  .message-icon {
    font-size: 1rem;
  }

  .template-config-section {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .btn-auto-generate {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-auto-generate:hover {
    background: #059669;
  }

  .template-editor {
    margin-top: 1rem;
  }

  .template-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .template-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .template-help {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .help-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .help-icon {
    font-size: 0.875rem;
  }

  .help-item code {
    background: var(--bg-tertiary);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.75rem;
  }

  @media (max-width: 768px) {
    .feature-toggle-header,
    .overview-header,
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .overview-badges {
      margin-top: 0.5rem;
    }

    .fields-tags {
      margin-top: 0.5rem;
    }

    .btn-manage,
    .btn-auto-generate {
      align-self: flex-start;
    }
  }
</style>

<script lang="ts">
  import type { WebChatMetadataField } from '@/types/web-content-config';
  import { PREDEFINED_METADATA_FIELDS } from '@/types/web-content-config';

  export let fields: WebChatMetadataField[] = [];
  export let onFieldsChange: (fields: WebChatMetadataField[]) => void;

  // 添加预定义字段
  function addPredefinedField(fieldTemplate: typeof PREDEFINED_METADATA_FIELDS[0]) {
    const newField: WebChatMetadataField = {
      ...fieldTemplate,
      selector: '',
      enabled: true
    };
    
    fields = [...fields, newField];
    onFieldsChange(fields);
  }

  // 添加自定义字段
  function addCustomField() {
    const key = prompt('请输入字段键名（英文）:');
    const name = prompt('请输入字段显示名称:');
    
    if (!key || !name) return;
    
    // 检查键名是否已存在
    if (fields.some(f => f.key === key)) {
      alert('字段键名已存在！');
      return;
    }

    const newField: WebChatMetadataField = {
      key,
      name,
      selector: '',
      enabled: true,
      isPredefined: false
    };
    
    fields = [...fields, newField];
    onFieldsChange(fields);
  }

  // 删除字段
  function removeField(index: number) {
    if (confirm('确定要删除这个字段吗？')) {
      fields = fields.filter((_, i) => i !== index);
      onFieldsChange(fields);
    }
  }

  // 更新字段
  function updateField(index: number, updates: Partial<WebChatMetadataField>) {
    fields = fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
    onFieldsChange(fields);
  }

  // 获取未添加的预定义字段
  $: availablePredefinedFields = PREDEFINED_METADATA_FIELDS.filter(
    template => !fields.some(field => field.key === template.key)
  );
</script>

<div class="metadata-fields-manager">
  <div class="fields-header">
    <h4>元信息字段配置</h4>
    <div class="add-buttons">
      {#if availablePredefinedFields.length > 0}
        <div class="dropdown">
          <button type="button" class="btn-add-predefined">+ 添加预定义字段</button>
          <div class="dropdown-content">
            {#each availablePredefinedFields as fieldTemplate}
              <button 
                type="button" 
                class="dropdown-item"
                on:click={() => addPredefinedField(fieldTemplate)}
              >
                {fieldTemplate.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      <button type="button" class="btn-add-custom" on:click={addCustomField}>+ 自定义字段</button>
    </div>
  </div>

  <div class="fields-list">
    {#each fields as field, index}
      <div class="field-item" class:disabled={!field.enabled}>
        <div class="field-header">
          <label class="field-toggle">
            <input 
              type="checkbox" 
              bind:checked={field.enabled}
              on:change={() => updateField(index, { enabled: field.enabled })}
            />
            <span class="field-name">{field.name}</span>
            <span class="field-key">({field.key})</span>
          </label>
          
          {#if !field.isPredefined}
            <button 
              type="button" 
              class="btn-remove"
              on:click={() => removeField(index)}
              title="删除自定义字段"
            >
              ×
            </button>
          {/if}
        </div>
        
        {#if field.enabled}
          <div class="field-config">
            <label class="selector-label">
              CSS选择器:
              <input 
                type="text" 
                bind:value={field.selector}
                on:input={() => updateField(index, { selector: field.selector })}
                placeholder="例如: .author, .username"
                class="selector-input"
              />
            </label>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if fields.length === 0}
      <div class="empty-state">
        <p>还没有配置任何元信息字段</p>
        <p>点击上方按钮添加字段</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .metadata-fields-manager {
    border: 1px solid var(--border-secondary);
    border-radius: 0.5rem;
    padding: 1rem;
    background: var(--bg-secondary);
  }

  .fields-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .fields-header h4 {
    margin: 0;
    color: var(--text-primary);
  }

  .add-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add-predefined,
  .btn-add-custom {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--primary-color);
    border-radius: 0.25rem;
    background: var(--primary-color);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-predefined:hover,
  .btn-add-custom:hover {
    background: var(--primary-color-dark);
  }

  .dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-content {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 150px;
  }

  .dropdown:hover .dropdown-content {
    display: block;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.5rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .dropdown-item:hover {
    background: var(--bg-secondary);
  }

  .fields-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .field-item {
    border: 1px solid var(--border-secondary);
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: var(--bg-primary);
    transition: opacity 0.2s;
  }

  .field-item.disabled {
    opacity: 0.6;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .field-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .field-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .field-key {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .btn-remove {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-remove:hover {
    background: #dc2626;
  }

  .field-config {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-secondary);
  }

  .selector-label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .selector-input {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    font-size: 0.875rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0.25rem 0;
  }
</style>

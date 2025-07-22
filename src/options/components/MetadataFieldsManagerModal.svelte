<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WebChatMetadataField } from '@/types/web-content-config';

  // Props
  export let fields: WebChatMetadataField[] = [];
  export let isOpen: boolean = false;

  // 事件派发器
  const dispatch = createEventDispatcher<{
    close: void;
    fieldsChange: WebChatMetadataField[];
  }>();

  // 内部状态
  let showAddFieldModal = false;
  let editingFieldIndex = -1;
  let newFieldKey = '';
  let newFieldName = '';
  let newFieldSelector = '';
  let selectedPredefinedField = '';

  // 预定义字段选项
  $: availablePredefinedFields = [
    { key: 'author', name: '作者信息', selector: '.author, .username, .nick-name' },
    { key: 'date', name: '发布时间', selector: '.date, .time, .publish-time' },
    { key: 'tags', name: '标签分类', selector: '.tags, .tag, .category' },
    { key: 'title', name: '文章标题', selector: 'h1, .title, .article-title' },
    { key: 'votes', name: '点赞数', selector: '.votes, .like, .thumbs-up' },
    { key: 'views', name: '阅读量', selector: '.views, .read-count, .page-view' },
    { key: 'source', name: '内容来源', selector: '.source, .from, .origin' },
    { key: 'location', name: '地理位置', selector: '.location, .place, .address' },
    { key: 'category', name: '内容分类', selector: '.category, .section, .topic' },
    { key: 'comment_count', name: '评论数', selector: '.comment, .reply, .discuss' },
    { key: 'reading_time', name: '阅读时长', selector: '.reading-time, .read-time' },
    { key: 'word_count', name: '字数统计', selector: '.word-count, .length' }
  ].filter(predefined => !fields.some(existing => existing.key === predefined.key));

  // 关闭主模态框
  function closeModal() {
    dispatch('close');
  }

  // 打开添加字段模态框
  function openAddFieldModal() {
    showAddFieldModal = true;
    editingFieldIndex = -1;
    newFieldKey = '';
    newFieldName = '';
    newFieldSelector = '';
    selectedPredefinedField = '';
  }

  // 编辑字段
  function editField(index: number) {
    const field = fields[index];
    editingFieldIndex = index;
    newFieldKey = field.key;
    newFieldName = field.name;
    newFieldSelector = field.selector;
    selectedPredefinedField = '';
    showAddFieldModal = true;
  }

  // 关闭添加字段模态框
  function closeAddFieldModal() {
    showAddFieldModal = false;
    newFieldKey = '';
    newFieldName = '';
    newFieldSelector = '';
    selectedPredefinedField = '';
  }

  // 选择预定义字段
  function selectPredefinedField() {
    if (!selectedPredefinedField) return;

    const predefined = availablePredefinedFields.find(f => f.key === selectedPredefinedField);
    if (predefined) {
      newFieldKey = predefined.key;
      newFieldName = predefined.name;
      newFieldSelector = predefined.selector;
    }
  }

  // 保存字段
  function saveField() {
    if (!newFieldKey.trim() || !newFieldName.trim()) {
      alert('请填写字段键名和显示名称');
      return;
    }

    // 检查键名是否已存在（编辑时排除自己）
    const existingIndex = fields.findIndex(f => f.key === newFieldKey.trim());
    if (existingIndex >= 0 && existingIndex !== editingFieldIndex) {
      alert('字段键名已存在！');
      return;
    }

    const fieldData: WebChatMetadataField = {
      key: newFieldKey.trim(),
      name: newFieldName.trim(),
      selector: newFieldSelector.trim(),
      enabled: true,
      isPredefined: availablePredefinedFields.some(p => p.key === newFieldKey.trim())
    };

    if (editingFieldIndex >= 0) {
      // 编辑现有字段
      fields[editingFieldIndex] = fieldData;
      fields = [...fields]; // 触发响应式更新
    } else {
      // 添加新字段
      fields = [...fields, fieldData];
    }

    dispatch('fieldsChange', fields);
    closeAddFieldModal();
  }

  // 删除字段
  function deleteField(index: number) {
    const field = fields[index];
    if (confirm(`确定要删除字段"${field.name}"吗？`)) {
      fields = fields.filter((_, i) => i !== index);
      dispatch('fieldsChange', fields);
    }
  }

  // 切换字段启用状态
  function toggleFieldEnabled(index: number) {
    fields[index].enabled = !fields[index].enabled;
    fields = [...fields]; // 触发响应式更新
    dispatch('fieldsChange', fields);
  }

  // 更新字段选择器
  function updateFieldSelector(index: number, selector: string) {
    fields[index].selector = selector;
    fields = [...fields]; // 触发响应式更新
    dispatch('fieldsChange', fields);
  }
</script>

<!-- 主字段管理器模态框 -->
{#if isOpen}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal-content large-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>元信息字段管理</h3>
        <button type="button" class="modal-close" on:click={closeModal}>×</button>
      </div>

      <div class="modal-body">
        <div class="fields-manager">
          <div class="manager-header">
            <div class="manager-stats">
              <span>共 {fields.length} 个字段，{fields.filter(f => f.enabled).length} 个已启用</span>
            </div>
            <button type="button" class="btn-add-field" on:click={openAddFieldModal}>+ 添加字段</button>
          </div>

          <div class="fields-table">
            <div class="table-header">
              <div class="col-enabled">启用</div>
              <div class="col-name">字段名称</div>
              <div class="col-key">键名</div>
              <div class="col-selector">CSS选择器</div>
              <div class="col-actions">操作</div>
            </div>

            {#each fields as field, index}
              <div class="table-row">
                <div class="col-enabled">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    on:change={() => toggleFieldEnabled(index)}
                  />
                </div>
                <div class="col-name">
                  <span class="field-name">{field.name}</span>
                  {#if field.isPredefined}
                    <span class="predefined-badge">预定义</span>
                  {/if}
                </div>
                <div class="col-key">
                  <code>{field.key}</code>
                </div>
                <div class="col-selector">
                  <input
                    type="text"
                    value={field.selector}
                    on:input={(e) => updateFieldSelector(index, e.target.value)}
                    placeholder="CSS选择器"
                    class="selector-input-inline"
                  />
                </div>
                <div class="col-actions">
                  <button type="button" class="btn-edit" on:click={() => editField(index)}>编辑</button>
                  <button type="button" class="btn-delete" on:click={() => deleteField(index)}>删除</button>
                </div>
              </div>
            {/each}

            {#if fields.length === 0}
              <div class="empty-table">
                <p>还没有配置任何字段</p>
                <button type="button" class="btn-add-first" on:click={openAddFieldModal}>添加第一个字段</button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" on:click={closeModal}>完成</button>
      </div>
    </div>
  </div>
{/if}

<!-- 添加/编辑字段模态框 -->
{#if showAddFieldModal}
  <div class="modal-overlay" on:click={closeAddFieldModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{editingFieldIndex >= 0 ? '编辑' : '添加'}元信息字段</h3>
        <button type="button" class="modal-close" on:click={closeAddFieldModal}>×</button>
      </div>

      <div class="modal-body">
        <!-- 预定义字段选择 -->
        {#if availablePredefinedFields.length > 0}
          <div class="form-group">
            <label class="form-label">选择预定义字段</label>
            <select bind:value={selectedPredefinedField} on:change={selectPredefinedField} class="form-select">
              <option value="">-- 选择预定义字段 --</option>
              {#each availablePredefinedFields as field}
                <option value={field.key}>{field.name}</option>
              {/each}
            </select>
          </div>

          <div class="divider"><span>或</span></div>
        {/if}

        <!-- 自定义字段输入 -->
        <div class="form-group">
          <label class="form-label">字段键名 *</label>
          <input
            type="text"
            bind:value={newFieldKey}
            placeholder="如: author, date, tags"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">显示名称 *</label>
          <input
            type="text"
            bind:value={newFieldName}
            placeholder="如: 作者信息, 发布时间"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">CSS选择器</label>
          <input
            type="text"
            bind:value={newFieldSelector}
            placeholder="如: .author, .username"
            class="form-input"
          />
          <div class="form-help">用于提取该字段内容的CSS选择器</div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" on:click={closeAddFieldModal}>取消</button>
        <button type="button" class="btn-save" on:click={saveField}>
          {editingFieldIndex >= 0 ? '更新' : '添加'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .large-modal {
    max-width: 900px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-secondary);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  /* 字段管理器样式 */
  .fields-manager {
    width: 100%;
  }

  .manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .manager-stats {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .btn-add-field {
    padding: 0.5rem 1rem;
    border: 1px solid #007bff;
    border-radius: 0.25rem;
    background: #007bff;
    color: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .btn-add-field:hover {
    background: #0056b3;
  }

  /* 表格样式 */
  .fields-table {
    border: 1px solid var(--border-secondary);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 60px 1fr 120px 2fr 120px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-secondary);
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .table-header > div {
    padding: 0.75rem 0.5rem;
    border-right: 1px solid var(--border-secondary);
  }

  .table-header > div:last-child {
    border-right: none;
  }

  .table-row {
    display: grid;
    grid-template-columns: 60px 1fr 120px 2fr 120px;
    border-bottom: 1px solid var(--border-secondary);
    transition: background-color 0.2s;
  }

  .table-row:hover {
    background: var(--bg-secondary);
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row > div {
    padding: 0.75rem 0.5rem;
    border-right: 1px solid var(--border-secondary);
    display: flex;
    align-items: center;
  }

  .table-row > div:last-child {
    border-right: none;
  }

  .col-enabled {
    justify-content: center;
  }

  .col-name {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .field-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .predefined-badge {
    padding: 0.125rem 0.5rem;
    background: #e0f2fe;
    color: #0277bd;
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .col-key code {
    background: var(--bg-tertiary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .selector-input-inline {
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-secondary);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.75rem;
    font-family: monospace;
  }

  .selector-input-inline:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .col-actions {
    gap: 0.5rem;
  }

  .btn-edit,
  .btn-delete {
    padding: 0.25rem 0.5rem;
    border: 1px solid;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .btn-edit {
    border-color: #28a745;
    background: #28a745;
    color: white;
  }

  .btn-edit:hover {
    background: #218838;
  }

  .btn-delete {
    border-color: #dc3545;
    background: #dc3545;
    color: white;
  }

  .btn-delete:hover {
    background: #c82333;
  }

  .empty-table {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-table p {
    margin: 0 0 1rem 0;
  }

  .btn-add-first {
    padding: 0.5rem 1rem;
    border: 1px solid #007bff;
    border-radius: 0.25rem;
    background: #007bff;
    color: white;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-add-first:hover {
    background: #0056b3;
  }

  /* 表单样式 */
  .form-group {
    margin-bottom: 1rem;
  }

  .form-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-help {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
    color: var(--text-secondary);
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border-secondary);
    z-index: 1;
  }

  .divider span {
    background: var(--bg-primary);
    padding: 0 1rem;
    position: relative;
    z-index: 2;
  }

  /* 按钮样式 */
  .btn-cancel,
  .btn-save {
    padding: 0.5rem 1rem;
    border: 1px solid;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-cancel {
    border-color: var(--border-primary);
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .btn-cancel:hover {
    background: var(--bg-tertiary);
  }

  .btn-save {
    border-color: #007bff;
    background: #007bff;
    color: white;
  }

  .btn-save:hover {
    background: #0056b3;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .table-header,
    .table-row {
      grid-template-columns: 50px 1fr 80px 1fr 80px;
      font-size: 0.75rem;
    }

    .table-header > div,
    .table-row > div {
      padding: 0.5rem 0.25rem;
    }

    .modal-content {
      width: 95%;
      margin: 1rem;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 1rem;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import {
    WebContentConfigManager,
    WebContentDomainManager
  } from '@/lib/web-content-config';
  import { t } from '@/lib/i18n';
  import MetadataFieldsManager from './MetadataFieldsManager.svelte';
  import MetadataConfigSection from './MetadataConfigSection.svelte';
  import DomainRuleEditor from './DomainRuleEditor.svelte';
  import type {
    WebChatExtractionConfig,
    WebChatExtractionMode,
    WebChatConfigUIState,
    WebChatConfigFormData,
    WebChatMetadataConfig,
    WebChatMetadataField,
    WebChatDomainRule
  } from '@/types/web-content-config';

  // 状态管理
  let config: WebChatExtractionConfig | null = null;
  let uiState: WebChatConfigUIState = {
    isLoading: true,
    isSaving: false,
    showAdvanced: false,
    showDomainEditor: false,
    showTemplateManager: false,
    editingDomain: null,
    selectedTemplate: null
  };

  // 表单数据 v2.0（支持多元信息字段）
  let formData: WebChatConfigFormData = {
    mode: 'readability',
    globalRemove: '',
    charThreshold: 50,
    keepClasses: true,
    preserveLinks: false,
    maxElemsToDivide: 5,
    // 重构后的元信息配置
    metadataEnabled: true,
    metadataFields: [],  // 将从配置中加载
    metadataTemplate: 'Author: {author}\nDate: {date}\nTags: {tags}',
    metadataSeparator: '\n',
    metadataIncludeEmpty: false,
    // 域名规则开关
    domainRulesEnabled: true
  };

  // v2.0版本数据
  let domainRules: Record<string, WebChatDomainRule> = {};



  // 域名规则编辑器状态
  let showDomainRuleEditor = false;
  let editingDomainRule: WebChatDomainRule | null = null;
  let editingDomainName = '';
  let isDomainRuleEditing = false;

  onMount(async () => {
    await loadConfig();
  });

  async function loadConfig() {
    uiState.isLoading = true;
    try {
      const configManager = WebContentConfigManager.getInstance();
      config = await configManager.loadConfig();

      console.log('配置加载完成，版本:', config.version);

      // 更新表单数据
      updateFormFromConfig();

      // 加载v2.0数据
      domainRules = await WebContentDomainManager.getAllDomainRules();

    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      uiState.isLoading = false;
    }
  }

  function updateFormFromConfig() {
    if (!config) return;

    formData.mode = config.mode;
    formData.globalRemove = config.global.remove.join('\n');
    formData.charThreshold = config.global.readabilityOptions.charThreshold;
    formData.maxElemsToDivide = config.global.readabilityOptions.maxElemsToDivide;
    formData.domainRulesEnabled = config.global.domainRulesEnabled ?? true; // 默认启用域名规则
    // keepClasses 和 preserveLinks 使用固定默认值，不需要从配置加载

    // 更新元信息配置 v2.0（支持多字段）
    if (config.global.metadata) {
      formData.metadataEnabled = config.global.metadata.enabled;

      // 处理选择器数据
      let fields: WebChatMetadataField[] = [];
      if (Array.isArray(config.global.metadata.selectors)) {
        fields = config.global.metadata.selectors;
      } else if (config.global.metadata.selectors && typeof config.global.metadata.selectors === 'object') {
        // 转换旧格式
        fields = convertLegacySelectors(config.global.metadata.selectors);
      }

      // 如果字段为空，生成默认字段
      if (fields.length === 0) {
        console.log('⚠️ 检测到空的字段配置，生成默认字段');
        fields = generateDefaultFields();
      }

      formData.metadataFields = fields;
      formData.metadataTemplate = config.global.metadata.format.template;
      // 分隔符和空值控制不再需要用户配置

      console.log('加载的元信息字段:', formData.metadataFields.length, '个');
    } else {
      // 如果没有元信息配置，生成默认配置
      console.log('⚠️ 没有元信息配置，生成默认配置');
      formData.metadataFields = generateDefaultFields();
      formData.metadataEnabled = true;
      formData.metadataTemplate = 'Author: {author}\nDate: {date}\nTags: {tags}';
      // 分隔符和空值控制使用固定默认值
    }

    // 如果模板为空或者是默认模板，根据当前字段重新生成
    if (!formData.metadataTemplate ||
        formData.metadataTemplate === 'Author: {author}\nDate: {date}\nTags: {tags}' ||
        formData.metadataTemplate.includes('作者：{author}')) {
      updateTemplate();
    }
  }

  async function saveConfig() {
    if (!config) return;
    
    uiState.isSaving = true;
    try {
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        mode: formData.mode,
        global: {
          ...config.global,
          remove: formData.globalRemove.split('\n').map(s => s.trim()).filter(s => s.length > 0),
          metadata: formData.mode === 'readability' ? {
            enabled: formData.metadataEnabled,
            selectors: formData.metadataFields.length > 0 ? formData.metadataFields : generateDefaultFields(),
            format: {
              template: formData.metadataTemplate,
              separator: "\n", // 固定使用换行符
              includeEmpty: false // 固定不包含空值
            }
          } : undefined,
          readabilityOptions: {
            ...config.global.readabilityOptions,
            charThreshold: formData.charThreshold,
            keepClasses: true, // 固定使用默认值
            preserveLinks: false, // 固定使用默认值
            maxElemsToDivide: formData.maxElemsToDivide
          },
          domainRulesEnabled: formData.domainRulesEnabled // 保存域名规则开关状态
        }
      };

      await WebContentConfigManager.getInstance().saveConfig(updatedConfig);
      config = updatedConfig;
      
      alert('配置保存成功！');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('配置保存失败，请重试');
    } finally {
      uiState.isSaving = false;
    }
  }

  async function resetToDefaults() {
    if (confirm('确定要重置为默认配置吗？这将清除所有自定义设置。')) {
      const defaultConfig = WebContentConfigManager.getDefaultConfig();
      config = defaultConfig;
      updateFormFromConfig();
      await saveConfig();
    }
  }

  // 模式切换处理 v2.0 - 简化版本
  // 调试日志
  $: console.log('当前formData.mode:', formData.mode);

  // 转换旧格式的选择器为新的字段数组
  function convertLegacySelectors(selectors: any): WebChatMetadataField[] {
    if (!selectors || typeof selectors !== 'object') return [];

    const fields: WebChatMetadataField[] = [];

    // 预定义字段映射
    const fieldMapping = {
      author: '作者信息',
      date: '发布时间',
      tags: '标签分类',
      title: '文章标题',
      votes: '点赞数',
      views: '阅读量',
      source: '内容来源',
      location: '地理位置',
      category: '内容分类',
      comment_count: '评论数',
      reading_time: '阅读时长',
      word_count: '字数统计'
    };

    Object.entries(selectors).forEach(([key, selector]) => {
      if (typeof selector === 'string' && selector.trim()) {
        fields.push({
          key,
          name: fieldMapping[key as keyof typeof fieldMapping] || key,
          selector: selector.trim(),
          enabled: true,
          isPredefined: key in fieldMapping
        });
      }
    });

    console.log('转换旧格式选择器，得到', fields.length, '个字段');
    return fields;
  }

  // 生成默认字段（客户端版本，确保兼容性）
  function generateDefaultFields(): WebChatMetadataField[] {
    const defaultFields: WebChatMetadataField[] = [
      {
        key: 'author',
        name: '作者信息',
        selector: '.author, .username, .nick-name, .AuthorInfo-name',
        enabled: true,
        isPredefined: true
      },
      {
        key: 'date',
        name: '发布时间',
        selector: '.date, .time, .publish-time, .ContentItem-time',
        enabled: true,
        isPredefined: true
      },
      {
        key: 'tags',
        name: '标签分类',
        selector: '.tags, .tag, .category, .Tag',
        enabled: true,
        isPredefined: true
      },
      {
        key: 'title',
        name: '文章标题',
        selector: 'h1, .title, .article-title',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'votes',
        name: '点赞数',
        selector: '.vote, .like, .upvote, .thumbs-up',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'views',
        name: '阅读量',
        selector: '.view, .read, .pv, .pageview',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'source',
        name: '内容来源',
        selector: '.source, .from, .origin',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'location',
        name: '地理位置',
        selector: '.location, .place, .address',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'category',
        name: '内容分类',
        selector: '.category, .section, .channel',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'comment_count',
        name: '评论数',
        selector: '.comment, .reply, .discuss',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'reading_time',
        name: '阅读时长',
        selector: '.reading-time, .read-time',
        enabled: false,
        isPredefined: true
      },
      {
        key: 'word_count',
        name: '字数统计',
        selector: '.word-count, .length',
        enabled: false,
        isPredefined: true
      }
    ];

    console.log('生成默认字段:', defaultFields.length, '个');
    return defaultFields;
  }

  // 根据启用的字段生成输出模板
  function generateTemplate(fields: WebChatMetadataField[]): string {
    const enabledFields = fields.filter(f => f.enabled);

    if (enabledFields.length === 0) {
      return '暂无启用的字段';
    }

    // 生成多行格式的模板
    const templateLines = enabledFields.map(field => {
      return `${field.name}: {${field.key}}`;
    });

    return templateLines.join('\n');
  }

  // 更新模板（当字段变化时调用）
  function updateTemplate() {
    const newTemplate = generateTemplate(formData.metadataFields);
    formData.metadataTemplate = newTemplate;
    console.log('模板已更新:', newTemplate);
  }

  // 处理元信息字段变更
  function handleMetadataFieldsChange(fields: WebChatMetadataField[]) {
    formData.metadataFields = fields;
    updateTemplate(); // 自动更新模板
    console.log('元信息字段已更新:', fields);
  }

  // 字段管理模态框状态
  let showFieldManagerModal = false;
  let showAddFieldModal = false;
  let editingFieldIndex = -1;
  let newFieldKey = '';
  let newFieldName = '';
  let newFieldSelector = '';
  let selectedPredefinedField = '';

  // 预定义字段选项（未添加的）
  $: availablePredefinedFields = [
    { key: 'author', name: '作者信息', selector: '.author, .username, .nick-name' },
    { key: 'date', name: '发布时间', selector: '.date, .time, .publish-time' },
    { key: 'tags', name: '标签分类', selector: '.tags, .tag, .category' },
    { key: 'title', name: '文章标题', selector: 'h1, .title, .article-title' },
    { key: 'votes', name: '点赞数', selector: '.vote, .like, .upvote' },
    { key: 'views', name: '阅读量', selector: '.view, .read, .pv' },
    { key: 'source', name: '内容来源', selector: '.source, .from, .origin' },
    { key: 'location', name: '地理位置', selector: '.location, .place, .address' },
    { key: 'category', name: '内容分类', selector: '.category, .section, .channel' },
    { key: 'comment_count', name: '评论数', selector: '.comment, .reply, .discuss' },
    { key: 'reading_time', name: '阅读时长', selector: '.reading-time, .read-time' },
    { key: 'word_count', name: '字数统计', selector: '.word-count, .length' }
  ].filter(predefined => !formData.metadataFields.some(existing => existing.key === predefined.key));

  // 打开字段管理器
  function openFieldManager() {
    showFieldManagerModal = true;
  }

  // 关闭字段管理器
  function closeFieldManager() {
    showFieldManagerModal = false;
    closeAddFieldModal();
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
    const field = formData.metadataFields[index];
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

  // 添加或编辑字段
  function saveField() {
    // 验证输入
    if (!newFieldKey.trim() || !newFieldName.trim()) {
      alert('请填写字段键名和显示名称');
      return;
    }

    // 验证键名格式（只允许字母、数字、下划线）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newFieldKey)) {
      alert('字段键名只能包含字母、数字和下划线，且不能以数字开头');
      return;
    }

    // 检查键名是否已存在（编辑时排除当前字段）
    const existingIndex = formData.metadataFields.findIndex(f => f.key === newFieldKey);
    if (existingIndex !== -1 && existingIndex !== editingFieldIndex) {
      alert('字段键名已存在！');
      return;
    }

    const fieldData: WebChatMetadataField = {
      key: newFieldKey.trim(),
      name: newFieldName.trim(),
      selector: newFieldSelector.trim(),
      enabled: editingFieldIndex >= 0 ? formData.metadataFields[editingFieldIndex].enabled : true,
      isPredefined: availablePredefinedFields.some(f => f.key === newFieldKey)
    };

    if (editingFieldIndex >= 0) {
      // 编辑现有字段
      formData.metadataFields[editingFieldIndex] = fieldData;
      formData.metadataFields = [...formData.metadataFields]; // 触发响应式更新
      console.log('编辑字段:', fieldData);
    } else {
      // 添加新字段
      formData.metadataFields = [...formData.metadataFields, fieldData];
      console.log('添加字段:', fieldData);
    }

    updateTemplate(); // 更新模板
    closeAddFieldModal();
  }

  // 删除字段
  function deleteField(index: number) {
    const field = formData.metadataFields[index];
    if (confirm(`确定要删除字段"${field.name}"吗？`)) {
      formData.metadataFields = formData.metadataFields.filter((_, i) => i !== index);
      updateTemplate(); // 更新模板
      console.log('删除字段:', field);
    }
  }

  // 切换字段启用状态
  function toggleFieldEnabled(index: number) {
    formData.metadataFields[index].enabled = !formData.metadataFields[index].enabled;
    formData.metadataFields = [...formData.metadataFields]; // 触发响应式更新
    updateTemplate(); // 更新模板
  }













  function toggleAdvanced() {
    uiState.showAdvanced = !uiState.showAdvanced;
  }

  // 域名规则管理函数
  async function editDomainRule(domain: string) {
    const rule = domainRules[domain];
    if (rule) {
      editingDomainRule = rule;
      editingDomainName = domain;
      isDomainRuleEditing = true;
      showDomainRuleEditor = true;
    }
  }

  async function deleteDomainRule(domain: string) {
    if (confirm(`确定要删除域名规则 "${domain}" 吗？`)) {
      try {
        const result = await WebContentDomainManager.deleteDomainRule(domain);
        if (result.success) {
          // 重新加载域名规则
          domainRules = await WebContentDomainManager.getAllDomainRules();
          alert('域名规则删除成功！');
        } else {
          alert(`删除失败: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to delete domain rule:', error);
        alert('删除失败');
      }
    }
  }

  async function addNewDomainRule() {
    editingDomainRule = null;
    editingDomainName = '';
    isDomainRuleEditing = false;
    showDomainRuleEditor = true;
  }

  // 处理域名规则保存
  async function handleDomainRuleSave(event: CustomEvent<{ domain: string; rule: WebChatDomainRule }>) {
    const { domain, rule } = event.detail;
    try {
      // 重新加载域名规则列表
      domainRules = await WebContentDomainManager.getAllDomainRules();
      showDomainRuleEditor = false;
      alert(isDomainRuleEditing ? '域名规则更新成功！' : '域名规则添加成功！');
    } catch (error) {
      console.error('Failed to refresh domain rules:', error);
    }
  }

  // 处理域名规则取消
  function handleDomainRuleCancel() {
    showDomainRuleEditor = false;
    editingDomainRule = null;
    editingDomainName = '';
    isDomainRuleEditing = false;
  }
</script>

<!-- 严格按照设计文档的界面设计 -->
<div class="web-chat-config">
  {#if uiState.isLoading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>{$t('webChatConfig.loading')}</span>
    </div>
  {:else}
    <form on:submit|preventDefault={saveConfig}>
      <!-- 基础配置区 - MVP版本 -->
      <div class="config-section">
        <h3 class="section-title">🔄 {$t('webChatConfig.mode')}</h3>

        <div class="mode-options-compact">
          <label class="mode-option-compact {formData.mode === 'text' ? 'active' : ''}">
            <input type="radio" bind:group={formData.mode} value="text" />
            <div class="mode-content-compact">
              <span class="mode-title">{$t('webChatConfig.modeText')}</span>
              <span class="mode-desc">{$t('webChatConfig.modeTextDesc')}</span>
            </div>
          </label>

          <label class="mode-option-compact {formData.mode === 'readability' ? 'active' : ''}">
            <input type="radio" bind:group={formData.mode} value="readability" />
            <div class="mode-content-compact">
              <span class="mode-title">{$t('webChatConfig.modeReadability')}</span>
              <span class="mode-desc">{$t('webChatConfig.modeReadabilityDesc')}</span>
            </div>
          </label>
        </div>


      </div>

      <!-- 通用配置区 - 两种模式都需要 -->
      <div class="config-section">
        <h3 class="section-title">🗑️ {$t('webChatConfig.globalSettings')}</h3>

        <div class="form-group">
          <label class="form-label">{$t('webChatConfig.removeElements')}</label>
          <textarea
            bind:value={formData.globalRemove}
            placeholder={$t('webChatConfig.removeElementsPlaceholder')}
            class="form-textarea"
            rows="4"
          ></textarea>
          <div class="form-help">{$t('webChatConfig.removeElementsDesc')}</div>
          <div class="form-help">{$t('common.examples')}: .ad, nav, footer, .sidebar, .popup</div>
        </div>
      </div>





      <!-- 高级配置区 - v2.0版本 -->
      <div class="config-section">
        <button 
          type="button" 
          class="section-toggle"
          on:click={toggleAdvanced}
        >
          <span>⚙️ {$t('settings.advanced')}</span>
          <span class="toggle-icon {uiState.showAdvanced ? 'expanded' : ''}">
            {uiState.showAdvanced ? '▼' : '▶'}
          </span>
        </button>

        {#if uiState.showAdvanced}
          <!-- Readability模式的高级配置 -->
          {#if formData.mode === 'readability'}
            <!-- Readability参数调整 -->
            <div class="advanced-section">
              <h4 class="subsection-title">🔧 {$t('webChatConfig.readabilitySettings')}</h4>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{$t('webChatConfig.charThreshold')}</label>
                  <input
                    type="number"
                    bind:value={formData.charThreshold}
                    min="0"
                    max="1000"
                    class="form-input"
                  />
                  <div class="form-help">{$t('webChatConfig.charThresholdDesc')}</div>
                </div>

                <div class="form-group">
                  <label class="form-label">{$t('webChatConfig.maxElemsToDivide')}</label>
                  <input
                    type="number"
                    bind:value={formData.maxElemsToDivide}
                    min="1"
                    max="20"
                    class="form-input"
                  />
                  <div class="form-help">{$t('webChatConfig.maxElemsToDivideDesc')}</div>
                </div>
              </div>
            </div>

            <!-- 元信息提取配置 -->
            <div class="advanced-section">
              <MetadataConfigSection
                bind:enabled={formData.metadataEnabled}
                bind:fields={formData.metadataFields}
                bind:template={formData.metadataTemplate}
              />
            </div>
          {/if}

          <!-- 域名规则管理 - 根据模式显示不同内容 -->
          <div class="advanced-section">
            <div class="feature-toggle-header">
              <div class="feature-info">
                <h4 class="subsection-title">📍 {$t('webChatConfig.domainRules')} ({formData.mode === 'text' ? $t('webChatConfig.modeText') : $t('webChatConfig.modeReadability')})</h4>
                <div class="feature-description">{$t('webChatConfig.domainRulesDescription')}</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" bind:checked={formData.domainRulesEnabled} />
                <span class="toggle-slider"></span>
                <span class="toggle-label">{formData.domainRulesEnabled ? $t('webChatConfig.domainRulesEnabled') : $t('webChatConfig.domainRulesDisabled')}</span>
              </label>
            </div>

            {#if formData.domainRulesEnabled}
              <div class="domain-rules">
              {#each Object.entries(domainRules) as [domain, rule]}
                <div class="domain-rule-item">
                  <div class="domain-info">
                    <strong>{domain}</strong>
                    <span class="domain-name">({rule.name})</span>
                  </div>
                  <div class="domain-details">
                    <div>{$t('webChatConfig.removeElements')}: {rule.remove.join(', ')}</div>
                    {#if formData.mode === 'readability' && rule.metadata?.enabled}
                      <div>{$t('webChatConfig.metadataSettings')}: {$t('webChatConfig.metadataEnabled')}</div>
                    {/if}
                  </div>
                  <div class="domain-actions">
                    <button type="button" class="btn-small" on:click={() => editDomainRule(domain)}>{$t('common.edit')}</button>
                    <button type="button" class="btn-small btn-danger" on:click={() => deleteDomainRule(domain)}>{$t('common.delete')}</button>
                  </div>
                </div>
              {/each}

                <button type="button" class="btn-add-domain" on:click={addNewDomainRule}>+ {$t('webChatConfig.addDomainRule')}</button>
              </div>


            {/if}
          </div>


        {/if}
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" on:click={resetToDefaults}>
          {$t('webChatConfig.resetToDefault')}
        </button>

        <div class="action-group">
          <button type="submit" class="btn btn-primary" disabled={uiState.isSaving}>
            {#if uiState.isSaving}
              <div class="btn-spinner"></div>
            {/if}
            {$t('webChatConfig.saveChanges')}
          </button>
        </div>
      </div>
    </form>
  {/if}
</div>

<!-- 域名规则编辑器模态框 -->
{#if showDomainRuleEditor}
  <div class="modal-overlay" on:click={handleDomainRuleCancel}>
    <div class="modal-content large-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{isDomainRuleEditing ? $t('webChatConfig.editDomainRule') : $t('webChatConfig.addDomainRule')}</h3>
        <button class="modal-close" on:click={handleDomainRuleCancel}>×</button>
      </div>

      <div class="modal-body">
        <DomainRuleEditor
          mode={formData.mode}
          editingRule={editingDomainRule}
          editingDomain={editingDomainName}
          isEditing={isDomainRuleEditing}
          on:save={handleDomainRuleSave}
          on:cancel={handleDomainRuleCancel}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .web-chat-config {
    width: 100%;
    padding: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--border-primary);
    border-top: 2px solid var(--text-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .config-section {
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
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .section-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0;
    background: none;
    border: none;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .toggle-icon {
    transition: transform 0.2s ease;
  }

  .toggle-icon.expanded {
    transform: rotate(90deg);
  }

  .mode-options {
    display: grid;
    gap: 1rem;
  }

  .mode-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border: 2px solid var(--border-primary);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mode-option:hover {
    border-color: #3b82f6;
  }

  .mode-option.active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .mode-option input[type="radio"] {
    margin-top: 0.25rem;
  }

  .mode-content h4 {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
    color: var(--text-primary);
  }

  .mode-content p {
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary);
  }

  .mode-content small {
    color: var(--text-muted);
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

  .form-help {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }



  /* 元信息配置样式 v2.0 */
  .metadata-config {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--border-secondary);
  }

  /* 模板模式选择器 */
  .template-mode-selector {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
  }

  .mode-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }

  .mode-selector:hover {
    background: var(--bg-primary);
  }

  .mode-selector input[type="radio"] {
    margin: 0;
  }



  /* 字段统计信息样式 */
  .fields-summary {
    background: var(--bg-tertiary);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .fields-summary p {
    margin: 0;
  }

  /* 简化字段管理器样式 */
  .simple-fields-manager {
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-add {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #007bff;
    border-radius: 0.25rem;
    background: #007bff;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add:hover {
    background: #0056b3;
  }



  .field-item {
    border: 1px solid var(--border-secondary);
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: var(--bg-primary);
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
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #ef4444;
    border-radius: 0.25rem;
    background: #ef4444;
    color: white;
    cursor: pointer;
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



  /* 现代化字段概览卡片 */
  .fields-overview-card {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .overview-title h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .overview-badges {
    display: flex;
    gap: 0.5rem;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-total {
    background: #e0f2fe;
    color: #0277bd;
  }

  .badge-enabled {
    background: #e8f5e8;
    color: #2e7d32;
  }

  .btn-manage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  }

  .btn-manage:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
  }

  .btn-icon {
    font-size: 1rem;
  }

  .enabled-fields-preview {
    background: white;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
  }

  .preview-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
    font-weight: 500;
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
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #fbbf24;
  }

  .tag-icon {
    font-size: 0.875rem;
  }

  .no-fields-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #fef7cd;
    border: 1px solid #fbbf24;
    border-radius: 0.5rem;
    color: #92400e;
    font-size: 0.875rem;
  }

  .message-icon {
    font-size: 1rem;
  }

  /* 模板配置区域样式 */
  .template-config-section {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h4 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-auto-generate {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
  }

  .btn-auto-generate:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
  }

  .template-editor {
    position: relative;
  }

  .template-textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fafafa;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .template-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background: white;
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
    color: var(--text-secondary);
  }

  .help-icon {
    font-size: 0.875rem;
  }

  .help-item code {
    padding: 0.125rem 0.375rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #475569;
  }



  /* 响应式设计 */
  @media (max-width: 768px) {
    .overview-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .overview-badges {
      justify-content: flex-start;
    }

    .btn-manage {
      justify-content: center;
    }

    .fields-tags {
      flex-direction: column;
    }

    .section-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .btn-auto-generate {
      justify-content: center;
    }

    .template-help {
      flex-direction: column;
    }
  }

  /* 模式信息框样式 */
  .mode-info {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border-left: 4px solid var(--primary-color);
  }

  .mode-info p {
    margin: 0 0 0.5rem 0;
    font-weight: 500;
    color: var(--text-primary);
  }

  .mode-info ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .mode-info li {
    margin-bottom: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  /* 紧凑模式选择样式 */
  .mode-options-compact {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mode-option-compact {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--bg-primary);
  }

  .mode-option-compact:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .mode-option-compact.active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .mode-option-compact input[type="radio"] {
    margin: 0;
  }

  .mode-content-compact {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mode-title {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .mode-desc {
    color: var(--text-muted);
    font-size: 0.8rem;
  }



  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: var(--text-primary);
  }

  .advanced-section {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-secondary);
  }

  .subsection-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
  }



  .domain-rules {
    space-y: 1rem;
  }

  .domain-rule-item {
    padding: 1rem;
    border: 1px solid var(--border-secondary);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .domain-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .domain-name {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .domain-details {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .domain-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-small:hover {
    background: var(--bg-secondary);
    transform: translateY(-1px);
  }

  .btn-small:active {
    transform: translateY(0);
  }

  .btn-danger {
    border-color: #ef4444;
    color: #ef4444;
  }

  .btn-danger:hover {
    background: #ef4444;
    color: white;
  }

  .btn-add-domain {
    padding: 0.75rem 1rem;
    border: 2px dashed var(--border-primary);
    border-radius: 0.5rem;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
  }

  .btn-add-domain:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .preview-controls {
    margin-bottom: 1rem;
    display: flex;
    gap: 0.75rem;
  }



  .preview-result {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
  }

  .preview-success {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
  }

  .preview-error {
    background: #fef2f2;
    border: 1px solid #ef4444;
    color: #dc2626;
  }

  .preview-content {
    margin-top: 0.5rem;
  }

  .preview-excerpt {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    max-height: 100px;
    overflow-y: auto;
  }

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid var(--border-primary);
  }

  .action-group {
    display: flex;
    gap: 0.5rem;
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

  @media (max-width: 768px) {
    .config-section {
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }



    .form-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .action-group {
      justify-content: center;
    }

    .metadata-config {
      padding: 0.75rem;
    }

    .template-mode-selector {
      flex-direction: column;
      gap: 0.5rem;
    }
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
    color: var(--text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-secondary);
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: var(--bg-tertiary);
  }

  .btn-confirm {
    padding: 0.5rem 1rem;
    border: 1px solid #007bff;
    border-radius: 0.25rem;
    background: #007bff;
    color: white;
    cursor: pointer;
  }

  .btn-confirm:hover {
    background: #0056b3;
  }

  .form-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .divider {
    text-align: center;
    margin: 1rem 0;
    color: var(--text-secondary);
    position: relative;
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
  }

  .btn-add-field:hover {
    background: #0056b3;
  }

  .fields-table {
    border: 1px solid var(--border-secondary);
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 60px 1fr 120px 2fr 120px;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-secondary);
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-secondary);
  }

  .table-row {
    display: grid;
    grid-template-columns: 60px 1fr 120px 2fr 120px;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-secondary);
    align-items: center;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--bg-secondary);
  }

  .col-enabled {
    text-align: center;
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .predefined-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  .col-key code {
    font-size: 0.75rem;
    padding: 0.125rem 0.25rem;
    background: var(--bg-secondary);
    border-radius: 0.25rem;
    color: var(--text-secondary);
  }

  .selector-input-inline {
    width: 100%;
    padding: 0.375rem;
    border: 1px solid var(--border-primary);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    background: var(--bg-primary);
  }

  .col-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn-edit, .btn-delete {
    padding: 0.25rem 0.5rem;
    border: 1px solid;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-edit {
    border-color: #6c757d;
    background: #6c757d;
    color: white;
  }

  .btn-edit:hover {
    background: #5a6268;
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
    text-align: center;
    padding: 2rem;
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
  }

  .btn-add-first:hover {
    background: #0056b3;
  }

  /* 模式特定信息卡片 */
  .mode-specific-info {
    margin-top: 1.5rem;
  }

  .info-card {
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid;
  }

  .info-card h5 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .info-card li {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .info-text {
    background: #f8fafc;
    border-left-color: #64748b;
    color: #475569;
  }

  .info-text h5 {
    color: #334155;
  }

  .info-readability {
    background: #f0f9ff;
    border-left-color: #0ea5e9;
    color: #0c4a6e;
  }

  .info-readability h5 {
    color: #075985;
  }

  /* 功能开关样式 */
  .feature-toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
  }

  .feature-info {
    flex: 1;
  }

  .feature-info .subsection-title {
    margin: 0 0 0.5rem 0;
  }

  .feature-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* 现代化开关样式 */
  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .toggle-switch input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 3rem;
    height: 1.5rem;
    background: #cbd5e1;
    border-radius: 0.75rem;
    transition: all 0.3s ease;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
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
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch input[type="checkbox"]:checked + .toggle-slider {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .toggle-switch input[type="checkbox"]:checked + .toggle-slider::before {
    transform: translateX(1.5rem);
  }

  .toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    min-width: 3rem;
  }

  .toggle-switch:hover .toggle-slider {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
</style>

<!-- 字段管理器模态框 -->
{#if showFieldManagerModal}
  <div class="modal-overlay" on:click={closeFieldManager}>
    <div class="modal-content large-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>元信息字段管理</h3>
        <button type="button" class="modal-close" on:click={closeFieldManager}>×</button>
      </div>

      <div class="modal-body">
        <div class="fields-manager">
          <div class="manager-header">
            <div class="manager-stats">
              <span>共 {formData.metadataFields.length} 个字段，{formData.metadataFields.filter(f => f.enabled).length} 个已启用</span>
            </div>
            <button type="button" class="btn-add-field" on:click={openAddFieldModal}>+ 添加字段</button>
          </div>

          <div class="fields-table">
            <div class="table-header">
              <div class="col-enabled">启用</div>
              <div class="col-name">字段名称</div>
              <div class="col-key">键名</div>
              <div class="col-selector">选择器</div>
              <div class="col-actions">操作</div>
            </div>

            {#each formData.metadataFields as field, index}
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
                    bind:value={field.selector}
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

            {#if formData.metadataFields.length === 0}
              <div class="empty-table">
                <p>还没有配置任何字段</p>
                <button type="button" class="btn-add-first" on:click={openAddFieldModal}>添加第一个字段</button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" on:click={closeFieldManager}>完成</button>
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
                <option value={field.key}>{field.name} ({field.key})</option>
              {/each}
            </select>
            <div class="form-help">选择预定义字段会自动填充下面的信息</div>
          </div>

          <div class="divider"><span>或者</span></div>
        {/if}

        <!-- 自定义字段输入 -->
        <div class="form-group">
          <label class="form-label">字段键名 *</label>
          <input
            type="text"
            bind:value={newFieldKey}
            placeholder="例如: custom_field"
            class="form-input"
            pattern="[a-zA-Z_][a-zA-Z0-9_]*"
          />
          <div class="form-help">只能包含字母、数字和下划线，不能以数字开头</div>
        </div>

        <div class="form-group">
          <label class="form-label">显示名称 *</label>
          <input
            type="text"
            bind:value={newFieldName}
            placeholder="例如: 自定义字段"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">CSS选择器</label>
          <input
            type="text"
            bind:value={newFieldSelector}
            placeholder="例如: .custom-field, #field"
            class="form-input"
          />
          <div class="form-help">用于提取字段内容的CSS选择器，多个选择器用逗号分隔</div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" on:click={closeAddFieldModal}>取消</button>
        <button type="button" class="btn-confirm" on:click={saveField}>
          {editingFieldIndex >= 0 ? '保存修改' : '添加字段'}
        </button>
      </div>
    </div>
  </div>
{/if}



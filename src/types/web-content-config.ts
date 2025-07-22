/**
 * 网页内容配置类型定义 v2.0
 * 基于最终设计方案：移除preserve配置，增加metadata元信息提取
 */

// 提取模式：纯文本 | Readability智能提取
export type WebChatExtractionMode = 'text' | 'readability';

// Readability配置选项（简化版，移除classesToPreserve）
export interface WebChatReadabilityOptions {
  charThreshold: number;           // 字符阈值
  keepClasses: boolean;           // 保留CSS类名
  preserveLinks: boolean;         // 保留链接结构
  maxElemsToDivide: number;       // 最大元素分割数
}

// 预定义的元信息字段
export interface PredefinedMetadataFields {
  author: string;                 // 作者信息
  date: string;                   // 发布时间
  tags: string;                   // 标签分类
  title: string;                  // 文章标题
  votes: string;                  // 点赞数
  views: string;                  // 阅读量
  source: string;                 // 内容来源
  location: string;               // 地理位置
  category: string;               // 内容分类
  comment_count: string;          // 评论数
  reading_time: string;           // 阅读时长
  word_count: string;             // 字数统计
}

// 元信息字段配置（支持预定义 + 自定义）
export interface WebChatMetadataField {
  key: string;                    // 字段键名
  name: string;                   // 字段显示名称
  selector: string;               // CSS选择器
  enabled: boolean;               // 是否启用
  isPredefined: boolean;          // 是否为预定义字段
}

// 元信息选择器配置（重构为字段数组）
export type WebChatMetadataSelectors = WebChatMetadataField[];

// 预定义字段模板
export const PREDEFINED_METADATA_FIELDS: Omit<WebChatMetadataField, 'selector' | 'enabled'>[] = [
  { key: 'author', name: '作者信息', isPredefined: true },
  { key: 'date', name: '发布时间', isPredefined: true },
  { key: 'tags', name: '标签分类', isPredefined: true },
  { key: 'title', name: '文章标题', isPredefined: true },
  { key: 'votes', name: '点赞数', isPredefined: true },
  { key: 'views', name: '阅读量', isPredefined: true },
  { key: 'source', name: '内容来源', isPredefined: true },
  { key: 'location', name: '地理位置', isPredefined: true },
  { key: 'category', name: '内容分类', isPredefined: true },
  { key: 'comment_count', name: '评论数', isPredefined: true },
  { key: 'reading_time', name: '阅读时长', isPredefined: true },
  { key: 'word_count', name: '字数统计', isPredefined: true },
];

// 默认启用的字段
export const DEFAULT_ENABLED_FIELDS = ['author', 'date', 'tags'];

// 元信息格式化配置
export interface WebChatMetadataFormat {
  template: string;               // 格式模板字符串，如 "作者：{author} | 时间：{date}"
  separator: string;              // 数组分隔符，如 ", "
  includeEmpty: boolean;          // 是否包含空值字段
}

// 元信息配置
export interface WebChatMetadataConfig {
  enabled: boolean;               // 是否启用元信息提取
  selectors: WebChatMetadataSelectors; // 选择器配置
  format: WebChatMetadataFormat;  // 格式化配置
}

// 域名特定规则（v2.0版本）
export interface WebChatDomainRule {
  name: string;                                    // 域名显示名称
  remove: string[];                               // 移除选择器
  metadata?: WebChatMetadataConfig;               // 元信息配置（仅Readability模式）
  readabilityOptions?: Partial<WebChatReadabilityOptions>; // Readability参数覆盖
}

// 配置模板（v2.0版本，按模式分类）
export interface WebChatConfigTemplate {
  name: string;                    // 模板名称
  description: string;             // 模板描述
  mode: WebChatExtractionMode;     // 适用的模式
  global: {
    remove: string[];              // 全局移除选择器
    metadata?: WebChatMetadataConfig; // 元信息配置（仅Readability模式）
  };
}

// 主配置接口 v2.0 - 移除preserve，增加metadata
export interface WebChatExtractionConfig {
  version: string;                                    // 配置版本（v2.0）
  mode: WebChatExtractionMode;                       // 提取模式
  global: {
    remove: string[];                                 // 全局移除选择器
    metadata?: WebChatMetadataConfig;                 // 元信息配置（仅Readability模式）
    readabilityOptions: WebChatReadabilityOptions;   // 全局Readability配置
  };
  domains: Record<string, WebChatDomainRule>;        // 域名特定规则
  templates: {
    "text-mode": Record<string, WebChatConfigTemplate>;      // Text模式模板
    "readability-mode": Record<string, WebChatConfigTemplate>; // Readability模式模板
  };
}

// 合并后的配置（用于实际提取）v2.0
export interface MergedExtractionConfig {
  mode: WebChatExtractionMode;
  remove: string[];                    // 合并后的移除选择器
  metadata?: WebChatMetadataConfig;    // 合并后的元信息配置（仅Readability模式）
  readabilityOptions: WebChatReadabilityOptions; // 合并后的Readability配置
}

// 提取结果
export interface WebChatExtractedContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  siteName?: string;
  lang?: string;
  method: 'text' | 'readability' | 'fallback';
}

// 提取选项
export interface WebChatExtractionOptions {
  url?: string;
  domain?: string;
  useCustomConfig?: MergedExtractionConfig;
}

// 配置验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 预览结果
export interface PreviewResult {
  success: boolean;
  content: WebChatExtractedContent | null;
  error?: string;
  configUsed: MergedExtractionConfig;
}

// 模板应用结果 v2.0
export interface TemplateApplyResult {
  success: boolean;
  appliedTemplate: string;
  changes: {
    globalRemove: string[];
    metadata?: WebChatMetadataConfig;
  };
}

// 域名规则操作结果
export interface DomainRuleOperationResult {
  success: boolean;
  domain: string;
  operation: 'add' | 'update' | 'delete';
  error?: string;
}

// 配置导入导出格式
export interface ConfigExportData {
  config: WebChatExtractionConfig;
  exportTime: string;
  version: string;
  metadata: {
    totalDomains: number;
    totalTemplates: number;
    mode: WebChatExtractionMode;
  };
}

// UI状态管理
export interface WebChatConfigUIState {
  isLoading: boolean;
  isSaving: boolean;
  showAdvanced: boolean;
  showDomainEditor: boolean;
  showTemplateManager: boolean;
  showPreview: boolean;
  editingDomain: string | null;
  selectedTemplate: string | null;
  previewUrl: string;
}

// 表单数据 v2.0（重构元信息字段）
export interface WebChatConfigFormData {
  mode: WebChatExtractionMode;
  globalRemove: string;
  charThreshold: number;
  keepClasses: boolean;
  preserveLinks: boolean;
  maxElemsToDivide: number;
  // 重构后的元信息配置
  metadataEnabled: boolean;
  metadataFields: WebChatMetadataField[];  // 字段数组
  metadataTemplate: string;
  metadataSeparator: string;
  metadataIncludeEmpty: boolean;
}

// 域名规则表单数据 v2.0
export interface DomainRuleFormData {
  domain: string;
  name: string;
  remove: string;
  // 移除 preserve，新增元信息字段
  metadataEnabled: boolean;
  metadataAuthor: string;
  metadataDate: string;
  metadataTags: string;
  metadataTemplate: string;
  metadataSeparator: string;
  metadataIncludeEmpty: boolean;
  charThreshold?: number;
  keepClasses?: boolean;
  preserveLinks?: boolean;
  maxElemsToDivide?: number;
}

// 模板表单数据 v2.0
export interface TemplateFormData {
  key: string;
  name: string;
  description: string;
  mode: WebChatExtractionMode;
  globalRemove: string;
  // 移除 globalPreserve，新增元信息字段
  metadataEnabled: boolean;
  metadataAuthor: string;
  metadataDate: string;
  metadataTags: string;
  metadataTemplate: string;
  metadataSeparator: string;
  metadataIncludeEmpty: boolean;
}

/**
 * 网页内容配置管理器
 * 严格按照设计文档实现配置管理和合并策略
 */

import type {
  WebChatExtractionConfig,
  WebChatExtractionMode,
  MergedExtractionConfig,
  ConfigValidationResult,
  WebChatDomainRule,
  WebChatConfigTemplate,
  WebChatMetadataConfig,
  WebChatMetadataField
} from '@/types/web-content-config';

import {
  PREDEFINED_METADATA_FIELDS,
  DEFAULT_ENABLED_FIELDS
} from '@/types/web-content-config';

export class WebContentConfigManager {
  private static instance: WebContentConfigManager;
  private config: WebChatExtractionConfig | null = null;
  private readonly STORAGE_KEY = 'webChatExtractionConfig';

  private constructor() {}

  static getInstance(): WebContentConfigManager {
    if (!WebContentConfigManager.instance) {
      WebContentConfigManager.instance = new WebContentConfigManager();
    }
    return WebContentConfigManager.instance;
  }

  /**
   * 创建默认元信息字段
   */
  private static createDefaultMetadataFields(): WebChatMetadataField[] {
    const defaultSelectors = {
      author: ".author, .username, .nick-name, .AuthorInfo-name",
      date: ".date, .time, .publish-time, .ContentItem-time",
      tags: ".tags, .tag, .category, .Tag",
      title: "h1, .title, .article-title",
      votes: ".vote, .like, .upvote, .thumbs-up",
      views: ".view, .read, .pv, .pageview",
      source: ".source, .from, .origin",
      location: ".location, .place, .address",
      category: ".category, .section, .channel",
      comment_count: ".comment, .reply, .discuss",
      reading_time: ".reading-time, .read-time",
      word_count: ".word-count, .length"
    };

    return PREDEFINED_METADATA_FIELDS.map(field => ({
      ...field,
      selector: defaultSelectors[field.key as keyof typeof defaultSelectors] || '',
      enabled: DEFAULT_ENABLED_FIELDS.includes(field.key)
    }));
  }

  /**
   * 创建特定网站的元信息字段
   */
  private static createSiteMetadataFields(siteSelectors: Record<string, string>, enabledFields: string[] = DEFAULT_ENABLED_FIELDS): WebChatMetadataField[] {
    return PREDEFINED_METADATA_FIELDS.map(field => ({
      ...field,
      selector: siteSelectors[field.key] || '',
      enabled: enabledFields.includes(field.key)
    }));
  }

  /**
   * 获取默认配置 v2.0 - 移除preserve，增加metadata
   */
  static getDefaultConfig(): WebChatExtractionConfig {
    return {
      version: "2.0",
      mode: "readability",
      global: {
        remove: [
          // 基础元素过滤（script和style在代码中硬编码移除）
          "noscript",        // 通常是"请启用JavaScript"的提示
          "iframe",          // 默认移除，但用户可根据需要保留（如视频、地图）
          "object",          // Flash时代遗留，现在很少使用
          "embed",           // 多媒体嵌入，用户可选择保留
          // 常见噪音元素
          ".ad",
          ".sidebar",
          "nav",
          "footer",
          ".comment-section",
          ".related-posts"
        ],
        metadata: {
          enabled: true,
          selectors: WebContentConfigManager.createDefaultMetadataFields(),
          format: {
            template: "作者: {author}\n发布时间: {date}\n标签: {tags}",
            separator: ", ",
            includeEmpty: false
          }
        },
        readabilityOptions: {
          charThreshold: 50,
          keepClasses: true,
          preserveLinks: false,
          maxElemsToDivide: 5
        }
      },
      domains: {
        "zhihu.com": {
          name: "知乎",
          remove: [
            ".RichContent-ad",
            ".Sticky",
            ".TopstoryPageHeader",
            ".Card-ad"
          ],
          metadata: {
            enabled: true,
            selectors: WebContentConfigManager.createSiteMetadataFields({
              author: ".AuthorInfo-name",
              date: ".ContentItem-time",
              tags: ".Tag",
              votes: ".VoteButton-count",
              views: ".ViewCount",
              comment_count: ".CommentCount"
            }, ['author', 'date', 'tags', 'votes']),
            format: {
              template: "来源: 知乎\n作者: {author}\n发布时间: {date}\n标签: {tags}\n点赞数: {votes}",
              separator: ", ",
              includeEmpty: false
            }
          },
          readabilityOptions: {
            charThreshold: 20
          }
        },
        "csdn.net": {
          name: "CSDN",
          remove: [
            ".tool-box",
            ".comment-box",
            "#recommend-box",
            ".csdn-side-toolbar"
          ],
          metadata: {
            enabled: true,
            selectors: WebContentConfigManager.createSiteMetadataFields({
              author: ".nick-name",
              date: ".time",
              tags: ".tags"
            }),
            format: {
              template: "来源: CSDN\n作者: {author}\n发布时间: {date}\n标签: {tags}",
              separator: ", ",
              includeEmpty: false
            }
          }
        },
        "jianshu.com": {
          name: "简书",
          remove: [
            ".note-promotion",
            ".side-tool",
            ".recommended-notes"
          ],
          metadata: {
            enabled: true,
            selectors: WebContentConfigManager.createSiteMetadataFields({
              author: ".author",
              date: ".publish-time",
              word_count: ".wordage"
            }),
            format: {
              template: "来源: 简书\n作者: {author}\n发布时间: {date}\n字数: {word_count}",
              separator: ", ",
              includeEmpty: false
            }
          }
        }
      },
      templates: {
        "text-mode": {
          "simple": {
            name: "简单清理",
            description: "适用于简单页面的基础清理",
            mode: "text",
            global: {
              remove: [".ad", ".sidebar", "nav", "footer"]
            }
          },
          "aggressive": {
            name: "深度清理",
            description: "适用于复杂页面的深度清理",
            mode: "text",
            global: {
              remove: [".ad", ".sidebar", "nav", "footer", ".related", ".comment", "aside", ".widget"]
            }
          }
        },
        "readability-mode": {
          "news": {
            name: "新闻网站",
            description: "适用于新闻门户网站",
            mode: "readability",
            global: {
              remove: [".ad", ".sidebar", ".related", ".hot-news"],
              metadata: {
                enabled: true,
                selectors: WebContentConfigManager.createSiteMetadataFields({
                  author: ".author, .reporter, .writer",
                  date: ".publish-time, .date, .time",
                  tags: ".tags, .category, .section"
                }),
                format: {
                  template: "来源: 新闻网站\n作者: {author}\n发布时间: {date}\n分类: {tags}",
                  separator: ", ",
                  includeEmpty: false
                }
              }
            }
          },
          "blog": {
            name: "个人博客",
            description: "适用于个人博客和技术博客",
            mode: "readability",
            global: {
              remove: [".widget", ".sidebar", "aside"],
              metadata: {
                enabled: true,
                selectors: WebContentConfigManager.createSiteMetadataFields({
                  author: ".author, .writer",
                  date: ".date, .publish-time",
                  tags: ".tags, .categories"
                }),
                format: {
                  template: "来源: 个人博客\n作者: {author}\n发布时间: {date}\n标签: {tags}",
                  separator: ", ",
                  includeEmpty: false
                }
              }
            }
          },
          "tech": {
            name: "技术文档",
            description: "适用于技术文档和API文档",
            mode: "readability",
            global: {
              remove: [".sidebar", ".toc", ".navigation"],
              metadata: {
                enabled: true,
                selectors: WebContentConfigManager.createSiteMetadataFields({
                  author: ".author, .maintainer",
                  date: ".updated, .modified, .date",
                  tags: ".version, .category"
                }),
                format: {
                  template: "来源: 技术文档\n作者: {author}\n更新时间: {date}\n版本: {tags}",
                  separator: ", ",
                  includeEmpty: false
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<WebChatExtractionConfig> {
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'get-storage',
        payload: { keys: [this.STORAGE_KEY] }
      });

      if (result?.[this.STORAGE_KEY]) {
        this.config = this.validateAndMigrateConfig(result[this.STORAGE_KEY]);
      } else {
        this.config = WebContentConfigManager.getDefaultConfig();
      }

      return this.config;
    } catch (error) {
      console.error('Failed to load web content config:', error);
      this.config = WebContentConfigManager.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(config: WebChatExtractionConfig): Promise<void> {
    try {
      const validatedConfig = this.validateAndMigrateConfig(config);
      
      await chrome.runtime.sendMessage({
        type: 'set-storage',
        payload: { [this.STORAGE_KEY]: validatedConfig }
      });

      this.config = validatedConfig;
    } catch (error) {
      console.error('Failed to save web content config:', error);
      throw error;
    }
  }

  /**
   * 获取当前配置
   */
  async getConfig(): Promise<WebChatExtractionConfig> {
    if (!this.config) {
      return await this.loadConfig();
    }
    return this.config;
  }

  /**
   * 获取合并后的配置 v2.0 - 移除preserve，增加metadata合并
   * 配置解析优先级：域名特定配置 > 全局配置 > 默认配置
   */
  async getMergedConfig(domain: string): Promise<MergedExtractionConfig> {
    const config = await this.getConfig();
    const normalizedDomain = this.normalizeDomain(domain);
    const domainRule = config.domains[normalizedDomain];

    console.log('⚙️ SlimPaneAI: 开始合并配置 v2.0');
    console.log('⚙️ SlimPaneAI: 原始域名:', domain);
    console.log('⚙️ SlimPaneAI: 标准化域名:', normalizedDomain);
    console.log('⚙️ SlimPaneAI: 提取模式:', config.mode);
    console.log('⚙️ SlimPaneAI: 找到域名规则:', !!domainRule);
    if (domainRule) {
      console.log('⚙️ SlimPaneAI: 域名规则详情:', domainRule);
    }

    // remove选择器：域名配置 + 全局配置
    const mergedRemove = [
      ...config.global.remove,
      ...(domainRule?.remove || [])
    ];

    // metadata配置：域名配置优先，全局配置补充（仅Readability模式）
    let mergedMetadata: WebChatMetadataConfig | undefined;
    if (config.mode === 'readability') {
      if (domainRule?.metadata) {
        // 域名有metadata配置，使用域名配置
        mergedMetadata = domainRule.metadata;
      } else if (config.global.metadata) {
        // 域名没有，使用全局配置
        mergedMetadata = config.global.metadata;
      }
    }

    // Readability参数：域名配置覆盖全局配置
    const mergedReadabilityOptions = {
      ...config.global.readabilityOptions,
      ...domainRule?.readabilityOptions
    };

    const mergedConfig = {
      mode: config.mode,
      remove: mergedRemove,
      metadata: mergedMetadata,
      readabilityOptions: mergedReadabilityOptions
    };

    console.log('✅ SlimPaneAI: 配置合并完成 v2.0');
    console.log('⚙️ SlimPaneAI: 最终配置:', mergedConfig);

    return mergedConfig;
  }

  /**
   * 验证配置
   */
  validateConfig(config: WebChatExtractionConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本结构
    if (!config.version) errors.push('配置版本缺失');
    if (!config.mode || !['text', 'readability'].includes(config.mode)) {
      errors.push('无效的提取模式');
    }
    if (!config.global) errors.push('全局配置缺失');

    // 验证选择器
    if (config.global?.remove) {
      config.global.remove.forEach((selector, index) => {
        if (!this.isValidSelector(selector)) {
          warnings.push(`全局移除选择器 ${index + 1} 可能无效: ${selector}`);
        }
      });
    }

    // 验证元信息配置（仅Readability模式）
    if (config.mode === 'readability' && config.global?.metadata?.enabled) {
      const metadata = config.global.metadata;
      if (metadata.selectors) {
        Object.entries(metadata.selectors).forEach(([key, selector]) => {
          if (selector && !this.isValidSelector(selector)) {
            warnings.push(`全局元信息选择器 ${key} 可能无效: ${selector}`);
          }
        });
      }
    }

    // 验证域名规则
    if (config.domains) {
      Object.entries(config.domains).forEach(([domain, rule]) => {
        if (!this.isValidDomain(domain)) {
          warnings.push(`域名格式可能无效: ${domain}`);
        }

        rule.remove?.forEach((selector, index) => {
          if (!this.isValidSelector(selector)) {
            warnings.push(`域名 ${domain} 移除选择器 ${index + 1} 可能无效: ${selector}`);
          }
        });

        // 验证域名的元信息配置
        if (rule.metadata?.enabled && rule.metadata.selectors) {
          Object.entries(rule.metadata.selectors).forEach(([key, selector]) => {
            if (selector && !this.isValidSelector(selector)) {
              warnings.push(`域名 ${domain} 元信息选择器 ${key} 可能无效: ${selector}`);
            }
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证和迁移配置
   */
  private validateAndMigrateConfig(config: any): WebChatExtractionConfig {
    const defaultConfig = WebContentConfigManager.getDefaultConfig();

    if (!config || typeof config !== 'object') {
      return defaultConfig;
    }

    // 版本迁移
    if (!config.version || config.version !== defaultConfig.version) {
      console.log('Migrating web content config to version', defaultConfig.version);
    }

    return {
      version: defaultConfig.version,
      mode: this.validateMode(config.mode) || defaultConfig.mode,
      global: {
        remove: this.validateStringArray(config.global?.remove) || defaultConfig.global.remove,
        metadata: this.validateMetadata(config.global?.metadata) || defaultConfig.global.metadata,
        readabilityOptions: this.validateReadabilityOptions(config.global?.readabilityOptions) || defaultConfig.global.readabilityOptions
      },
      domains: this.validateDomains(config.domains) || defaultConfig.domains,
      templates: this.validateTemplates(config.templates) || defaultConfig.templates
    };
  }

  /**
   * 验证提取模式
   */
  private validateMode(mode: any): WebChatExtractionMode | null {
    return (mode === 'text' || mode === 'readability') ? mode : null;
  }

  /**
   * 验证字符串数组
   */
  private validateStringArray(arr: any): string[] | null {
    if (!Array.isArray(arr)) return null;
    return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
  }

  /**
   * 验证Readability选项
   */
  private validateReadabilityOptions(options: any): any | null {
    if (!options || typeof options !== 'object') return null;
    
    return {
      charThreshold: typeof options.charThreshold === 'number' ? options.charThreshold : 50,
      keepClasses: typeof options.keepClasses === 'boolean' ? options.keepClasses : true,
      preserveLinks: typeof options.preserveLinks === 'boolean' ? options.preserveLinks : false,
      maxElemsToDivide: typeof options.maxElemsToDivide === 'number' ? options.maxElemsToDivide : 5,
      classesToPreserve: this.validateStringArray(options.classesToPreserve) || []
    };
  }

  /**
   * 验证元信息配置
   */
  private validateMetadata(metadata: any): WebChatMetadataConfig | undefined {
    if (!metadata || typeof metadata !== 'object') return undefined;

    // 验证选择器，如果无效则使用默认字段
    let selectors = this.validateMetadataSelectors(metadata.selectors);
    if (!selectors || (Array.isArray(selectors) && selectors.length === 0) ||
        (typeof selectors === 'object' && Object.keys(selectors).length === 0)) {
      console.log('🔧 元信息选择器无效，使用默认字段');
      selectors = WebContentConfigManager.createDefaultMetadataFields();
    }

    return {
      enabled: typeof metadata.enabled === 'boolean' ? metadata.enabled : false,
      selectors: selectors,
      format: this.validateMetadataFormat(metadata.format) || {
        template: "作者: {author}\n发布时间: {date}\n标签: {tags}",
        separator: ", ",
        includeEmpty: false
      }
    };
  }

  /**
   * 验证元信息选择器（支持新的字段数组格式）
   */
  private validateMetadataSelectors(selectors: any): WebChatMetadataField[] | Record<string, string> | null {
    if (!selectors) return null;

    // 如果是数组格式（新格式）
    if (Array.isArray(selectors)) {
      const validatedFields: WebChatMetadataField[] = [];
      for (const field of selectors) {
        if (field && typeof field === 'object' &&
            typeof field.key === 'string' &&
            typeof field.name === 'string' &&
            typeof field.selector === 'string' &&
            typeof field.enabled === 'boolean' &&
            typeof field.isPredefined === 'boolean') {
          validatedFields.push({
            key: field.key,
            name: field.name,
            selector: field.selector.trim(),
            enabled: field.enabled,
            isPredefined: field.isPredefined
          });
        }
      }
      return validatedFields.length > 0 ? validatedFields : null;
    }

    // 如果是对象格式（旧格式）
    if (typeof selectors === 'object') {
      const validatedSelectors: Record<string, string> = {};
      for (const [key, value] of Object.entries(selectors)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          validatedSelectors[key] = value.trim();
        }
      }
      return Object.keys(validatedSelectors).length > 0 ? validatedSelectors : null;
    }

    return null;
  }

  /**
   * 验证元信息格式配置
   */
  private validateMetadataFormat(format: any): any | null {
    if (!format || typeof format !== 'object') return null;

    return {
      template: typeof format.template === 'string' ? format.template : "作者: {author}\n发布时间: {date}\n标签: {tags}",
      separator: typeof format.separator === 'string' ? format.separator : ", ",
      includeEmpty: typeof format.includeEmpty === 'boolean' ? format.includeEmpty : false
    };
  }

  /**
   * 验证域名规则 v2.0
   */
  private validateDomains(domains: any): Record<string, WebChatDomainRule> | null {
    if (!domains || typeof domains !== 'object') return null;

    const validatedDomains: Record<string, WebChatDomainRule> = {};

    for (const [domain, rule] of Object.entries(domains)) {
      if (typeof rule === 'object' && rule !== null) {
        const typedRule = rule as any;
        validatedDomains[domain] = {
          name: typeof typedRule.name === 'string' ? typedRule.name : domain,
          remove: this.validateStringArray(typedRule.remove) || [],
          metadata: this.validateMetadata(typedRule.metadata),
          readabilityOptions: this.validateReadabilityOptions(typedRule.readabilityOptions) || undefined
        };
      }
    }

    return validatedDomains;
  }

  /**
   * 验证模板 v2.0（按模式分类）
   */
  private validateTemplates(templates: any): any | null {
    if (!templates || typeof templates !== 'object') return null;

    const validatedTemplates: any = {
      "text-mode": {},
      "readability-mode": {}
    };

    // 处理新格式（按模式分类）
    if (templates["text-mode"] || templates["readability-mode"]) {
      if (templates["text-mode"]) {
        validatedTemplates["text-mode"] = this.validateModeTemplates(templates["text-mode"], "text");
      }
      if (templates["readability-mode"]) {
        validatedTemplates["readability-mode"] = this.validateModeTemplates(templates["readability-mode"], "readability");
      }
    } else {
      // 处理旧格式（兼容性处理）
      for (const [key, template] of Object.entries(templates)) {
        if (typeof template === 'object' && template !== null) {
          const typedTemplate = template as any;
          if (typedTemplate.name && typedTemplate.global) {
            // 默认归类到readability模式
            validatedTemplates["readability-mode"][key] = {
              name: typedTemplate.name,
              description: typedTemplate.description || '',
              mode: "readability",
              global: {
                remove: this.validateStringArray(typedTemplate.global.remove) || [],
                metadata: this.validateMetadata(typedTemplate.global.metadata)
              }
            };
          }
        }
      }
    }

    return validatedTemplates;
  }

  /**
   * 验证特定模式的模板
   */
  private validateModeTemplates(templates: any, mode: WebChatExtractionMode): Record<string, WebChatConfigTemplate> {
    const validatedTemplates: Record<string, WebChatConfigTemplate> = {};

    for (const [key, template] of Object.entries(templates)) {
      if (typeof template === 'object' && template !== null) {
        const typedTemplate = template as any;
        if (typedTemplate.name && typedTemplate.global) {
          validatedTemplates[key] = {
            name: typedTemplate.name,
            description: typedTemplate.description || '',
            mode: mode,
            global: {
              remove: this.validateStringArray(typedTemplate.global.remove) || [],
              metadata: mode === 'readability' ? this.validateMetadata(typedTemplate.global.metadata) : undefined
            }
          };
        }
      }
    }

    return validatedTemplates;
  }

  /**
   * 验证CSS选择器
   */
  private isValidSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证域名格式
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  /**
   * 标准化域名
   */
  private normalizeDomain(domain: string): string {
    return domain.replace(/^www\./, '').toLowerCase();
  }
}

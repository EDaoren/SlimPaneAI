/**
 * 域名管理器
 * V1.0版本功能：域名特定规则管理
 */

import type {
  WebChatDomainRule,
  DomainRuleOperationResult,
  WebChatExtractionConfig,
  WebChatMetadataField
} from '@/types/web-content-config';
import { WebContentConfigManager } from './config-manager';

export class WebContentDomainManager {
  
  /**
   * 添加域名规则
   */
  static async addDomainRule(domain: string, rule: WebChatDomainRule): Promise<DomainRuleOperationResult> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      
      // 标准化域名
      const normalizedDomain = this.normalizeDomain(domain);
      
      // 检查域名是否已存在
      if (config.domains[normalizedDomain]) {
        return {
          success: false,
          domain: normalizedDomain,
          operation: 'add',
          error: '域名规则已存在，请使用更新操作'
        };
      }
      
      // 验证规则
      const validationResult = this.validateDomainRule(rule);
      if (!validationResult.isValid) {
        return {
          success: false,
          domain: normalizedDomain,
          operation: 'add',
          error: `规则验证失败: ${validationResult.errors.join(', ')}`
        };
      }
      
      // 添加规则
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        domains: {
          ...config.domains,
          [normalizedDomain]: rule
        }
      };
      
      await configManager.saveConfig(updatedConfig);
      
      return {
        success: true,
        domain: normalizedDomain,
        operation: 'add'
      };
    } catch (error) {
      return {
        success: false,
        domain,
        operation: 'add',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新域名规则
   */
  static async updateDomainRule(domain: string, rule: WebChatDomainRule): Promise<DomainRuleOperationResult> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      
      const normalizedDomain = this.normalizeDomain(domain);
      
      // 检查域名是否存在
      if (!config.domains[normalizedDomain]) {
        return {
          success: false,
          domain: normalizedDomain,
          operation: 'update',
          error: '域名规则不存在，请先添加'
        };
      }
      
      // 验证规则
      const validationResult = this.validateDomainRule(rule);
      if (!validationResult.isValid) {
        return {
          success: false,
          domain: normalizedDomain,
          operation: 'update',
          error: `规则验证失败: ${validationResult.errors.join(', ')}`
        };
      }
      
      // 更新规则
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        domains: {
          ...config.domains,
          [normalizedDomain]: rule
        }
      };
      
      await configManager.saveConfig(updatedConfig);
      
      return {
        success: true,
        domain: normalizedDomain,
        operation: 'update'
      };
    } catch (error) {
      return {
        success: false,
        domain,
        operation: 'update',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除域名规则
   */
  static async deleteDomainRule(domain: string): Promise<DomainRuleOperationResult> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      
      const normalizedDomain = this.normalizeDomain(domain);
      
      // 检查域名是否存在
      if (!config.domains[normalizedDomain]) {
        return {
          success: false,
          domain: normalizedDomain,
          operation: 'delete',
          error: '域名规则不存在'
        };
      }
      
      // 删除规则
      const { [normalizedDomain]: deletedRule, ...remainingDomains } = config.domains;
      
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        domains: remainingDomains
      };
      
      await configManager.saveConfig(updatedConfig);
      
      return {
        success: true,
        domain: normalizedDomain,
        operation: 'delete'
      };
    } catch (error) {
      return {
        success: false,
        domain,
        operation: 'delete',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取域名规则
   */
  static async getDomainRule(domain: string): Promise<WebChatDomainRule | null> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      
      const normalizedDomain = this.normalizeDomain(domain);
      return config.domains[normalizedDomain] || null;
    } catch (error) {
      console.error('Failed to get domain rule:', error);
      return null;
    }
  }

  /**
   * 获取所有域名规则
   */
  static async getAllDomainRules(): Promise<Record<string, WebChatDomainRule>> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      return config.domains;
    } catch (error) {
      console.error('Failed to get all domain rules:', error);
      return {};
    }
  }

  /**
   * 批量导入域名规则
   */
  static async importDomainRules(rules: Record<string, WebChatDomainRule>): Promise<{
    success: boolean;
    imported: number;
    failed: Array<{ domain: string; error: string }>;
  }> {
    const results = {
      success: true,
      imported: 0,
      failed: [] as Array<{ domain: string; error: string }>
    };

    for (const [domain, rule] of Object.entries(rules)) {
      try {
        const result = await this.addDomainRule(domain, rule);
        if (result.success) {
          results.imported++;
        } else {
          results.failed.push({ domain, error: result.error || '未知错误' });
        }
      } catch (error) {
        results.failed.push({ 
          domain, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }

    results.success = results.failed.length === 0;
    return results;
  }

  /**
   * 验证域名规则 v2.0
   */
  private static validateDomainRule(rule: WebChatDomainRule): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证名称
    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim().length === 0) {
      errors.push('域名显示名称不能为空');
    }

    // 验证移除选择器
    if (!Array.isArray(rule.remove)) {
      errors.push('移除选择器必须是数组');
    } else {
      rule.remove.forEach((selector, index) => {
        if (typeof selector !== 'string' || selector.trim().length === 0) {
          errors.push(`移除选择器 ${index + 1} 无效`);
        } else if (!this.isValidSelector(selector)) {
          errors.push(`移除选择器 ${index + 1} 语法无效: ${selector}`);
        }
      });
    }

    // 验证元信息配置（v2.0新增）
    if (rule.metadata) {
      if (typeof rule.metadata !== 'object') {
        errors.push('元信息配置必须是对象');
      } else {
        if (rule.metadata.enabled && rule.metadata.selectors) {
          this.validateMetadataSelectorsInRule(rule.metadata.selectors, errors);
        }
      }
    }

    // 验证Readability选项
    if (rule.readabilityOptions) {
      const options = rule.readabilityOptions;

      if (options.charThreshold !== undefined) {
        if (typeof options.charThreshold !== 'number' || options.charThreshold < 0) {
          errors.push('字符阈值必须是非负数');
        }
      }

      if (options.maxElemsToDivide !== undefined) {
        if (typeof options.maxElemsToDivide !== 'number' || options.maxElemsToDivide < 1) {
          errors.push('最大元素分割数必须是正整数');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证元信息选择器配置（支持新旧格式）
   */
  private static validateMetadataSelectorsInRule(
    selectors: any,
    errors: string[]
  ): void {
    if (Array.isArray(selectors)) {
      // 新格式：字段数组
      if (selectors.length === 0) {
        // 空数组是允许的，不产生错误
        return;
      }

      selectors.forEach((field, index) => {
        if (field && typeof field === 'object') {
          // 检查必要字段
          if (!field.key || typeof field.key !== 'string') {
            errors.push(`元信息选择器 ${index} 配置无效: 缺少字段键名`);
            return;
          }
          if (!field.name || typeof field.name !== 'string') {
            errors.push(`元信息选择器 ${index} (${field.key}) 配置无效: 缺少字段名称`);
            return;
          }
          if (typeof field.enabled !== 'boolean') {
            errors.push(`元信息选择器 ${index} (${field.key}) 配置无效: enabled字段必须是布尔值`);
            return;
          }

          // 只有启用的字段才需要验证选择器
          if (field.enabled) {
            if (!field.selector || typeof field.selector !== 'string') {
              errors.push(`元信息选择器 ${index} (${field.name}) 配置无效: 启用的字段必须有选择器`);
            } else if (!this.isValidSelector(field.selector)) {
              errors.push(`元信息选择器 ${index} (${field.name}) 语法无效: ${field.selector}`);
            }
          }
        } else {
          errors.push(`元信息选择器 ${index} 配置无效: 字段必须是对象`);
        }
      });
    } else if (typeof selectors === 'object' && selectors !== null) {
      // 旧格式：键值对对象
      Object.entries(selectors).forEach(([key, selector]) => {
        if (selector && typeof selector === 'string') {
          if (!this.isValidSelector(selector)) {
            errors.push(`元信息选择器 ${key} 语法无效: ${selector}`);
          }
        } else {
          errors.push(`元信息选择器 ${key} 配置无效: 选择器必须是字符串`);
        }
      });
    }
  }

  /**
   * 验证CSS选择器
   */
  private static isValidSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 标准化域名
   */
  private static normalizeDomain(domain: string): string {
    return domain.replace(/^www\./, '').toLowerCase().trim();
  }

  /**
   * 从当前URL推荐域名规则
   */
  static suggestDomainRuleFromCurrentPage(): {
    domain: string;
    suggestedRule: Partial<WebChatDomainRule>;
  } | null {
    try {
      const domain = this.normalizeDomain(window.location.hostname);
      
      // 分析页面结构，提供建议
      const suggestedRemove: string[] = [];

      // 常见的广告和导航元素
      const commonAdSelectors = ['.ad', '.ads', '.advertisement', 'nav', 'header', 'footer', '.sidebar'];
      commonAdSelectors.forEach(selector => {
        if (document.querySelector(selector)) {
          suggestedRemove.push(selector);
        }
      });

      // 分析常见的元信息元素，生成元信息配置建议
      const metadataFields: { key: string; name: string; selector: string }[] = [];
      const commonMetadataSelectors = [
        { key: 'author', name: '作者信息', selectors: ['.author', '.username', '.nick-name', '.AuthorInfo-name'] },
        { key: 'date', name: '发布时间', selectors: ['.date', '.time', '.publish-time', '.ContentItem-time'] },
        { key: 'tags', name: '标签分类', selectors: ['.tags', '.tag', '.category', '.Tag'] }
      ];

      commonMetadataSelectors.forEach(({ key, name, selectors }) => {
        const foundSelector = selectors.find(selector => document.querySelector(selector));
        if (foundSelector) {
          metadataFields.push({ key, name, selector: foundSelector });
        }
      });

      return {
        domain,
        suggestedRule: {
          name: domain,
          remove: suggestedRemove,
          // 如果找到了元信息元素，生成元信息配置建议
          ...(metadataFields.length > 0 && {
            metadata: {
              enabled: true,
              selectors: metadataFields.map(field => ({
                ...field,
                enabled: true,
                isPredefined: true
              })),
              format: {
                template: metadataFields.map(field => `${field.name}: {${field.key}}`).join('\n'),
                separator: '\n',
                includeEmpty: false
              }
            }
          })
        }
      };
    } catch (error) {
      console.error('Failed to suggest domain rule:', error);
      return null;
    }
  }
}

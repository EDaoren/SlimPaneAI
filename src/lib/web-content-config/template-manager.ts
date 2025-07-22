/**
 * 模板管理器
 * V1.0版本功能：预设模板系统
 */

import type {
  WebChatConfigTemplate,
  TemplateApplyResult,
  WebChatExtractionConfig
} from '@/types/web-content-config';
import { WebContentConfigManager } from './config-manager';

export class WebContentTemplateManager {
  
  /**
   * 应用模板到全局配置 v2.0
   */
  static async applyTemplate(templateKey: string): Promise<TemplateApplyResult> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();

      // v2.0: 需要在两个模式中查找模板
      let template: WebChatConfigTemplate | null = null;
      let foundMode: 'text' | 'readability' | null = null;

      if (config.templates['text-mode'][templateKey]) {
        template = config.templates['text-mode'][templateKey];
        foundMode = 'text';
      } else if (config.templates['readability-mode'][templateKey]) {
        template = config.templates['readability-mode'][templateKey];
        foundMode = 'readability';
      }

      if (!template || !foundMode) {
        return {
          success: false,
          appliedTemplate: templateKey,
          changes: { globalRemove: [], metadata: undefined }
        };
      }

      // 记录变更 v2.0
      const changes = {
        globalRemove: template.global.remove,
        metadata: template.global.metadata
      };

      // 应用模板到全局配置 v2.0
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        mode: foundMode, // 应用模板对应的模式
        global: {
          ...config.global,
          remove: [...template.global.remove],
          metadata: template.global.metadata ? { ...template.global.metadata } :
                   (foundMode === 'readability' ? config.global.metadata : undefined),
          readabilityOptions: {
            ...config.global.readabilityOptions
          }
        }
      };

      await configManager.saveConfig(updatedConfig);

      return {
        success: true,
        appliedTemplate: templateKey,
        changes
      };
    } catch (error) {
      console.error('Failed to apply template:', error);
      return {
        success: false,
        appliedTemplate: templateKey,
        changes: { globalRemove: [], globalPreserve: [] }
      };
    }
  }

  /**
   * 保存当前配置为模板 v2.0
   */
  static async saveAsTemplate(
    key: string,
    name: string,
    description: string,
    mode: 'text' | 'readability'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();

      // 验证模板键
      if (!key || key.trim().length === 0) {
        return { success: false, error: '模板键不能为空' };
      }

      // 验证模板名称
      if (!name || name.trim().length === 0) {
        return { success: false, error: '模板名称不能为空' };
      }

      // 确定模板分类
      const modeKey = mode === 'text' ? 'text-mode' : 'readability-mode';

      // 检查模板键是否已存在
      if (config.templates[modeKey] && config.templates[modeKey][key]) {
        return { success: false, error: '模板键已存在，请使用不同的键' };
      }

      // 创建新模板 v2.0
      const newTemplate: WebChatConfigTemplate = {
        name: name.trim(),
        description: description.trim(),
        mode: mode,
        global: {
          remove: [...config.global.remove],
          metadata: mode === 'readability' && config.global.metadata ?
            { ...config.global.metadata } : undefined
        }
      };

      // 保存模板到对应模式分类
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        templates: {
          ...config.templates,
          [modeKey]: {
            ...config.templates[modeKey],
            [key]: newTemplate
          }
        }
      };

      await configManager.saveConfig(updatedConfig);

      return { success: true };
    } catch (error) {
      console.error('Failed to save template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除模板 v2.0
   */
  static async deleteTemplate(
    templateKey: string,
    mode: 'text' | 'readability'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();

      const modeKey = mode === 'text' ? 'text-mode' : 'readability-mode';

      // 检查模板是否存在
      if (!config.templates[modeKey] || !config.templates[modeKey][templateKey]) {
        return { success: false, error: '模板不存在' };
      }

      // 删除模板
      const { [templateKey]: deletedTemplate, ...remainingTemplates } = config.templates[modeKey];

      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        templates: {
          ...config.templates,
          [modeKey]: remainingTemplates
        }
      };

      await configManager.saveConfig(updatedConfig);

      return { success: true };
    } catch (error) {
      console.error('Failed to delete template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新模板
   */
  static async updateTemplate(
    key: string,
    name: string,
    description: string,
    globalConfig: { remove: string[]; preserve: string[] }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();

      // 检查模板是否存在
      if (!config.templates[key]) {
        return { success: false, error: '模板不存在' };
      }

      // 验证参数
      if (!name || name.trim().length === 0) {
        return { success: false, error: '模板名称不能为空' };
      }

      // 更新模板
      const updatedTemplate: WebChatConfigTemplate = {
        name: name.trim(),
        description: description.trim(),
        global: {
          remove: [...globalConfig.remove],
          preserve: [...globalConfig.preserve]
        }
      };

      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        templates: {
          ...config.templates,
          [key]: updatedTemplate
        }
      };

      await configManager.saveConfig(updatedConfig);

      return { success: true };
    } catch (error) {
      console.error('Failed to update template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 获取所有模板 v2.0（按模式分类）
   */
  static async getAllTemplates(): Promise<{
    "text-mode": Record<string, WebChatConfigTemplate>;
    "readability-mode": Record<string, WebChatConfigTemplate>;
  }> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      return config.templates;
    } catch (error) {
      console.error('Failed to get templates:', error);
      return {
        "text-mode": {},
        "readability-mode": {}
      };
    }
  }

  /**
   * 获取特定模式的模板
   */
  static async getTemplatesByMode(mode: 'text' | 'readability'): Promise<Record<string, WebChatConfigTemplate>> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      const modeKey = mode === 'text' ? 'text-mode' : 'readability-mode';
      return config.templates[modeKey] || {};
    } catch (error) {
      console.error('Failed to get templates by mode:', error);
      return {};
    }
  }

  /**
   * 获取特定模板 v2.0
   */
  static async getTemplate(
    templateKey: string,
    mode: 'text' | 'readability'
  ): Promise<WebChatConfigTemplate | null> {
    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();
      const modeKey = mode === 'text' ? 'text-mode' : 'readability-mode';
      return config.templates[modeKey]?.[templateKey] || null;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * 导入模板
   */
  static async importTemplates(templates: Record<string, WebChatConfigTemplate>): Promise<{
    success: boolean;
    imported: number;
    failed: Array<{ key: string; error: string }>;
  }> {
    const results = {
      success: true,
      imported: 0,
      failed: [] as Array<{ key: string; error: string }>
    };

    try {
      const configManager = WebContentConfigManager.getInstance();
      const config = await configManager.getConfig();

      const updatedTemplates = { ...config.templates };

      for (const [key, template] of Object.entries(templates)) {
        try {
          // 验证模板
          const validationResult = this.validateTemplate(template);
          if (!validationResult.isValid) {
            results.failed.push({ 
              key, 
              error: `模板验证失败: ${validationResult.errors.join(', ')}` 
            });
            continue;
          }

          updatedTemplates[key] = template;
          results.imported++;
        } catch (error) {
          results.failed.push({ 
            key, 
            error: error instanceof Error ? error.message : '未知错误' 
          });
        }
      }

      // 保存更新后的配置
      const updatedConfig: WebChatExtractionConfig = {
        ...config,
        templates: updatedTemplates
      };

      await configManager.saveConfig(updatedConfig);

      results.success = results.failed.length === 0;
      return results;
    } catch (error) {
      console.error('Failed to import templates:', error);
      return {
        success: false,
        imported: 0,
        failed: [{ key: 'all', error: '导入失败' }]
      };
    }
  }

  /**
   * 导出模板
   */
  static async exportTemplates(): Promise<Record<string, WebChatConfigTemplate> | null> {
    try {
      return await this.getAllTemplates();
    } catch (error) {
      console.error('Failed to export templates:', error);
      return null;
    }
  }

  /**
   * 验证模板
   */
  private static validateTemplate(template: WebChatConfigTemplate): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];

    // 验证名称
    if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
      errors.push('模板名称不能为空');
    }

    // 验证描述
    if (template.description !== undefined && typeof template.description !== 'string') {
      errors.push('模板描述必须是字符串');
    }

    // 验证全局配置
    if (!template.global || typeof template.global !== 'object') {
      errors.push('模板必须包含全局配置');
    } else {
      // 验证移除选择器
      if (!Array.isArray(template.global.remove)) {
        errors.push('全局移除选择器必须是数组');
      } else {
        template.global.remove.forEach((selector, index) => {
          if (typeof selector !== 'string' || selector.trim().length === 0) {
            errors.push(`全局移除选择器 ${index + 1} 无效`);
          }
        });
      }

      // 验证保留选择器
      if (!Array.isArray(template.global.preserve)) {
        errors.push('全局保留选择器必须是数组');
      } else {
        template.global.preserve.forEach((selector, index) => {
          if (typeof selector !== 'string' || selector.trim().length === 0) {
            errors.push(`全局保留选择器 ${index + 1} 无效`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取推荐模板（基于当前域名）
   */
  static getRecommendedTemplates(domain: string): string[] {
    const domainLower = domain.toLowerCase();
    
    // 基于域名推荐模板
    if (domainLower.includes('news') || domainLower.includes('xinhua') || 
        domainLower.includes('sina') || domainLower.includes('163')) {
      return ['news'];
    }
    
    if (domainLower.includes('blog') || domainLower.includes('csdn') || 
        domainLower.includes('jianshu') || domainLower.includes('cnblogs')) {
      return ['blog', 'tech'];
    }
    
    if (domainLower.includes('github') || domainLower.includes('docs') || 
        domainLower.includes('api')) {
      return ['tech'];
    }
    
    // 默认推荐
    return ['blog', 'news'];
  }
}

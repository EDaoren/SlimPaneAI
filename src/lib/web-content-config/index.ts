/**
 * 网页内容配置模块入口
 * 严格按照设计文档实现的完整功能模块
 */

// 导出核心管理器 - 配置管理和预览功能
export { WebContentConfigManager } from './config-manager';
export { WebContentDomainManager } from './domain-manager';
export { WebContentTemplateManager } from './template-manager';
export { WebContentPreviewManager } from './preview-manager';

// 导出类型定义
export * from '@/types/web-content-config';

// 导出便捷函数 - 只负责配置相关的便捷操作
import { WebContentConfigManager } from './config-manager';

/**
 * 获取当前域名的配置
 */
export async function getCurrentDomainConfig() {
  try {
    const domain = extractDomain(window.location.href);
    return await WebContentConfigManager.getInstance().getMergedConfig(domain);
  } catch (error) {
    console.error('Failed to get current domain config:', error);
    return null;
  }
}

/**
 * 初始化配置系统
 */
export async function initializeWebContentConfig(): Promise<boolean> {
  try {
    const configManager = WebContentConfigManager.getInstance();
    await configManager.loadConfig();
    console.log('Web content config system initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize web content config system:', error);
    return false;
  }
}

/**
 * 提取域名的辅助函数
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// 全局配置管理器实例
export const webContentConfigManager = WebContentConfigManager.getInstance();

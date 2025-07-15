import type { DomainSettings, ContentExtractionSettings, StorageData } from '@/types';
import { getDefaultExtractionSettings } from '../content-extractor';

/**
 * 域名设置管理器
 * 负责管理不同域名的内容提取设置和偏好
 */
export class DomainSettingsManager {
  private cache: Map<string, DomainSettings> = new Map();
  private storageKey = 'domainSettings';

  /**
   * 获取指定域名的设置
   */
  async getDomainSettings(domain: string): Promise<DomainSettings> {
    // 先检查缓存
    if (this.cache.has(domain)) {
      return this.cache.get(domain)!;
    }

    // 从存储中加载
    const settings = await this.loadFromStorage(domain);
    this.cache.set(domain, settings);
    return settings;
  }

  /**
   * 保存域名设置
   */
  async saveDomainSettings(domain: string, settings: DomainSettings): Promise<void> {
    // 更新缓存
    this.cache.set(domain, settings);

    // 保存到存储
    await this.saveToStorage(domain, settings);
  }

  /**
   * 获取所有域名设置
   */
  async getAllDomainSettings(): Promise<{ [domain: string]: DomainSettings }> {
    const data = await chrome.storage.local.get(this.storageKey);
    return data[this.storageKey] || {};
  }

  /**
   * 删除域名设置
   */
  async deleteDomainSettings(domain: string): Promise<void> {
    // 从缓存中删除
    this.cache.delete(domain);

    // 从存储中删除
    const allSettings = await this.getAllDomainSettings();
    delete allSettings[domain];
    await chrome.storage.local.set({ [this.storageKey]: allSettings });
  }

  /**
   * 检查域名是否启用内容提取
   */
  async isDomainEnabled(domain: string): Promise<boolean> {
    const settings = await this.getDomainSettings(domain);
    return settings.enabled;
  }

  /**
   * 切换域名启用状态
   */
  async toggleDomainEnabled(domain: string): Promise<boolean> {
    const settings = await this.getDomainSettings(domain);
    settings.enabled = !settings.enabled;
    settings.lastUpdated = Date.now();
    await this.saveDomainSettings(domain, settings);
    return settings.enabled;
  }

  /**
   * 更新域名的提取设置
   */
  async updateExtractionSettings(
    domain: string, 
    extractionSettings: Partial<ContentExtractionSettings>
  ): Promise<void> {
    const settings = await this.getDomainSettings(domain);
    settings.extractionSettings = { ...settings.extractionSettings, ...extractionSettings };
    settings.lastUpdated = Date.now();
    await this.saveDomainSettings(domain, settings);
  }

  /**
   * 获取域名的智能设置建议
   */
  getSmartSettings(domain: string): Partial<ContentExtractionSettings> {
    const suggestions: { [key: string]: Partial<ContentExtractionSettings> } = {
      // 新闻网站
      'news.': {
        excludeSelectors: ['.related-articles', '.advertisement', '.social-share', '.comments'],
        includeSelectors: ['.article-content', '.post-content', 'article'],
        maxTokens: 12000
      },
      'cnn.com': {
        excludeSelectors: ['.related-content', '.ad-container', '.social-tools'],
        includeSelectors: ['.article__content', '.zn-body__paragraph']
      },
      'bbc.com': {
        excludeSelectors: ['.related-topics', '.media-placeholder'],
        includeSelectors: ['.story-body', '.article__content']
      },
      
      // 技术博客
      'medium.com': {
        includeSelectors: ['.article-content', '.postArticle-content'],
        excludeSelectors: ['.related-stories', '.footer']
      },
      'dev.to': {
        includeSelectors: ['.article-body'],
        excludeSelectors: ['.sidebar', '.comments']
      },
      'stackoverflow.com': {
        includeSelectors: ['.question', '.answer'],
        excludeSelectors: ['.sidebar', '.related-questions']
      },

      // 学术网站
      'arxiv.org': {
        includeSelectors: ['.abstract', '.full-text'],
        maxTokens: 20000
      },
      'scholar.google.com': {
        includeSelectors: ['.gs_rs'],
        excludeSelectors: ['.gs_md_wp', '.gs_fl']
      },

      // 文档网站
      'github.com': {
        includeSelectors: ['.markdown-body', '.readme'],
        excludeSelectors: ['.header', '.footer', '.sidebar']
      },
      'docs.': {
        includeSelectors: ['.content', '.documentation'],
        excludeSelectors: ['.navigation', '.toc']
      },

      // 电商网站
      'amazon.': {
        includeSelectors: ['.product-title', '.product-description', '.reviews'],
        excludeSelectors: ['.recommendations', '.ads']
      },

      // 社交媒体
      'twitter.com': {
        includeSelectors: ['.tweet-text', '.thread'],
        excludeSelectors: ['.sidebar', '.trends']
      },
      'reddit.com': {
        includeSelectors: ['.post-content', '.comment'],
        excludeSelectors: ['.sidebar', '.related-posts']
      }
    };

    // 查找匹配的域名设置
    for (const [pattern, settings] of Object.entries(suggestions)) {
      if (domain.includes(pattern) || pattern.includes(domain)) {
        return settings;
      }
    }

    // 返回默认设置
    return {};
  }

  /**
   * 应用智能设置
   */
  async applySmartSettings(domain: string): Promise<void> {
    const smartSettings = this.getSmartSettings(domain);
    if (Object.keys(smartSettings).length > 0) {
      await this.updateExtractionSettings(domain, smartSettings);
    }
  }

  /**
   * 从存储中加载域名设置
   */
  private async loadFromStorage(domain: string): Promise<DomainSettings> {
    const allSettings = await this.getAllDomainSettings();
    
    if (allSettings[domain]) {
      return allSettings[domain];
    }

    // 创建默认设置
    const defaultSettings: DomainSettings = {
      domain,
      enabled: true,
      extractionSettings: getDefaultExtractionSettings(),
      lastUpdated: Date.now()
    };

    // 应用智能设置
    const smartSettings = this.getSmartSettings(domain);
    if (Object.keys(smartSettings).length > 0) {
      defaultSettings.extractionSettings = {
        ...defaultSettings.extractionSettings,
        ...smartSettings
      };
    }

    return defaultSettings;
  }

  /**
   * 保存到存储
   */
  private async saveToStorage(domain: string, settings: DomainSettings): Promise<void> {
    const allSettings = await this.getAllDomainSettings();
    allSettings[domain] = settings;
    await chrome.storage.local.set({ [this.storageKey]: allSettings });
  }

  /**
   * 清理过期的域名设置
   */
  async cleanupExpiredSettings(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const allSettings = await this.getAllDomainSettings();
    const now = Date.now();
    let hasChanges = false;

    for (const [domain, settings] of Object.entries(allSettings)) {
      if (now - settings.lastUpdated > maxAge) {
        delete allSettings[domain];
        this.cache.delete(domain);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await chrome.storage.local.set({ [this.storageKey]: allSettings });
    }
  }

  /**
   * 导出域名设置
   */
  async exportSettings(): Promise<string> {
    const allSettings = await this.getAllDomainSettings();
    return JSON.stringify(allSettings, null, 2);
  }

  /**
   * 导入域名设置
   */
  async importSettings(settingsJson: string): Promise<void> {
    try {
      const importedSettings = JSON.parse(settingsJson);
      
      // 验证数据格式
      for (const [domain, settings] of Object.entries(importedSettings)) {
        if (!this.isValidDomainSettings(settings)) {
          throw new Error(`Invalid settings for domain: ${domain}`);
        }
      }

      // 保存导入的设置
      await chrome.storage.local.set({ [this.storageKey]: importedSettings });
      
      // 清空缓存以强制重新加载
      this.cache.clear();
    } catch (error) {
      throw new Error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 验证域名设置格式
   */
  private isValidDomainSettings(settings: any): settings is DomainSettings {
    return (
      typeof settings === 'object' &&
      typeof settings.domain === 'string' &&
      typeof settings.enabled === 'boolean' &&
      typeof settings.lastUpdated === 'number' &&
      settings.extractionSettings &&
      typeof settings.extractionSettings.enabled === 'boolean'
    );
  }

  /**
   * 获取域名统计信息
   */
  async getDomainStats(): Promise<{
    totalDomains: number;
    enabledDomains: number;
    disabledDomains: number;
    recentlyUpdated: number;
  }> {
    const allSettings = await this.getAllDomainSettings();
    const now = Date.now();
    const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7天

    let enabledCount = 0;
    let recentCount = 0;

    for (const settings of Object.values(allSettings)) {
      if (settings.enabled) enabledCount++;
      if (now - settings.lastUpdated < recentThreshold) recentCount++;
    }

    return {
      totalDomains: Object.keys(allSettings).length,
      enabledDomains: enabledCount,
      disabledDomains: Object.keys(allSettings).length - enabledCount,
      recentlyUpdated: recentCount
    };
  }
}

// 全局域名设置管理器实例
export const domainSettingsManager = new DomainSettingsManager();

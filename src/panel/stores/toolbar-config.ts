import { writable } from 'svelte/store';

export interface ToolbarConfig {
  showClearButton: boolean;
  showMoreButton: boolean;
  showPageChat: boolean;
  compactMode: boolean;
}

const defaultConfig: ToolbarConfig = {
  showClearButton: true,
  showMoreButton: true,
  showPageChat: true,
  compactMode: false
};

// 从 localStorage 加载配置
function loadToolbarConfig(): ToolbarConfig {
  try {
    const saved = localStorage.getItem('slimpane-toolbar-config');
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load toolbar config:', error);
  }
  return defaultConfig;
}

// 保存配置到 localStorage
function saveToolbarConfig(config: ToolbarConfig) {
  try {
    localStorage.setItem('slimpane-toolbar-config', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save toolbar config:', error);
  }
}

function createToolbarConfigStore() {
  const { subscribe, set, update } = writable<ToolbarConfig>(loadToolbarConfig());

  return {
    subscribe,
    
    /**
     * 更新工具条配置
     */
    updateConfig: (newConfig: Partial<ToolbarConfig>) => {
      update(config => {
        const updated = { ...config, ...newConfig };
        saveToolbarConfig(updated);
        return updated;
      });
    },
    
    /**
     * 重置为默认配置
     */
    reset: () => {
      saveToolbarConfig(defaultConfig);
      set(defaultConfig);
    },
    
    /**
     * 切换紧凑模式
     */
    toggleCompactMode: () => {
      update(config => {
        const updated = { ...config, compactMode: !config.compactMode };
        saveToolbarConfig(updated);
        return updated;
      });
    }
  };
}

export const toolbarConfigStore = createToolbarConfigStore();

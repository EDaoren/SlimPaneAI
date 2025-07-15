import { writable, get } from 'svelte/store';
import type { ModelSettings, UserPreferences, StorageData, ServiceProviderSettings } from '@/types';

interface SettingsState {
  modelSettings: ModelSettings;
  serviceProviders: ServiceProviderSettings;
  userPreferences: UserPreferences;
  isLoading: boolean;
}

const initialState: SettingsState = {
  modelSettings: {},
  serviceProviders: {},
  userPreferences: {
    theme: 'auto',
    language: 'zh',
    defaultModel: '',
    lastSelectedModel: '',
    fontSize: 'medium',
    messageDensity: 'normal',
    pageContentEnabled: true,
    autoExtractContent: false,
    showContentPanel: false,
    pageChatSystemPrompt: '你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。要求：1. 仔细阅读和理解网页内容；2. 基于内容事实进行回答，不要编造信息；3. 如果问题无法从内容中找到答案，请明确说明；4. 回答要准确、简洁、有条理。',
  },
  isLoading: true, // 初始状态应该是加载中
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(initialState);

  // Storage change listener
  let storageChangeListener: ((changes: any, areaName: string) => void) | null = null;

  // Listen for storage changes to sync across different contexts
  if (typeof chrome !== 'undefined' && chrome.storage) {
    storageChangeListener = (changes, areaName) => {
      if (areaName === 'local') {
        // Reload settings when storage changes
        loadSettingsInternal();
      }
    };
    chrome.storage.onChanged.addListener(storageChangeListener);
  }

  async function loadSettingsInternal() {
    update(state => ({ ...state, isLoading: true }));

    try {
      const response = await chrome.runtime.sendMessage({ type: 'get-storage' });
      const data: StorageData = response;

      update(state => ({
        ...state,
        modelSettings: data.modelSettings || {},
        serviceProviders: data.serviceProviders || {},
        userPreferences: data.userPreferences || initialState.userPreferences,
        isLoading: false,
      }));
    } catch (error) {
      update(state => ({ ...state, isLoading: false }));
    }
  }

  return {
    subscribe,

    async loadSettings() {
      return loadSettingsInternal();
    },

    async saveModelSettings(modelSettings: ModelSettings) {
      try {
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { modelSettings },
        });
        
        update(state => ({ ...state, modelSettings }));
      } catch (error) {
        throw error;
      }
    },

    async saveUserPreferences(userPreferences: UserPreferences) {
      try {
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { userPreferences },
        });

        update(state => ({ ...state, userPreferences }));
      } catch (error) {
        throw error;
      }
    },

    async saveServiceProviders(serviceProviders: ServiceProviderSettings) {
      try {
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { serviceProviders },
        });

        update(state => ({ ...state, serviceProviders }));
      } catch (error) {
        throw error;
      }
    },

    async addModelConfig(id: string, config: any) {
      try {
        const newModelSettings = await new Promise<any>((resolve) => {
          update(state => {
            const newSettings = {
              ...state.modelSettings,
              [id]: config,
            };
            resolve(newSettings);
            return { ...state, modelSettings: newSettings };
          });
        });

        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { modelSettings: newModelSettings },
        });

      } catch (error) {
        throw error;
      }
    },

    async removeModelConfig(id: string) {
      try {
        const newModelSettings = await new Promise<any>((resolve) => {
          update(state => {
            const newSettings = { ...state.modelSettings };
            delete newSettings[id];
            resolve(newSettings);
            return { ...state, modelSettings: newSettings };
          });
        });

        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { modelSettings: newModelSettings },
        });

      } catch (error) {
        throw error;
      }
    },

    async updateUserPreferences(updates: Partial<UserPreferences>) {
      try {
        const newUserPreferences = await new Promise<any>((resolve) => {
          update(state => {
            const newPrefs = {
              ...state.userPreferences,
              ...updates,
            };
            resolve(newPrefs);
            return { ...state, userPreferences: newPrefs };
          });
        });

        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { userPreferences: newUserPreferences },
        });

      } catch (error) {
        throw error;
      }
    },

    getDefaultModel() {
      const state = get({ subscribe });
      return state.userPreferences.defaultModel;
    },

    async saveLastSelectedModel(modelSelection: string) {
      try {
        const newUserPreferences = await new Promise<any>((resolve) => {
          update(state => {
            const newPrefs = {
              ...state.userPreferences,
              lastSelectedModel: modelSelection,
            };
            resolve(newPrefs);
            return { ...state, userPreferences: newPrefs };
          });
        });

        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { userPreferences: newUserPreferences },
        });

      } catch (error) {
        throw error;
      }
    },

    getLastSelectedModel() {
      const state = get({ subscribe });
      return state.userPreferences.lastSelectedModel;
    },

    getModelConfig(modelId: string) {
      const state = get({ subscribe });
      return state.modelSettings[modelId] || null;
    },

    // Force refresh settings from storage
    async forceRefresh() {
      return loadSettingsInternal();
    },

    // Get current state snapshot
    getCurrentState() {
      return get({ subscribe });
    },

    // Cleanup function for removing event listeners
    destroy() {
      if (storageChangeListener && typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.removeListener(storageChangeListener);
        storageChangeListener = null;
      }
    },
  };
}

export const settingsStore = createSettingsStore();

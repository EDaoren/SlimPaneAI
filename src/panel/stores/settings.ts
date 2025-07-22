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
    webChatExtractionMode: 'readability' as const,
  },
  isLoading: true, // 初始状态应该是加载中
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(initialState);

  // Storage change listener - DISABLED to prevent race conditions
  // The automatic reloading was causing conflicts with manual updates
  let storageChangeListener: ((changes: any, areaName: string) => void) | null = null;

  // Note: We intentionally don't listen to chrome.storage.onChanged here
  // because it creates race conditions with our manual state updates.
  // Cross-context sync is handled by explicit forceRefresh() calls when needed.

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
        // 先更新本地状态，提供即时反馈
        update(state => ({ ...state, userPreferences }));

        // 然后保存到存储，但不再重复更新本地状态
        await chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { userPreferences },
        });
      } catch (error) {
        // 如果保存失败，回滚本地状态
        loadSettingsInternal();
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

    /**
     * Update userPreferences from external source (e.g., options page)
     * This method only updates local state without saving to storage
     */
    updateUserPreferencesFromExternal(userPreferences: UserPreferences) {
      update(state => ({ ...state, userPreferences }));
    },

    /**
     * Update modelSettings from external source (e.g., options page)
     * This method only updates local state without saving to storage
     */
    updateModelSettingsFromExternal(modelSettings: ModelSettings) {
      update(state => ({ ...state, modelSettings }));
    },

    /**
     * Update serviceProviders from external source (e.g., options page)
     * This method only updates local state without saving to storage
     */
    updateServiceProvidersFromExternal(serviceProviders: ServiceProviderSettings) {
      update(state => ({ ...state, serviceProviders }));
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

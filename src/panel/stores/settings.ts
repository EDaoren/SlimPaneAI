import { writable } from 'svelte/store';
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
    language: 'zh',
    theme: 'auto',
    defaultModel: '',
    autoOpenSidePanel: false,
  },
  isLoading: false,
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(initialState);

  // Listen for storage changes to sync across different contexts
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        console.log('🔄 [Settings] Storage changed, reloading settings...');
        // Reload settings when storage changes
        loadSettingsInternal();
      }
    });
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
      console.log('✅ [Settings] Settings loaded successfully');
    } catch (error) {
      console.error('Failed to load settings:', error);
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
        console.error('Failed to save model settings:', error);
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
        console.error('Failed to save user preferences:', error);
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
        console.error('Failed to save service providers:', error);
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

        console.log('✅ [Settings] Model config added successfully:', id);
      } catch (error) {
        console.error('Failed to add model config:', error);
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

        console.log('✅ [Settings] Model config removed successfully:', id);
      } catch (error) {
        console.error('Failed to remove model config:', error);
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

        console.log('✅ [Settings] User preferences updated successfully');
      } catch (error) {
        console.error('Failed to update user preferences:', error);
        throw error;
      }
    },

    getDefaultModel() {
      let defaultModel = '';
      update(state => {
        defaultModel = state.userPreferences.defaultModel;
        return state;
      });
      return defaultModel;
    },

    getModelConfig(modelId: string) {
      let config = null;
      update(state => {
        config = state.modelSettings[modelId] || null;
        return state;
      });
      return config;
    },

    // Force refresh settings from storage
    async forceRefresh() {
      console.log('🔄 [Settings] Force refreshing settings...');
      return loadSettingsInternal();
    },

    // Get current state snapshot
    getCurrentState() {
      let currentState: SettingsState;
      update(state => {
        currentState = { ...state };
        return state;
      });
      return currentState!;
    },
  };
}

export const settingsStore = createSettingsStore();

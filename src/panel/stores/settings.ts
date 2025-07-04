import { writable } from 'svelte/store';
import type { ModelSettings, UserPreferences, StorageData } from '@/types';

interface SettingsState {
  modelSettings: ModelSettings;
  userPreferences: UserPreferences;
  isLoading: boolean;
}

const initialState: SettingsState = {
  modelSettings: {},
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

  return {
    subscribe,
    
    async loadSettings() {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get-storage' });
        const data: StorageData = response;
        
        update(state => ({
          ...state,
          modelSettings: data.modelSettings || {},
          userPreferences: data.userPreferences || initialState.userPreferences,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to load settings:', error);
        update(state => ({ ...state, isLoading: false }));
      }
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

    async addModelConfig(id: string, config: any) {
      update(state => {
        const newModelSettings = {
          ...state.modelSettings,
          [id]: config,
        };
        
        // Save to storage
        chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { modelSettings: newModelSettings },
        });
        
        return { ...state, modelSettings: newModelSettings };
      });
    },

    async removeModelConfig(id: string) {
      update(state => {
        const newModelSettings = { ...state.modelSettings };
        delete newModelSettings[id];
        
        // Save to storage
        chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { modelSettings: newModelSettings },
        });
        
        return { ...state, modelSettings: newModelSettings };
      });
    },

    async updateUserPreferences(updates: Partial<UserPreferences>) {
      update(state => {
        const newUserPreferences = {
          ...state.userPreferences,
          ...updates,
        };

        // Save to storage
        chrome.runtime.sendMessage({
          type: 'set-storage',
          payload: { userPreferences: newUserPreferences },
        });

        return { ...state, userPreferences: newUserPreferences };
      });
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
  };
}

export const settingsStore = createSettingsStore();

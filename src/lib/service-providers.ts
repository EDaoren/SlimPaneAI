import type { ServiceProviderSettings, ServiceProvider } from '@/types';

export function getDefaultServiceProviders(): ServiceProviderSettings {
  return {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      icon: '🤖',
      isBuiltIn: true,
      enabled: false,
      isDefault: true,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: []
    },
    claude: {
      id: 'claude',
      name: 'Anthropic (Claude)',
      icon: '🧠',
      isBuiltIn: true,
      enabled: false,
      isDefault: false,
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      models: []
    },
    gemini: {
      id: 'gemini',
      name: 'Google (Gemini)',
      icon: '💎',
      isBuiltIn: true,
      enabled: false,
      isDefault: false,
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: []
    }
  };
}

export function getDefaultModelsForProvider(providerId: string) {
  switch (providerId) {
    case 'openai':
      return [
        { id: 'gpt-4', name: 'GPT-4', enabled: true },
        { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', enabled: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: true }
      ];
    case 'claude':
      return [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', enabled: true },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', enabled: true },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', enabled: true }
      ];
    case 'gemini':
      return [
        { id: 'gemini-pro', name: 'Gemini Pro', enabled: true },
        { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', enabled: true }
      ];
    default:
      return [];
  }
}

export function validateServiceProvider(provider: ServiceProvider): string[] {
  const errors: string[] = [];

  if (!provider.name?.trim()) {
    errors.push('服务提供商名称不能为空');
  }

  if (!provider.apiKey?.trim()) {
    errors.push('API Key 不能为空');
  }

  if (!provider.baseUrl?.trim()) {
    errors.push('API 端点 URL 不能为空');
  } else {
    try {
      new URL(provider.baseUrl);
    } catch {
      errors.push('API 端点 URL 格式无效');
    }
  }

  return errors;
}

export function getEnabledProviders(serviceProviders: ServiceProviderSettings): ServiceProvider[] {
  return Object.values(serviceProviders).filter(provider => provider.enabled);
}

export function getDefaultProvider(serviceProviders: ServiceProviderSettings): ServiceProvider | null {
  return Object.values(serviceProviders).find(provider => provider.isDefault) || null;
}

export function getAvailableModels(serviceProviders: ServiceProviderSettings) {
  const models: Array<{ providerId: string; providerName: string; modelId: string; modelName: string }> = [];

  Object.values(serviceProviders).forEach(provider => {
    if (provider.enabled) {
      provider.models.forEach(model => {
        if (model.enabled) {
          models.push({
            providerId: provider.id,
            providerName: provider.name,
            modelId: model.id,
            modelName: model.name
          });
        }
      });
    }
  });

  return models;
}

export function getModelDisplayOptions(serviceProviders: ServiceProviderSettings) {
  const models = getAvailableModels(serviceProviders);
  return models.map(model => ({
    id: `${model.providerId}:${model.modelId}`,
    name: `${model.providerName} - ${model.modelName}`,
    providerId: model.providerId,
    modelId: model.modelId
  }));
}

export function parseModelSelection(selectedValue: string): { providerId: string; modelId: string } | null {
  const parts = selectedValue.split(':');
  if (parts.length !== 2) return null;
  return {
    providerId: parts[0],
    modelId: parts[1]
  };
}

export function getDefaultModelSelection(serviceProviders: ServiceProviderSettings): string | null {
  // First try to get the default provider
  const defaultProvider = getDefaultProvider(serviceProviders);
  if (defaultProvider && defaultProvider.models.length > 0) {
    const firstEnabledModel = defaultProvider.models.find(m => m.enabled);
    if (firstEnabledModel) {
      return `${defaultProvider.id}:${firstEnabledModel.id}`;
    }
  }

  // Fallback to first available model
  const availableModels = getModelDisplayOptions(serviceProviders);
  return availableModels.length > 0 ? availableModels[0].id : null;
}

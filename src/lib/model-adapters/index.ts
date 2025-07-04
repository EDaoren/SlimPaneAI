import type { ModelConfig, ModelProvider } from '@/types';
import { BaseModelAdapter } from './base';
import { OpenAIAdapter } from './openai';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { CustomAdapter } from './custom';

export function createModelAdapter(config: ModelConfig): BaseModelAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'claude':
      return new ClaudeAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    case 'custom':
      return new CustomAdapter(config);
    default:
      throw new Error(`Unsupported model provider: ${config.provider}`);
  }
}

export { BaseModelAdapter, OpenAIAdapter, ClaudeAdapter, GeminiAdapter, CustomAdapter };

// Default model configurations
export const DEFAULT_MODELS = {
  openai: [
    { name: 'GPT-4', model: 'gpt-4' },
    { name: 'GPT-4 Turbo', model: 'gpt-4-turbo-preview' },
    { name: 'GPT-3.5 Turbo', model: 'gpt-3.5-turbo' },
  ],
  claude: [
    { name: 'Claude 3 Opus', model: 'claude-3-opus-20240229' },
    { name: 'Claude 3 Sonnet', model: 'claude-3-sonnet-20240229' },
    { name: 'Claude 3 Haiku', model: 'claude-3-haiku-20240307' },
  ],
  gemini: [
    { name: 'Gemini Pro', model: 'gemini-pro' },
    { name: 'Gemini Pro Vision', model: 'gemini-pro-vision' },
  ],
};

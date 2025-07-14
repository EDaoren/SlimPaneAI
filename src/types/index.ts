// Message types for communication between components
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  reasoning?: string; // 思考过程，某些模型会提供
  isThinking?: boolean; // 是否正在思考（仅对支持思考过程的模型有效）
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Model provider types
export type ModelProvider = 'openai' | 'claude' | 'gemini' | 'custom' | 'none';

// Service provider and model types
export interface ServiceProvider {
  id: string;
  name: string;
  icon: string;
  isBuiltIn: boolean;
  enabled: boolean;
  isDefault: boolean;
  apiKey: string;
  baseUrl: string;
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ServiceProviderSettings {
  [key: string]: ServiceProvider;
}

// Legacy model config for backward compatibility
export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
}

export interface ModelSettings {
  [key: string]: ModelConfig;
}

// API request/response types
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  temperature?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      reasoning?: string; // 思考过程内容
    };
    finish_reason: string;
  }>;
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      reasoning?: string; // 思考过程内容
    };
    finish_reason?: string;
  }>;
}

// Extension message types
export interface ExtensionMessage {
  type: string;
  payload?: any;
  requestId?: string;
}

export interface LLMRequest extends ExtensionMessage {
  type: 'ask-llm';
  payload: {
    messages: Message[];
    modelConfig: ModelConfig;
    stream?: boolean;
  };
}

export interface LLMResponse extends ExtensionMessage {
  type: 'llm-response' | 'llm-chunk' | 'llm-error';
  payload: {
    content?: string;
    reasoning?: string; // 思考过程内容
    error?: string;
    done?: boolean;
  };
}

// Content script message types
export interface TextSelectionMessage extends ExtensionMessage {
  type: 'text-selected';
  payload: {
    text: string;
    action: 'summarize' | 'translate' | 'explain';
    url: string;
    title: string;
  };
}

// Storage types
export interface StorageData {
  modelSettings?: ModelSettings; // Legacy support
  serviceProviders?: ServiceProviderSettings;
  chatSessions?: ChatSession[];
  currentSessionId?: string;
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  defaultModel: string;
  lastSelectedModel: string;
  fontSize: 'small' | 'medium' | 'large';
  messageDensity: 'compact' | 'normal' | 'relaxed';
}

// Prompt templates
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Summarize the selected text',
    systemPrompt: 'You are a helpful assistant that summarizes text concisely and accurately.',
    userPromptTemplate: 'Please summarize the following text:\n\n{text}'
  },
  {
    id: 'translate',
    name: 'Translate',
    description: 'Translate the selected text',
    systemPrompt: 'You are a professional translator. Translate the text accurately while preserving the original meaning and tone.',
    userPromptTemplate: 'Please translate the following text to English (if it\'s not English) or Chinese (if it\'s English):\n\n{text}'
  },
  {
    id: 'explain',
    name: 'Explain',
    description: 'Explain the selected text in detail',
    systemPrompt: 'You are a knowledgeable teacher. Explain concepts clearly and provide helpful context.',
    userPromptTemplate: 'Please explain the following text in detail:\n\n{text}'
  }
];

// Message types for communication between components
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  reasoning?: string; // 思考过程，某些模型会提供
  isThinking?: boolean; // 是否正在思考（仅对支持思考过程的模型有效）
  isPageChat?: boolean; // 是否为网页聊天消息
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

// Tab and navigation message types
export interface TabSwitchedMessage extends ExtensionMessage {
  type: 'tab-switched';
  payload: {
    tabId: number;
    url: string;
    title: string;
  };
}

export interface PageNavigatedMessage extends ExtensionMessage {
  type: 'page-navigated';
  payload: {
    tabId: number;
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
  // Page content related storage
  domainSettings?: { [domain: string]: DomainSettings };
  pageContentCache?: { [url: string]: PageContent };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  defaultModel: string;
  lastSelectedModel: string;
  fontSize: 'small' | 'medium' | 'large';
  messageDensity: 'compact' | 'normal' | 'relaxed';
  // Page content extraction preferences
  pageContentEnabled: boolean;
  autoExtractContent: boolean;
  showContentPanel: boolean;
  // Page chat custom system prompt
  pageChatSystemPrompt: string;
}

// Prompt templates
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

// Page content extraction types
export interface PageContent {
  url: string;
  title: string;
  domain: string;
  content: string;
  extractedAt: number;
  contentType: 'webpage' | 'pdf' | 'iframe';
  tokenCount?: number;
  metadata?: {
    author?: string;
    publishDate?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface ContentExtractionSettings {
  enabled: boolean;
  autoExtract: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  maxTokens: number;
  excludeSelectors: string[];
  includeSelectors: string[];
}

export interface DomainSettings {
  domain: string;
  enabled: boolean;
  extractionSettings: ContentExtractionSettings;
  lastUpdated: number;
}

export interface PDFProcessingStatus {
  url: string;
  status: 'loading' | 'processing' | 'completed' | 'error';
  progress: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}

// Extended message types for page content
export interface PageContentMessage extends ExtensionMessage {
  type: 'page-content-extracted' | 'page-content-request' | 'pdf-processing-status';
  payload: {
    content?: PageContent;
    settings?: DomainSettings;
    status?: PDFProcessingStatus;
  };
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

// Global type declarations for content script
declare global {
  interface Window {
    slimPaneAIContentScriptLoaded?: boolean;
  }
}

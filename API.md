# SlimPaneAI API Documentation

## Architecture Overview

SlimPaneAI follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content       │    │   Background    │    │   Side Panel    │
│   Script        │◄──►│   Service       │◄──►│   Interface     │
│                 │    │   Worker        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   AI Model      │
                       │   Adapters      │
                       └─────────────────┘
```

## Core Components

### 1. Stores (State Management)

#### ChatStore (`src/panel/stores/chat.ts`)
Manages chat sessions and message handling.

**Key Methods:**
- `sendMessage(content, modelId?, providerId?)` - Send a message to AI
- `createNewSession()` - Create a new chat session
- `handleMessage(message)` - Handle incoming messages from background
- `clearCurrentSession()` - Clear current chat session

#### SettingsStore (`src/panel/stores/settings.ts`)
Manages application settings and model configurations.

**Key Methods:**
- `loadSettings()` - Load settings from storage
- `updateUserPreferences(updates)` - Update user preferences
- `getModelConfig(modelId)` - Get model configuration
- `getDefaultModel()` - Get default model ID

### 2. Model Adapters (`src/lib/model-adapters/`)

Base adapter interface for AI models:

```typescript
abstract class BaseModelAdapter {
  abstract getApiUrl(): string;
  abstract getHeaders(): Record<string, string>;
  abstract transformRequest(request: ChatCompletionRequest): any;
  abstract transformResponse(response: any): ChatCompletionResponse;
  abstract parseStreamChunk(chunk: string): StreamChunk | null;
}
```

**Available Adapters:**
- `OpenAIAdapter` - OpenAI GPT models
- `ClaudeAdapter` - Anthropic Claude models
- `GeminiAdapter` - Google Gemini models

### 3. Utilities

#### Error Formatter (`src/lib/utils/error-formatter.ts`)
Formats error messages for user-friendly display.

```typescript
formatErrorMessage(error: string): string
isRecoverableError(error: string): boolean
```

#### ID Generator (`src/lib/utils/id-generator.ts`)
Secure ID generation utilities.

```typescript
generateId(): string           // UUID or fallback
generateShortId(): string      // 8-character ID
generateSessionId(): string    // Session-specific ID
generateMessageId(): string    // Message-specific ID
```

## Message Types

### Extension Messages

```typescript
interface ExtensionMessage {
  type: string;
  requestId?: string;
  payload?: any;
}
```

**Message Types:**
- `ask-llm` - Send request to AI model
- `llm-chunk` - Streaming response chunk
- `llm-response` - Complete response
- `llm-error` - Error response
- `get-storage` - Get storage data
- `set-storage` - Set storage data

### Chat Messages

```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  reasoning?: string;
  isThinking?: boolean;
}
```

## Configuration

### Model Configuration

```typescript
interface ModelConfig {
  provider: 'openai' | 'claude' | 'gemini' | 'custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
```

### User Preferences

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  defaultModel: string;
  fontSize: 'small' | 'medium' | 'large';
  messageDensity: 'compact' | 'normal' | 'relaxed';
}
```

## Development Guidelines

### Adding New AI Models

1. Create adapter in `src/lib/model-adapters/`
2. Extend `BaseModelAdapter`
3. Implement required methods
4. Add to model capabilities if needed
5. Update service providers configuration

### Error Handling

- Use `formatErrorMessage()` for user-facing errors
- Check `isRecoverableError()` for retry logic
- Always provide fallback behavior
- Log errors for debugging but don't expose to users

### Performance Considerations

- Use `get()` instead of `update()` for reading store state
- Implement debouncing for frequent operations
- Lazy load heavy components
- Optimize math rendering with content detection

### Security

- Validate all user inputs
- Sanitize HTML content
- Use secure ID generation
- Store sensitive data locally only
- Validate API responses

## Testing

### Unit Tests
```bash
npm run test
```

### Type Checking
```bash
npm run check
```

### Linting
```bash
npm run lint
```

## Build Process

### Development
```bash
npm run dev          # Watch mode
npm run dev:package  # Build and package
```

### Production
```bash
npm run build        # Build for production
npm run package      # Package extension
```

## Extension Manifest

Key permissions required:
- `sidePanel` - Side panel functionality
- `storage` - Local data storage
- `activeTab` - Access current tab
- `scripting` - Content script injection

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check API endpoints and permissions
2. **Storage Issues**: Verify chrome.storage permissions
3. **Message Passing**: Check message types and handlers
4. **Streaming**: Ensure ReadableStream support

### Debug Tools

- Background script: `chrome://extensions/` → Inspect views
- Side panel: Right-click panel → Inspect
- Content script: F12 on webpage → Console

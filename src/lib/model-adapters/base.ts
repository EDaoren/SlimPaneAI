import type { ModelConfig, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export abstract class BaseModelAdapter {
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  abstract getApiUrl(): string;
  abstract getHeaders(): Record<string, string>;
  abstract transformRequest(request: ChatCompletionRequest): any;
  abstract transformResponse(response: any): ChatCompletionResponse;
  abstract parseStreamChunk(chunk: string): StreamChunk | null;

  async sendRequest(request: ChatCompletionRequest): Promise<Response> {
    const url = this.getApiUrl();
    const headers = this.getHeaders();
    const body = this.transformRequest(request);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '' || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            console.log('🔍 Raw chunk data:', data);
            try {
              const chunk = this.parseStreamChunk(data);
              console.log('🔍 Parsed chunk:', chunk);
              if (chunk) {
                console.log('✅ Yielding chunk:', chunk);
                yield chunk;
              } else {
                console.log('❌ Chunk was null');
              }
            } catch (error) {
              console.warn('Failed to parse stream chunk:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.model) {
      throw new Error('Model is required');
    }
  }
}

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
  abstract streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown>;

  async sendRequest(request: ChatCompletionRequest): Promise<Response> {
    const url = this.getApiUrl();
    const headers = this.getHeaders();
    const body = this.transformRequest(request);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    return response;
  }

  // Utility method for parsing SSE (Server-Sent Events) streams
  // Used by OpenAI, Claude, and other SSE-compatible APIs
  protected async *parseSSEStream(response: Response, adapterName: string): AsyncGenerator<StreamChunk, void, unknown> {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let lastChunkTime = Date.now();

    try {
      while (true) {
        // Add timeout check - if no chunk received in 30 seconds, break
        const now = Date.now();
        if (now - lastChunkTime > 30000) {
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        lastChunkTime = now;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === '' || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            try {
              const chunk = this.parseStreamChunk(data);
              if (chunk) {
                chunkCount++;
                yield chunk;
              }
            } catch (error) {
              // Silently handle parse errors
            }
          }
        }
      }
    } catch (error) {
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  // Utility method for parsing JSON line streams
  // Used by Gemini and other APIs that return JSON objects per line
  protected async *parseJSONStream(response: Response, adapterName: string): AsyncGenerator<StreamChunk, void, unknown> {
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
          if (trimmed === '') continue;

          try {
            const chunk = this.parseStreamChunk(trimmed);
            if (chunk) {
              yield chunk;
            }
          } catch (error) {
            // Silently handle parse errors
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

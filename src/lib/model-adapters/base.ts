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

    console.log(`🌊 [${adapterName}] Starting SSE stream parsing`);
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
          console.warn(`[${adapterName}] Stream timeout - no data received for 30 seconds`);
          break;
        }

        console.log(`🔍 [${adapterName}] Reading from stream...`);
        const { done, value } = await reader.read();

        if (done) {
          console.log(`🔍 [${adapterName}] Stream ended, total chunks processed: ${chunkCount}`);
          break;
        }

        lastChunkTime = now;
        buffer += decoder.decode(value, { stream: true });
        console.log(`🔍 [${adapterName}] Raw buffer:`, buffer);

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          console.log(`🔍 [${adapterName}] Processing line:`, trimmed);

          if (trimmed === '' || trimmed === 'data: [DONE]') {
            console.log(`🔍 [${adapterName}] Skipping empty or DONE line`);
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            console.log(`🔍 [${adapterName}] Extracted data:`, data);
            try {
              const chunk = this.parseStreamChunk(data);
              if (chunk) {
                chunkCount++;
                console.log(`✅ [${adapterName}] Yielding chunk ${chunkCount}:`, chunk);
                yield chunk;
              } else {
                console.log(`❌ [${adapterName}] parseStreamChunk returned null for:`, data);
              }
            } catch (error) {
              console.warn(`❌ [${adapterName}] Failed to parse stream chunk:`, error, 'Data:', data);
            }
          } else {
            console.log(`🔍 [${adapterName}] Line doesn't start with 'data: ':`, trimmed);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [${adapterName}] Stream error:`, error);
      throw error;
    } finally {
      console.log(`🔍 [${adapterName}] Releasing reader lock`);
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

          console.log(`🔍 [${adapterName}] Raw JSON line:`, trimmed);

          try {
            const chunk = this.parseStreamChunk(trimmed);
            console.log(`🔍 [${adapterName}] Parsed chunk:`, chunk);
            if (chunk) {
              console.log(`✅ [${adapterName}] Yielding chunk:`, chunk);
              yield chunk;
            } else {
              console.log(`❌ [${adapterName}] Chunk was null`);
            }
          } catch (error) {
            console.warn(`Failed to parse ${adapterName} JSON stream chunk:`, error);
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

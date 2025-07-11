import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class OpenAIAdapter extends BaseModelAdapter {
  getApiUrl(): string {
    if (this.config.baseUrl) {
      // If custom baseUrl is provided, check if it already includes the endpoint
      if (this.config.baseUrl.includes('/chat/completions')) {
        return this.config.baseUrl;
      } else {
        // If it's just a base URL, append the chat completions endpoint
        return `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      }
    }
    return 'https://api.openai.com/v1/chat/completions';
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  transformRequest(request: ChatCompletionRequest): any {
    return {
      model: this.config.model,
      messages: request.messages,
      stream: request.stream || false,
      temperature: this.config.temperature || request.temperature || 0.7,
    };
  }

  transformResponse(response: any): ChatCompletionResponse {
    return response;
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(chunk);

      // Ensure the chunk has the expected OpenAI format
      if (parsed.choices && parsed.choices.length > 0) {
        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    // OpenAI uses SSE format
    yield* this.parseSSEStream(response, 'OpenAI');
  }
}

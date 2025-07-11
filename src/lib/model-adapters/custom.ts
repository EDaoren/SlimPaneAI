import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class CustomAdapter extends BaseModelAdapter {
  getApiUrl(): string {
    if (!this.config.baseUrl) {
      throw new Error('Base URL is required for custom models');
    }
    return this.config.baseUrl;
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  transformRequest(request: ChatCompletionRequest): any {
    // Use OpenAI-compatible format by default for custom models
    return {
      model: this.config.model,
      messages: request.messages,
      stream: request.stream || false,
      temperature: this.config.temperature || request.temperature || 0.7,
    };
  }

  transformResponse(response: any): ChatCompletionResponse {
    // Assume OpenAI-compatible response format
    return response;
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(chunk);

      // Ensure the chunk has the expected OpenAI-compatible format
      if (parsed.choices && parsed.choices.length > 0) {
        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    // Custom adapters default to OpenAI-compatible SSE format
    yield* this.parseSSEStream(response, 'Custom');
  }
}

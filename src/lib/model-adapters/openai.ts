import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class OpenAIAdapter extends BaseModelAdapter {
  getApiUrl(): string {
    const url = this.config.baseUrl
      ? (this.config.baseUrl.includes('/chat/completions')
          ? this.config.baseUrl
          : `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`)
      : 'https://api.openai.com/v1/chat/completions';

    console.log('🔗 [OpenAI] API URL:', url);
    return url;
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  transformRequest(request: ChatCompletionRequest): any {
    const body = {
      model: this.config.model,
      messages: request.messages,
      stream: request.stream || false,
    };

    console.log('📤 [OpenAI] Request body:', JSON.stringify(body, null, 2));
    return body;
  }

  transformResponse(response: any): ChatCompletionResponse {
    return response;
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      console.log('🔍 [OpenAI] Raw chunk:', chunk);
      const parsed = JSON.parse(chunk);
      console.log('🔍 [OpenAI] Parsed chunk:', parsed);

      // OpenAI streaming format validation
      // Must have choices array with at least one choice
      if (parsed.choices && parsed.choices.length > 0) {
        console.log('✅ [OpenAI] Valid chunk, returning:', parsed);
        return parsed;
      }

      console.log('❌ [OpenAI] Invalid chunk - no choices');
      return null;
    } catch (error) {
      console.error('❌ [OpenAI] Parse error:', error, 'Chunk:', chunk);
      return null;
    }
  }

  async sendRequest(request: ChatCompletionRequest): Promise<Response> {
    const url = this.getApiUrl();
    const headers = this.getHeaders();
    const body = this.transformRequest(request);

    console.log('📤 [OpenAI] Sending request to:', url);
    console.log('📤 [OpenAI] Headers:', headers);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    console.log('📥 [OpenAI] Response status:', response.status);
    console.log('📥 [OpenAI] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [OpenAI] Error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    return response;
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    console.log('🌊 [OpenAI] Starting stream response');
    // OpenAI uses SSE format
    yield* this.parseSSEStream(response, 'OpenAI');
  }
}

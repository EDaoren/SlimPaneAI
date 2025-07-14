import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class OpenAIAdapter extends BaseModelAdapter {
  private lastRequest?: ChatCompletionRequest;
  getApiUrl(): string {
    const url = this.config.baseUrl
      ? (this.config.baseUrl.includes('/chat/completions')
          ? this.config.baseUrl
          : `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`)
      : 'https://api.openai.com/v1/chat/completions';

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

    return body;
  }

  transformResponse(response: any): ChatCompletionResponse {
    return response;
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(chunk);

      // OpenAI streaming format validation
      // Must have choices array with at least one choice
      if (parsed.choices && parsed.choices.length > 0) {
        const choice = parsed.choices[0];



        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async sendRequest(request: ChatCompletionRequest): Promise<Response> {
    this.lastRequest = request; // 保存请求以便后续获取思考过程

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    return response;
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    // OpenAI uses SSE format
    yield* this.parseSSEStream(response, 'OpenAI');
  }
}

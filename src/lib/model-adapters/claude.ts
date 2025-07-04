import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class ClaudeAdapter extends BaseModelAdapter {
  getApiUrl(): string {
    return this.config.baseUrl || 'https://api.anthropic.com/v1/messages';
  }

  getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  transformRequest(request: ChatCompletionRequest): any {
    // Convert OpenAI format to Claude format
    const messages = request.messages.filter(msg => msg.role !== 'system');
    const systemMessage = request.messages.find(msg => msg.role === 'system');

    return {
      model: this.config.model,
      max_tokens: this.config.maxTokens || request.max_tokens || 4096,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      system: systemMessage?.content,
      stream: request.stream || false,
      temperature: this.config.temperature || request.temperature || 0.7,
    };
  }

  transformResponse(response: any): ChatCompletionResponse {
    // Convert Claude response to OpenAI format
    return {
      id: response.id,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: response.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0]?.text || '',
          },
          finish_reason: response.stop_reason || 'stop',
        },
      ],
    };
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(chunk);
      
      if (parsed.type === 'content_block_delta') {
        return {
          id: parsed.id || 'claude-stream',
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {
                content: parsed.delta?.text || '',
              },
            },
          ],
        };
      }
      
      if (parsed.type === 'message_stop') {
        return {
          id: parsed.id || 'claude-stream',
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

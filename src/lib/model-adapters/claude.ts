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
      console.log('🔍 [Claude] Parsing chunk:', parsed);

      if (parsed.type === 'content_block_delta') {
        const streamChunk = {
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
        console.log('✅ [Claude] Created content chunk:', streamChunk);
        return streamChunk;
      }

      if (parsed.type === 'message_stop') {
        const finishChunk = {
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
        console.log('✅ [Claude] Created finish chunk:', finishChunk);
        return finishChunk;
      }

      console.log('❌ [Claude] No valid content or finish event found');
      return null;
    } catch (error) {
      console.error('❌ [Claude] Failed to parse chunk:', error);
      return null;
    }
  }

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    // Claude uses SSE format
    yield* this.parseSSEStream(response, 'Claude');
  }
}

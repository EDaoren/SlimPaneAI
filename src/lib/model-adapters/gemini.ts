import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class GeminiAdapter extends BaseModelAdapter {
  private lastRequest?: ChatCompletionRequest;

  getApiUrl(): string {
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const stream = this.lastRequest?.stream ? ':streamGenerateContent' : ':generateContent';
    return `${baseUrl}/models/${this.config.model}${stream}?key=${this.config.apiKey}`;
  }

  getHeaders(): Record<string, string> {
    return {};
  }

  transformRequest(request: ChatCompletionRequest): any {
    this.lastRequest = request;
    
    // Convert OpenAI format to Gemini format
    const contents = [];
    let systemInstruction = '';

    for (const message of request.messages) {
      if (message.role === 'system') {
        systemInstruction = message.content;
      } else {
        contents.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        });
      }
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: this.config.temperature || request.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens || request.max_tokens || 4096,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    return body;
  }

  transformResponse(response: any): ChatCompletionResponse {
    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    return {
      id: 'gemini-' + Date.now(),
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: candidate?.finishReason?.toLowerCase() || 'stop',
        },
      ],
    };
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(chunk);
      const candidate = parsed.candidates?.[0];
      
      if (candidate?.content?.parts?.[0]?.text) {
        return {
          id: 'gemini-stream-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {
                content: candidate.content.parts[0].text,
              },
            },
          ],
        };
      }

      if (candidate?.finishReason) {
        return {
          id: 'gemini-stream-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: candidate.finishReason.toLowerCase(),
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

import { BaseModelAdapter } from './base';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '@/types';

export class GeminiAdapter extends BaseModelAdapter {
  private lastRequest?: ChatCompletionRequest;

  constructor(config: any) {
    super(config);
    console.log('🎯 [Gemini] Adapter created with config:', {
      provider: config.provider,
      model: config.model,
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl
    });
  }

  getApiUrl(): string {
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    // Default to streaming endpoint, will be overridden in sendRequest if needed
    const stream = ':streamGenerateContent';
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
      },
    };

    // For Gemini 2.5 Pro, try different approaches to enable thinking
    if (this.config.model && this.config.model.includes('2.5-pro')) {
      // Approach 1: Try responseFormat
      // body.generationConfig.responseFormat = { type: 'text' };

      // Approach 2: Try specific response schema
      // body.generationConfig.responseMimeType = 'text/plain';

      // For now, let's see if thinking is enabled by default
      console.log('🧠 [Gemini] Using Gemini 2.5 Pro - thinking should be available by default');
    }

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    // Note: Thinking process for Gemini 2.5 Pro might be enabled by default
    // or require different configuration. Keeping this section for future reference.

    return body;
  }

  transformResponse(response: any): ChatCompletionResponse {
    console.log('🔍 [Gemini] Raw response:', response);

    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    // Extract thinking content if available
    let thinkingContent = '';

    // Check for thinking content in parts (based on official docs)
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.thought) {
          thinkingContent += part.thought;
        }
      }
    }

    // Also check other possible locations for compatibility
    if (!thinkingContent) {
      if (candidate?.thoughtContent) {
        thinkingContent = candidate.thoughtContent;
      } else if (response.thoughtContent) {
        thinkingContent = response.thoughtContent;
      } else if (response.reasoning) {
        thinkingContent = response.reasoning;
      } else if (response.thinking) {
        thinkingContent = response.thinking;
      }
    }

    const transformedResponse = {
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
            reasoning: thinkingContent || undefined,
          },
          finish_reason: candidate?.finishReason?.toLowerCase() || 'stop',
        },
      ],
    };

    console.log('✅ [Gemini] Transformed response:', transformedResponse);
    return transformedResponse;
  }

  parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      // Handle empty or whitespace-only chunks
      if (!chunk || !chunk.trim()) {
        return null;
      }

      const parsed = JSON.parse(chunk);

      // Log the full response to understand the structure
      if (parsed.usageMetadata?.thoughtsTokenCount > 0) {
        console.log('🧠 [Gemini] Response with thinking detected:', JSON.stringify(parsed, null, 2));
      }

      // Check for API errors first
      if (parsed.error) {
        console.error('Gemini API error:', parsed.error);
        throw new Error(`Gemini API error: ${parsed.error.message || 'Unknown error'}`);
      }

      const candidate = parsed.candidates?.[0];

      // Check for content - look for both regular content and thinking content
      if (candidate?.content?.parts) {
        let regularContent = '';
        let thinkingContent = '';

        // Process all parts to find different types of content
        for (const part of candidate.content.parts) {
          if (part.text) {
            // Regular content
            regularContent += part.text;
          }

          // Check for thinking content in the part.thought field (based on official docs)
          if (part.thought) {
            thinkingContent += part.thought;
          }

          // Also check other possible thinking fields for compatibility
          if (part.thoughtContent || part.reasoning || part.thinking) {
            thinkingContent += part.thoughtContent || part.reasoning || part.thinking;
          }
        }

        // Check for thinking content in candidate level
        if (candidate.thoughtContent) {
          thinkingContent += candidate.thoughtContent;
        }

        // Check for thinking content in top-level response
        if (parsed.thoughtContent) {
          thinkingContent += parsed.thoughtContent;
        } else if (parsed.reasoning) {
          thinkingContent += parsed.reasoning;
        } else if (parsed.thinking) {
          thinkingContent += parsed.thinking;
        }

        // Check for thinking in other possible locations
        if (parsed.usageMetadata?.thoughtsTokenCount > 0) {
          // Log detailed structure to help debug where thinking content might be
          console.log('🔍 [Gemini] Response with thinking - detailed structure:', {
            thoughtsTokenCount: parsed.usageMetadata.thoughtsTokenCount,
            candidateKeys: candidate ? Object.keys(candidate) : [],
            parsedKeys: Object.keys(parsed),
            contentParts: candidate?.content?.parts?.map((part: any, index: number) => ({
              index,
              keys: Object.keys(part),
              type: part.type,
              role: part.role,
              hasText: !!part.text,
              hasThought: !!part.thought,
              textLength: part.text ? part.text.length : 0,
              thoughtLength: part.thought ? part.thought.length : 0,
              textPreview: part.text ? part.text.substring(0, 100) + '...' : null,
              thoughtPreview: part.thought ? part.thought.substring(0, 100) + '...' : null
            })) || [],
            foundThinking: !!thinkingContent,
            thinkingLength: thinkingContent.length
          });
        }

        if (regularContent || thinkingContent) {
          const streamChunk = {
            id: 'gemini-stream-' + Date.now(),
            object: 'chat.completion.chunk',
            created: Date.now() / 1000,
            model: this.config.model,
            choices: [
              {
                index: 0,
                delta: {
                  content: regularContent || undefined,
                  reasoning: thinkingContent || undefined,
                },
              },
            ],
          };

          if (thinkingContent) {
            console.log('🧠 [Gemini] Found thinking content:', thinkingContent.substring(0, 200) + '...');
          }

          return streamChunk;
        }
      }

      // Check for finish reason (Gemini uses uppercase like "STOP")
      if (candidate?.finishReason) {
        const finishChunk = {
          id: 'gemini-stream-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: candidate.finishReason.toLowerCase(), // Convert to lowercase for OpenAI compatibility
            },
          ],
        };
        return finishChunk;
      }

      // Check for safety ratings or other blocking reasons
      if (candidate?.safetyRatings || parsed.promptFeedback) {
        console.warn('Content blocked by Gemini safety filters');

        // Create a finish chunk to end the stream
        const safetyFinishChunk = {
          id: 'gemini-stream-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Date.now() / 1000,
          model: this.config.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'content_filter',
            },
          ],
        };
        return safetyFinishChunk;
      }

      return null;
    } catch (error) {
      console.error('Failed to parse Gemini chunk:', error);
      return null;
    }
  }

  // Override sendRequest to handle Gemini's specific URL requirements
  async sendRequest(request: ChatCompletionRequest): Promise<Response> {
    this.lastRequest = request;

    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = request.stream ? ':streamGenerateContent' : ':generateContent';

    // For streaming, use SSE format to avoid JSON parsing issues
    let url = `${baseUrl}/models/${this.config.model}${endpoint}?key=${this.config.apiKey}`;
    if (request.stream) {
      url += '&alt=sse';
    }

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

  async *streamResponse(response: Response): AsyncGenerator<StreamChunk, void, unknown> {
    // Gemini uses SSE format when alt=sse parameter is used
    yield* this.parseSSEStream(response, 'Gemini');
  }
}

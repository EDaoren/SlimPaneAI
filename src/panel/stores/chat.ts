import { writable } from 'svelte/store';
import type { 
  Message, 
  ChatSession, 
  LLMRequest, 
  LLMResponse, 
  ExtensionMessage,
  StorageData 
} from '@/types';
import { DEFAULT_PROMPTS } from '@/types';
import { settingsStore } from './settings';

interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
}

const initialState: ChatState = {
  currentSession: null,
  sessions: [],
  isLoading: false,
  isStreaming: false,
  streamingMessageId: null,
};

function createChatStore() {
  const { subscribe, set, update } = writable<ChatState>(initialState);

  return {
    subscribe,

    async loadChatHistory() {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get-storage' });
        const data: StorageData = response;
        
        const sessions = data.chatSessions || [];
        const currentSessionId = data.currentSessionId;
        const currentSession = sessions.find(s => s.id === currentSessionId) || null;
        
        update(state => ({
          ...state,
          sessions,
          currentSession,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
        update(state => ({ ...state, isLoading: false }));
      }
    },

    async createNewSession() {
      const newSession: ChatSession = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      update(state => {
        const newSessions = [newSession, ...state.sessions];
        return {
          ...state,
          currentSession: newSession,
          sessions: newSessions,
        };
      });

      await this.saveSessions();
      return newSession;
    },

    async switchSession(sessionId: string) {
      update(state => {
        const session = state.sessions.find(s => s.id === sessionId);
        return {
          ...state,
          currentSession: session || null,
        };
      });

      await chrome.runtime.sendMessage({
        type: 'set-storage',
        payload: { currentSessionId: sessionId },
      });
    },

    async deleteSession(sessionId: string) {
      update(state => {
        const newSessions = state.sessions.filter(s => s.id !== sessionId);
        const newCurrentSession = state.currentSession?.id === sessionId
          ? (newSessions[0] || null)
          : state.currentSession;

        return {
          ...state,
          sessions: newSessions,
          currentSession: newCurrentSession,
        };
      });

      await this.saveSessions();
    },

    async clearCurrentSession() {
      update(state => {
        if (!state.currentSession) return state;

        const updatedSession = {
          ...state.currentSession,
          messages: []
        };

        const updatedSessions = state.sessions.map(session =>
          session.id === state.currentSession?.id ? updatedSession : session
        );

        return {
          ...state,
          sessions: updatedSessions,
          currentSession: updatedSession,
        };
      });

      await this.saveSessions();
    },

    async sendMessage(content: string, modelId?: string) {
      if (!content.trim()) return;

      // Get current session or create new one
      let session: ChatSession | null = null;
      update(state => {
        session = state.currentSession;
        return state;
      });

      if (!session) {
        session = await this.createNewSession();
      }

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        type: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: generateId(),
        type: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: modelId,
      };

      // Add messages to session
      update(state => {
        if (state.currentSession) {
          state.currentSession.messages.push(userMessage, assistantMessage);
          state.currentSession.updatedAt = Date.now();

          // Update title if this is the first message
          if (state.currentSession.messages.length === 2) {
            state.currentSession.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
          }
        }

        return {
          ...state,
          isStreaming: true,
          streamingMessageId: assistantMessage.id,
        };
      });

      await this.saveSessions();

      // Get model configuration
      const modelConfig = settingsStore.getModelConfig(modelId || settingsStore.getDefaultModel());

      // 如果没有配置模型，创建一个空的配置，让后台处理错误
      const finalModelConfig = modelConfig || {
        provider: 'none',
        model: 'none',
        apiKey: '',
        baseUrl: '',
        temperature: 0.7,
        maxTokens: 2000
      };

      // Send request to background script
      const request: LLMRequest = {
        type: 'ask-llm',
        requestId: assistantMessage.id,
        payload: {
          messages: session.messages.slice(0, -1).filter(msg =>
            msg.content &&
            msg.content.trim() &&
            msg.type &&
            ['user', 'assistant', 'system'].includes(msg.type)
          ), // Don't include the empty assistant message
          modelConfig: finalModelConfig,
          stream: true,
        },
      };

      try {
        chrome.runtime.sendMessage(request);
      } catch (error) {
        console.error('Failed to send message to background script:', error);
        this.handleError('Failed to send message. Please try again.');
      }
    },

    async handleTextSelection(text: string, action: 'summarize' | 'translate' | 'explain') {
      const prompt = DEFAULT_PROMPTS.find(p => p.id === action);
      if (!prompt) return;

      // Create new session for text selection
      await this.createNewSession();

      // Create system message
      const systemMessage: Message = {
        id: generateId(),
        type: 'system',
        content: prompt.systemPrompt,
        timestamp: Date.now(),
      };

      // Create user message with the selected text
      const userContent = prompt.userPromptTemplate.replace('{text}', text);
      
      update(state => {
        if (state.currentSession) {
          state.currentSession.messages.push(systemMessage);
          state.currentSession.title = `${prompt.name}: ${text.slice(0, 30)}...`;
        }
        return state;
      });

      await this.sendMessage(userContent);
    },



    handleMessage(message: ExtensionMessage) {
      if (message.type === 'llm-chunk' || message.type === 'llm-response') {
        const response = message as LLMResponse;

        update(state => {
          // Ensure we have a current session
          if (!state.currentSession) {
            return state;
          }

          // Find the last assistant message (should be empty and waiting for content)
          const messages = state.currentSession.messages;
          const lastMessage = messages[messages.length - 1];

          if (lastMessage && lastMessage.type === 'assistant') {
            // Update the assistant message content
            const newContent = response.payload.content || '';
            const updatedMessage = {
              ...lastMessage,
              content: lastMessage.content + newContent
            };

            console.log('🔄 Updating message:', {
              oldContent: lastMessage.content,
              newContent,
              finalContent: updatedMessage.content,
              done: response.payload.done
            });

            // Create new messages array
            const newMessages = [...messages.slice(0, -1), updatedMessage];

            // Create new session object
            const newSession = {
              ...state.currentSession,
              messages: newMessages,
              updatedAt: Date.now()
            };

            // Update sessions array with the new session
            const newSessions = state.sessions.map(session =>
              session.id === newSession.id ? newSession : session
            );

            // Update state
            const newState = {
              ...state,
              currentSession: newSession,
              sessions: newSessions,
              isStreaming: response.payload.done ? false : state.isStreaming,
              streamingMessageId: response.payload.done ? null : state.streamingMessageId
            };

            return newState;
          }

          return state;
        });
      } else if (message.type === 'llm-error') {
        // 处理错误消息，支持两种格式
        const errorMessage = (message as any).error ||
                            (message as any).payload?.error ||
                            'Unknown error occurred';
        this.handleError(errorMessage);
      }

      // Save sessions after response
      if (message.type === 'llm-response' || message.type === 'llm-error' || (message.payload?.done)) {
        this.saveSessions();
      }
    },

    handleError(error: string) {
      update(state => {
        // 格式化错误消息，让它看起来像AI助手的回复
        const formattedError = this.formatErrorMessage(error);

        if (state.currentSession && state.streamingMessageId) {
          // 如果有正在流式传输的消息，更新它的内容为错误消息
          const messageIndex = state.currentSession.messages.findIndex(
            msg => msg.id === state.streamingMessageId
          );

          if (messageIndex !== -1) {
            state.currentSession.messages[messageIndex].content = formattedError;
          }
        } else if (state.currentSession) {
          // 如果没有流式传输的消息，创建新的错误消息
          const errorMessage: Message = {
            id: generateId(),
            type: 'assistant',
            content: formattedError,
            timestamp: Date.now(),
          };
          state.currentSession.messages.push(errorMessage);
        }

        return {
          ...state,
          isStreaming: false,
          streamingMessageId: null,
        };
      });
    },

    formatErrorMessage(error: string): string {
      // 移除"Error: "前缀
      const cleanError = error.replace(/^Error:\s*/, '');

      // 检查是否是模型配置相关的错误
      if (cleanError.includes('No model configured') || cleanError.includes('API key not configured')) {
        return `<div style="color: #dc2626; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">
${cleanError}

**💡 配置步骤：**
• 点击右侧工具栏 ⚙️ 进入设置页面
• 选择一个AI服务提供商（OpenAI、Claude、Gemini等）
• 输入对应的API密钥
• 保存设置后即可开始聊天

**🔗 获取API密钥：**
• OpenAI: https://platform.openai.com/api-keys
• Claude: https://console.anthropic.com/
• Gemini: https://aistudio.google.com/app/apikey
</div>`;
      }

      // 其他错误的通用处理
      return `<div style="color: #dc2626; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">
${cleanError}

**💡 解决建议：**
• 等待几分钟后重新发送消息
• 点击右侧工具栏 ⚙️ 检查API配置
• 尝试切换到其他可用的AI模型
• 如果问题持续，请联系技术支持
</div>`;
    },

    extractRequestId(error: string): string {
      const match = error.match(/request id:\s*([^)]+)/);
      return match ? match[1] : '';
    },

    async saveSessions() {
      let sessions: ChatSession[] = [];
      let currentSessionId = '';
      
      update(state => {
        sessions = state.sessions;
        currentSessionId = state.currentSession?.id || '';
        return state;
      });

      await chrome.runtime.sendMessage({
        type: 'set-storage',
        payload: { 
          chatSessions: sessions,
          currentSessionId,
        },
      });
    },
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const chatStore = createChatStore();

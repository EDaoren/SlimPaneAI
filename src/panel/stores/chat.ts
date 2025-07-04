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
      if (!modelConfig) {
        this.handleError('No model configured. Please configure a model in settings.');
        return;
      }

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
          modelConfig,
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
        const response = message as LLMResponse;
        this.handleError(response.payload.error || 'Unknown error occurred');
      }

      // Save sessions after response
      if (message.type === 'llm-response' || message.type === 'llm-error' || (message.payload && message.payload.done)) {
        this.saveSessions();
      }
    },

    handleError(error: string) {
      update(state => ({
        ...state,
        isStreaming: false,
        streamingMessageId: null,
      }));

      // Add error message to current session
      update(state => {
        if (state.currentSession) {
          const errorMessage: Message = {
            id: generateId(),
            type: 'system',
            content: `Error: ${error}`,
            timestamp: Date.now(),
          };
          state.currentSession.messages.push(errorMessage);
        }
        return state;
      });
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

    clearCurrentSession() {
      update(state => {
        if (state.currentSession) {
          state.currentSession.messages = [];
          state.currentSession.updatedAt = Date.now();
        }
        return state;
      });
      this.saveSessions();
    },
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const chatStore = createChatStore();

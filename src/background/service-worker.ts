import type { 
  ExtensionMessage, 
  LLMRequest, 
  LLMResponse, 
  ModelConfig,
  TextSelectionMessage,
  StorageData 
} from '@/types';
import { createModelAdapter } from '@/lib/model-adapters';

// Helper function to send messages to side panel
async function sendMessageToSidePanel(message: any) {
  try {
    console.log('🚀 Attempting to send message to side panel:', message);

    // Try multiple methods to ensure message delivery

    // Method 1: Direct runtime message
    chrome.runtime.sendMessage(message);
    console.log('✅ Sent via runtime.sendMessage');

    // Method 2: Query and send to specific tabs (fallback)
    const tabs = await chrome.tabs.query({});
    console.log('📋 Found tabs:', tabs.length);

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id!, message);
        console.log(`✅ Sent to tab ${tab.id}`);
      } catch (tabError) {
        // Ignore tab errors (normal for tabs without content scripts)
      }
    }

  } catch (error) {
    console.error('❌ Failed to send message to side panel:', error);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set up default settings
    await initializeDefaultSettings();
    
    // Create context menus
    createContextMenus();
  }
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.selectionText && tab?.id) {
    const action = info.menuItemId as string;
    const message: TextSelectionMessage = {
      type: 'text-selected',
      payload: {
        text: info.selectionText,
        action: action as 'summarize' | 'translate' | 'explain',
        url: tab.url || '',
        title: tab.title || '',
      },
    };
    
    // Open side panel and send the selected text
    await chrome.sidePanel.open({ tabId: tab.id });
    
    // Wait a bit for side panel to load, then send message
    setTimeout(() => {
      chrome.runtime.sendMessage(message);
    }, 500);
  }
});

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    switch (message.type) {
      case 'ask-llm':
        await handleLLMRequest(message as LLMRequest, sendResponse);
        break;
        
      case 'get-storage':
        const data = await getStorageData();
        sendResponse(data);
        break;
        
      case 'set-storage':
        await setStorageData(message.payload);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

async function handleLLMRequest(request: LLMRequest, sendResponse: (response?: any) => void) {
  try {
    const { messages, modelConfig, stream = true } = request.payload;
    
    // Validate model configuration
    if (!modelConfig.apiKey) {
      throw new Error('API key not configured');
    }
    
    const adapter = createModelAdapter(modelConfig);
    


    // Convert messages to API format
    const apiMessages = messages
      .filter(msg => {
        const isValid = msg.content &&
                       msg.content.trim() &&
                       msg.type &&
                       ['user', 'assistant', 'system'].includes(msg.type);
        if (!isValid) {
          console.warn('Filtering out invalid message:', {
            id: msg.id,
            type: msg.type,
            hasContent: !!msg.content,
            contentLength: msg.content?.length || 0
          });
        }
        return isValid;
      })
      .map(msg => ({
        role: msg.type as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

    // Final validation
    const invalidMessages = apiMessages.filter(msg => !msg.role || !msg.content);
    if (invalidMessages.length > 0) {
      throw new Error(`Invalid messages found: ${invalidMessages.length} messages have empty role or content`);
    }

    const apiRequest = {
      model: modelConfig.model,
      messages: apiMessages,
      stream,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    };

    console.log('API request:', apiRequest);

    const response = await adapter.sendRequest(apiRequest);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    if (stream) {
      console.log('🚀 Starting stream processing...');
      let chunkCount = 0;

      // Handle streaming response
      for await (const chunk of adapter.streamResponse(response)) {
        chunkCount++;
        console.log(`📦 Processing chunk ${chunkCount}:`, chunk);

        const content = chunk.choices[0]?.delta?.content || '';
        const done = chunk.choices[0]?.finish_reason !== undefined;

        console.log(`📝 Content: "${content}", Done: ${done}`);

        const streamMessage: LLMResponse = {
          type: 'llm-chunk',
          requestId: request.requestId,
          payload: {
            content,
            done,
          },
        };

        console.log('📤 Sending to side panel:', streamMessage);
        // Send chunk to side panel
        await sendMessageToSidePanel(streamMessage);
      }

      console.log(`✅ Stream completed with ${chunkCount} chunks`);
    } else {
      // Handle non-streaming response
      const data = await response.json();
      const transformedResponse = adapter.transformResponse(data);
      
      const responseMessage: LLMResponse = {
        type: 'llm-response',
        requestId: request.requestId,
        payload: {
          content: transformedResponse.choices[0]?.message?.content || '',
          done: true,
        },
      };
      
      await sendMessageToSidePanel(responseMessage);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('LLM request error:', error);
    
    const errorMessage: LLMResponse = {
      type: 'llm-error',
      requestId: request.requestId,
      payload: {
        error: error.message,
      },
    };
    
    await sendMessageToSidePanel(errorMessage);
    sendResponse({ error: error.message });
  }
}

async function initializeDefaultSettings() {
  const defaultData: StorageData = {
    modelSettings: {},
    chatSessions: [],
    userPreferences: {
      language: 'zh',
      theme: 'auto',
      defaultModel: '',
      autoOpenSidePanel: false,
    },
  };
  
  await chrome.storage.local.set(defaultData);
}

function createContextMenus() {
  chrome.contextMenus.create({
    id: 'summarize',
    title: '用 AI 总结',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'translate',
    title: '用 AI 翻译',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'explain',
    title: '用 AI 解释',
    contexts: ['selection'],
  });
}

async function getStorageData(): Promise<StorageData> {
  return await chrome.storage.local.get() as StorageData;
}

async function setStorageData(data: Partial<StorageData>) {
  await chrome.storage.local.set(data);
}

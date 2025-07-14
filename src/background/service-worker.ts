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
function sendMessageToSidePanel(message: any) {
  try {
    // Send message to all extension contexts
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // This is normal when no listeners are present
      }
    });
  } catch (error) {
    console.error('Failed to send message to side panel:', error);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Set up default settings
    await initializeDefaultSettings();

    // Create context menus
    createContextMenus();

    // Initialize side panel
    await initializeSidePanel();
  }
});

// Initialize side panel
async function initializeSidePanel() {
  try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      // Set side panel to open on action click
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    // Side panel behavior not supported in older Chrome versions
  }
}



// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      // For Chrome 114+, use the new sidePanel API
      if (chrome.sidePanel && (chrome.sidePanel as any).open) {
        await (chrome.sidePanel as any).open({ windowId: tab.windowId });
      } else if (chrome.sidePanel && chrome.sidePanel.setOptions) {
        // Fallback: enable side panel for this tab
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          enabled: true,
          path: 'panel.html'
        });
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
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
    try {
      if (chrome.sidePanel && (chrome.sidePanel as any).open) {
        await (chrome.sidePanel as any).open({ windowId: tab.windowId });
      } else if (chrome.sidePanel && chrome.sidePanel.setOptions) {
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          enabled: true,
          path: 'panel.html'
        });
      }
    } catch (error) {
      console.error('❌ [Background] Failed to open side panel for text selection:', error);
    }
    
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

        // Notify all contexts about storage update
        try {
          // Send message to all tabs with the extension
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'storage-updated',
                payload: message.payload
              }).catch(() => {
                // Ignore errors for tabs without content script
              });
            }
          }

          // Also send to side panel if it's open
          chrome.runtime.sendMessage({
            type: 'storage-updated',
            payload: message.payload
          }).catch(() => {
            // Ignore if no listeners
          });
        } catch (error) {
          console.log('Failed to notify about storage update:', error);
        }

        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ error: errorMessage });
  }
}

async function handleLLMRequest(request: LLMRequest, sendResponse: (response?: any) => void) {
  try {
    const { messages, modelConfig, stream = true } = request.payload;

    // Check if model is configured
    if (!modelConfig || modelConfig.provider === 'none' || !modelConfig.apiKey) {
      sendMessageToSidePanel({
        type: 'llm-error',
        requestId: request.requestId,
        error: 'No model configured. Please configure a model in settings.'
      });
      return;
    }

    // Validate API key
    if (!modelConfig.apiKey.trim()) {
      sendMessageToSidePanel({
        type: 'llm-error',
        requestId: request.requestId,
        error: 'API key not configured. Please add your API key in settings.'
      });
      return;
    }

    const adapter = createModelAdapter(modelConfig);
    


    // Convert messages to API format
    const apiMessages = messages
      .filter(msg => {
        const isValid = msg.content &&
                       msg.content.trim() &&
                       msg.type &&
                       ['user', 'assistant', 'system'].includes(msg.type);
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
    };

    const response = await adapter.sendRequest(apiRequest);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (stream) {
      // Handle streaming response
      let chunkCount = 0;
      let hasFinished = false;

      try {
        const streamIterator = adapter.streamResponse(response);

        // Add timeout for the entire streaming process
        const streamTimeout = setTimeout(() => {
          hasFinished = true;
        }, 60000); // 60 second timeout

        try {
          for await (const chunk of streamIterator) {
            chunkCount++;

            const content = chunk.choices[0]?.delta?.content || '';
            const reasoning = chunk.choices[0]?.delta?.reasoning || '';
            const done = chunk.choices[0]?.finish_reason !== null && chunk.choices[0]?.finish_reason !== undefined;

            if (done) {
              hasFinished = true;
              clearTimeout(streamTimeout);
            }

            // 发送所有块，包括空内容的块（如角色块）和结束块
            // 只要有delta对象或者已完成，就发送
            const hasDelta = chunk.choices[0]?.delta !== undefined;

            console.log(`🔍 [Service Worker] Chunk ${chunkCount}:`, {
              content: content ? content.substring(0, 100) + '...' : '',
              contentLength: content.length,
              reasoning: reasoning ? reasoning.substring(0, 100) + '...' : '',
              reasoningLength: reasoning.length,
              done,
              hasDelta,
              willSend: hasDelta || done,
              finishReason: chunk.choices[0]?.finish_reason,
              chunkStructure: {
                hasChoices: !!chunk.choices,
                choicesLength: chunk.choices?.length || 0,
                hasDelta: !!chunk.choices?.[0]?.delta,
                deltaKeys: chunk.choices?.[0]?.delta ? Object.keys(chunk.choices[0].delta) : []
              }
            });

            if (hasDelta || done) {
              const streamMessage: LLMResponse = {
                type: 'llm-chunk',
                requestId: request.requestId,
                payload: {
                  content,
                  reasoning,
                  done,
                },
              };

              console.log(`📤 [Service Worker] Sending message:`, {
                type: streamMessage.type,
                requestId: streamMessage.requestId,
                hasContent: !!content,
                hasReasoning: !!reasoning,
                done: streamMessage.payload.done
              });
              await sendMessageToSidePanel(streamMessage);
              console.log(`✅ [Service Worker] Message sent successfully`);
            } else {
              console.log(`❌ [Service Worker] Skipping chunk ${chunkCount} - no delta and not done`);
            }

            // Break if we've been marked as finished (by timeout or other means)
            if (hasFinished) {
              break;
            }
          }
        } finally {
          clearTimeout(streamTimeout);
        }

        // Ensure we send a final done message if we haven't already
        if (!hasFinished) {
          const finalMessage: LLMResponse = {
            type: 'llm-chunk',
            requestId: request.requestId,
            payload: {
              content: '',
              done: true,
            },
          };
          await sendMessageToSidePanel(finalMessage);
        }
      } catch (streamError) {
        console.error('Streaming error:', streamError);

        // Always send a completion message even if streaming failed
        const errorCompletionMessage: LLMResponse = {
          type: 'llm-chunk',
          requestId: request.requestId,
          payload: {
            content: '',
            done: true,
          },
        };
        await sendMessageToSidePanel(errorCompletionMessage);

        throw streamError;
      }
    } else {
      // Handle non-streaming response
      const data = await response.json();
      const transformedResponse = adapter.transformResponse(data);
      
      const responseMessage: LLMResponse = {
        type: 'llm-response',
        requestId: request.requestId,
        payload: {
          content: transformedResponse.choices[0]?.message?.content || '',
          reasoning: transformedResponse.choices[0]?.message?.reasoning || '',
          done: true,
        },
      };
      
      await sendMessageToSidePanel(responseMessage);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('LLM request error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    sendMessageToSidePanel({
      type: 'llm-error',
      requestId: request.requestId,
      error: errorMessage,
    });

    sendResponse({ error: errorMessage });
  }
}

async function initializeDefaultSettings() {
  // Check if settings already exist to avoid overwriting user data
  const existingData = await chrome.storage.local.get();

  const defaultData: StorageData = {
    modelSettings: existingData.modelSettings || {},
    serviceProviders: existingData.serviceProviders || {},
    chatSessions: existingData.chatSessions || [],
    userPreferences: {
      theme: 'auto',
      language: 'zh',
      defaultModel: '',
      lastSelectedModel: '',
      fontSize: 'medium',
      messageDensity: 'normal',
      ...existingData.userPreferences,
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

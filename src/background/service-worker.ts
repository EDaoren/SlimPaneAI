import type {
  ExtensionMessage,
  LLMRequest,
  LLMResponse,
  StorageData,
  TextSelectionMessage,
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
    // Silently handle errors
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
          path: 'panel.html',
        });
      }
    } catch (error) {
      // Silently handle side panel errors
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
          path: 'panel.html',
        });
      }
    } catch (error) {
      // Silently handle side panel errors
    }

    // Wait a bit for side panel to load, then send message
    setTimeout(() => {
      chrome.runtime.sendMessage(message);
    }, 500);
  }
});

/**
 * 检测是否是特殊页面URL（不支持内容提取）
 */
function isSpecialPageUrl(url: string): boolean {
  if (!url) return true;

  // 浏览器内部页面
  const browserProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'edge-extension://',
    'moz://',
    'moz-extension://',
    'about:',
    'view-source:',
    'file://',
    'devtools://',
    'data:',
  ];

  if (browserProtocols.some((protocol) => url.startsWith(protocol))) {
    return true;
  }

  // 特殊页面
  const specialPages = [
    'newtab',
    'extensions',
    'settings',
    'history',
    'downloads',
    'bookmarks',
    'flags',
    'version',
    'blank',
    'home',
    'config',
  ];

  // 检查URL是否包含特殊页面关键词
  const urlLower = url.toLowerCase();
  if (
    specialPages.some(
      (page) =>
        urlLower.includes(`/${page}`) ||
        urlLower.includes(`/${page}.html`) ||
        urlLower.includes(`about:${page}`)
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Handle page content extraction request from side panel
 */
async function handleExtractPageContent(sendResponse: (response?: any) => void) {
  try {
    console.log('SlimPaneAI: Background handling extract-page-content');

    // Get current active tab with detailed error handling
    let tabs;
    try {
      tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (error) {
      console.error('SlimPaneAI: Failed to query tabs:', error);
      throw new Error('无法访问浏览器标签页，请检查扩展权限');
    }

    const [tab] = tabs;

    if (!tab) {
      console.warn('SlimPaneAI: No active tab found');
      throw new Error('未找到活动标签页');
    }

    if (!tab.id) {
      console.warn('SlimPaneAI: Tab has no ID:', tab);
      throw new Error('标签页ID无效');
    }

    if (!tab.url) {
      console.warn('SlimPaneAI: Tab has no URL:', tab);
      throw new Error('标签页URL无效，可能是新标签页或特殊页面');
    }

    console.log('SlimPaneAI: Active tab found:', tab.url);
    console.log('SlimPaneAI: Tab ID:', tab.id);
    console.log('SlimPaneAI: Tab title:', tab.title);

    // Check if it's a special page that doesn't support content extraction
    if (isSpecialPageUrl(tab.url)) {
      console.log('SlimPaneAI: Special page detected, skipping extraction:', tab.url);
      sendResponse({
        success: true,
        content: null,
        title: tab.title || 'Special Page',
        url: tab.url,
        error: '当前页面不支持内容提取',
      });
      return;
    }

    try {
      console.log('SlimPaneAI: Injecting content script to tab:', tab.id);
      // Try to inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });

      console.log('SlimPaneAI: Content script injection successful');
      // Wait for script initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (injectionError) {
      console.warn(
        'SlimPaneAI: Content script injection failed or already exists:',
        injectionError
      );
      // Continue, script might already exist
    }

    // Send extraction request to content script with retry
    let response;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`SlimPaneAI: Sending message to content script (attempt ${retryCount + 1})`);
        response = await chrome.tabs.sendMessage(tab.id, {
          type: 'extract-simple-content',
        });
        console.log('SlimPaneAI: Content script response:', response);
        break;
      } catch (messageError) {
        console.warn(`SlimPaneAI: Message failed (attempt ${retryCount + 1}):`, messageError);
        retryCount++;
        if (retryCount >= maxRetries) {
          // 提供更友好的错误信息
          let errorMessage = '无法与页面通信，请刷新页面后重试';

          if (messageError instanceof Error) {
            if (messageError.message.includes('Could not establish connection')) {
              errorMessage = '无法连接到页面，请刷新页面后重试';
            } else if (messageError.message.includes('Extension context invalidated')) {
              errorMessage = '扩展已更新，请刷新页面后重试';
            } else if (messageError.message.includes('Cannot access')) {
              errorMessage = '无法访问此页面，可能是权限限制';
            } else if (messageError.message.includes('Receiving end does not exist')) {
              errorMessage = '页面未准备就绪，请刷新页面后重试';
            }
          }

          throw new Error(errorMessage);
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * retryCount));
      }
    }

    if (response?.success) {
      sendResponse({
        success: true,
        content: response.content, // 可能是 null
        title: response.title || tab.title || 'Unknown Page',
        url: tab.url,
        metadata: response.metadata,
        blocks: response.blocks || [],
        error: response.error, // 传递错误信息
      });
    } else {
      throw new Error(response?.error || 'Content extraction failed');
    }
  } catch (error) {
    console.error('SlimPaneAI: Background content extraction failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Content extraction failed',
    });
  }
}

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
              chrome.tabs
                .sendMessage(tab.id, {
                  type: 'storage-updated',
                  payload: message.payload,
                })
                .catch(() => {
                  // Ignore errors for tabs without content script
                });
            }
          }

          // Also send to side panel if it's open
          chrome.runtime
            .sendMessage({
              type: 'storage-updated',
              payload: message.payload,
            })
            .catch(() => {
              // Ignore if no listeners
            });
        } catch (error) {
          // Silently handle notification errors
        }

        sendResponse({ success: true });
        break;

      case 'extract-page-content':
        await handleExtractPageContent(sendResponse);
        break;

      case 'page-content-extracted':
      case 'pdf-processing-status':
        // Forward page content messages to side panel
        sendMessageToSidePanel(message);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
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
        error: 'No model configured. Please configure a model in settings.',
      });
      return;
    }

    // Validate API key
    if (!modelConfig.apiKey.trim()) {
      sendMessageToSidePanel({
        type: 'llm-error',
        requestId: request.requestId,
        error: 'API key not configured. Please add your API key in settings.',
      });
      return;
    }

    const adapter = createModelAdapter(modelConfig);

    // Convert messages to API format
    const apiMessages = messages
      .filter((msg) => {
        const isValid =
          msg.content &&
          msg.content.trim() &&
          msg.type &&
          ['user', 'assistant', 'system'].includes(msg.type);
        return isValid;
      })
      .map((msg) => ({
        role: msg.type as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

    // Final validation
    const invalidMessages = apiMessages.filter((msg) => !msg.role || !msg.content);
    if (invalidMessages.length > 0) {
      throw new Error(
        `Invalid messages found: ${invalidMessages.length} messages have empty role or content`
      );
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
            const done =
              chunk.choices[0]?.finish_reason !== null &&
              chunk.choices[0]?.finish_reason !== undefined;

            if (done) {
              hasFinished = true;
              clearTimeout(streamTimeout);
            }

            // 发送所有块，包括空内容的块（如角色块）和结束块
            // 只要有delta对象或者已完成，就发送
            const hasDelta = chunk.choices[0]?.delta !== undefined;

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

              await sendMessageToSidePanel(streamMessage);
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
        // Handle streaming errors silently

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
    // Handle LLM request errors

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
      pageContentEnabled: true,
      autoExtractContent: false,
      showContentPanel: false,
      pageChatSystemPrompt:
        '你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。要求：1. 仔细阅读和理解网页内容；2. 基于内容事实进行回答，不要编造信息；3. 如果问题无法从内容中找到答案，请明确说明；4. 回答要准确、简洁、有条理。',
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
  return (await chrome.storage.local.get()) as StorageData;
}

async function setStorageData(data: Partial<StorageData>) {
  await chrome.storage.local.set(data);
}

/**
 * SlimPaneAI Content Script
 * 负责页面内容提取和消息处理
 */

import { extractAndProcessCurrentPage } from '../lib/web-content';
import type { ProcessingResult } from '../lib/web-content';

// 全局类型声明
declare global {
  interface Window {
    slimPaneAIContentScriptLoaded?: boolean;
  }
}

// 当前文本选择
let currentSelection = '';

/**
 * 初始化内容脚本
 */
function init() {
  console.log('SlimPaneAI: Content script initialized');
  console.log('SlimPaneAI: Page URL:', window.location.href);

  // 监听文本选择
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // 监听来自背景脚本的消息
  chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * 处理文本选择
 */
function handleTextSelection() {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    currentSelection = selection.toString().trim();
  } else {
    currentSelection = '';
  }
}

/**
 * 处理消息
 */
function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  switch (message.type) {
    case 'get-selection':
      sendResponse({ selection: currentSelection });
      break;

    case 'highlight-text':
      highlightText(message.payload.text);
      break;

    case 'get-page-content':
    case 'extract-simple-content':
      handleExtractContent(sendResponse);
      return true; // 保持消息通道开放以支持异步响应

    default:
      break;
  }
}

/**
 * 处理内容提取请求
 */
async function handleExtractContent(sendResponse: (response?: any) => void) {
  try {
    console.log('SlimPaneAI: Starting content extraction for:', window.location.href);

    // 使用新的内容提取器
    const result = await extractAndProcessCurrentPage({
      enableBlacklist: true,
      enableFallback: true,
      minContentLength: 50
    });

    if (result.success && result.content) {
      sendResponse({
        success: true,
        content: result.content.rawText,
        title: result.content.metadata.title,
        metadata: result.content.metadata,
        blocks: result.content.blocks,
        error: null
      });
    } else {
      sendResponse({
        success: true,
        content: null,
        title: document.title,
        metadata: null,
        blocks: [],
        error: result.error || '页面内容提取失败或当前页面不支持内容提取'
      });
    }
  } catch (error) {
    console.error('SlimPaneAI: Content extraction failed:', error);
    sendResponse({
      success: false,
      content: null,
      title: document.title,
      metadata: null,
      blocks: [],
      error: error instanceof Error ? error.message : '内容提取过程中发生未知错误'
    });
  }
}

/**
 * 高亮文本功能
 */
function highlightText(text: string) {
  if (!text) return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const textNodes: Text[] = [];
  let node;
  
  while (node = walker.nextNode()) {
    if (node.textContent && node.textContent.includes(text)) {
      textNodes.push(node as Text);
    }
  }
  
  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    
    const content = textNode.textContent || '';
    const index = content.indexOf(text);
    
    if (index !== -1) {
      const beforeText = content.substring(0, index);
      const highlightedText = content.substring(index, index + text.length);
      const afterText = content.substring(index + text.length);
      
      const beforeNode = document.createTextNode(beforeText);
      const highlightNode = document.createElement('mark');
      highlightNode.style.backgroundColor = '#ffeb3b';
      highlightNode.style.color = '#000';
      highlightNode.textContent = highlightedText;
      const afterNode = document.createTextNode(afterText);
      
      parent.insertBefore(beforeNode, textNode);
      parent.insertBefore(highlightNode, textNode);
      parent.insertBefore(afterNode, textNode);
      parent.removeChild(textNode);
    }
  });
}

/**
 * 获取页面上下文信息
 */
function getPageContext() {
  return {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    selection: currentSelection,
  };
}

// 确保脚本只初始化一次
if (!window.slimPaneAIContentScriptLoaded) {
  window.slimPaneAIContentScriptLoaded = true;

  // 当DOM准备就绪时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

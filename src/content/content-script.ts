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

// URL变化监听相关
let currentUrl = window.location.href;
let urlChangeObserver: MutationObserver | null = null;
let historyChangeListener: (() => void) | null = null;

/**
 * 初始化内容脚本
 */
function init() {
  // 监听文本选择
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // 监听来自背景脚本的消息
  chrome.runtime.onMessage.addListener(handleMessage);

  // 初始化SPA URL变化监听
  initSPAUrlChangeDetection();
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

/**
 * 初始化SPA URL变化检测
 */
function initSPAUrlChangeDetection() {
  // 方法1: 监听History API变化
  setupHistoryChangeListener();

  // 方法2: 监听DOM变化（特别针对Discourse等论坛）
  setupDOMChangeObserver();

  // 方法3: 定期检查URL变化（兜底机制）
  setupPeriodicUrlCheck();
}

/**
 * 设置History API变化监听
 */
function setupHistoryChangeListener() {
  // 保存原始的pushState和replaceState方法
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // 重写pushState方法
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    handleUrlChange('pushState');
  };

  // 重写replaceState方法
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    handleUrlChange('replaceState');
  };

  // 监听popstate事件（浏览器前进后退）
  window.addEventListener('popstate', () => {
    handleUrlChange('popstate');
  });
}

/**
 * 设置DOM变化观察器（针对Discourse等动态内容）
 */
function setupDOMChangeObserver() {
  // 检查是否是Discourse论坛
  const isDiscourse = checkIfDiscourse();

  if (isDiscourse) {

    // Discourse特有的观察器
    urlChangeObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        // 检查是否有新的帖子内容加载
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasContentNodes = addedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Discourse特有的内容选择器
              return element.matches('.topic-post, .post-stream, .cooked, .topic-body') ||
                     element.querySelector('.topic-post, .post-stream, .cooked, .topic-body');
            }
            return false;
          });

          if (hasContentNodes) {
            shouldCheck = true;
          }
        }
      });

      if (shouldCheck) {
        // 延迟检查，让内容完全加载
        setTimeout(() => {
          handleUrlChange('dom-mutation');
        }, 300);
      }
    });

    // 观察主要内容区域
    const contentArea = document.querySelector('#main-outlet, .ember-application, body') || document.body;
    urlChangeObserver.observe(contentArea, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  } else {
    // 通用SPA观察器
    urlChangeObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasSignificantContent = addedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // 检查是否是主要内容区域
              return element.matches('main, article, .content, .main-content, [role="main"]') ||
                     element.querySelector('main, article, .content, .main-content, [role="main"]');
            }
            return false;
          });

          if (hasSignificantContent) {
            shouldCheck = true;
          }
        }
      });

      if (shouldCheck) {
        setTimeout(() => {
          handleUrlChange('dom-mutation');
        }, 500);
      }
    });

    // 观察整个body
    urlChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }
}

/**
 * 设置定期URL检查（兜底机制）
 */
function setupPeriodicUrlCheck() {
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      handleUrlChange('periodic-check');
    }
  }, 2000); // 每2秒检查一次
}

/**
 * 检查是否是Discourse论坛
 */
function checkIfDiscourse(): boolean {
  // 检查多个Discourse特征
  const hasDiscourseClass = document.body.classList.contains('discourse') ||
                           document.documentElement.classList.contains('discourse');
  const hasDiscourseElements = document.querySelector('.ember-application, #main-outlet, .topic-list, .topic-post');
  const hasDiscourseScript = document.querySelector('script[src*="discourse"]');
  const hasDiscourseMetaTag = document.querySelector('meta[name="generator"][content*="Discourse"]');

  return !!(hasDiscourseClass || hasDiscourseElements || hasDiscourseScript || hasDiscourseMetaTag);
}

/**
 * 处理URL变化
 */
function handleUrlChange(source: string) {
  const newUrl = window.location.href;

  if (newUrl !== currentUrl) {
    const oldUrl = currentUrl;
    currentUrl = newUrl;

    // 通知background script URL变化
    chrome.runtime.sendMessage({
      type: 'spa-url-changed',
      payload: {
        oldUrl: oldUrl,
        newUrl: newUrl,
        title: document.title,
        source: source,
        timestamp: Date.now()
      }
    }).catch(() => {
      // 静默处理通知失败
    });
  }
}

/**
 * 清理监听器
 */
function cleanup() {
  if (urlChangeObserver) {
    urlChangeObserver.disconnect();
    urlChangeObserver = null;
  }

  if (historyChangeListener) {
    historyChangeListener();
    historyChangeListener = null;
  }
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanup);

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

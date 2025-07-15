// 内容脚本 - 不使用ES6模块导入，直接实现功能

// Track current text selection
let currentSelection = '';

// Page monitoring
let lastUrl = '';

// Initialize content script
function init() {
  console.log('SlimPaneAI: 内容脚本已初始化');
  console.log('SlimPaneAI: 页面URL:', window.location.href);

  // Listen for text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    currentSelection = selection.toString().trim();
    
    // Only store selection, don't auto-trigger anything
    // User needs to use context menu or side panel to interact
  } else {
    currentSelection = '';
  }
}

function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  switch (message.type) {
    case 'get-selection':
      sendResponse({ selection: currentSelection });
      break;

    case 'highlight-text':
      highlightText(message.payload.text);
      break;

    case 'extract-simple-content':
      handleExtractSimpleContent(sendResponse);
      break;

    default:
      break;
  }
}

function highlightText(text: string) {
  // Simple text highlighting functionality
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

// Utility function to get page context
function getPageContext() {
  return {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    selection: currentSelection,
  };
}

// 移除复杂的页面监听功能，只保留简单的内容提取

/**
 * Handle simple content extraction for page chat
 */
function handleExtractSimpleContent(sendResponse: (response?: any) => void) {
  try {
    console.log('SlimPaneAI: 开始提取页面内容');
    console.log('SlimPaneAI: 当前页面URL:', window.location.href);
    console.log('SlimPaneAI: 页面标题:', document.title);

    // 使用专业的内容处理器
    const processedContent = processCurrentPageContent();

    console.log('SlimPaneAI: 提取的内容长度:', processedContent.rawText.length);
    console.log('SlimPaneAI: 内容块数量:', processedContent.blocks.length);
    console.log('SlimPaneAI: 内容预览:', processedContent.rawText.substring(0, 200) + '...');

    sendResponse({
      success: true,
      content: processedContent.rawText,
      title: processedContent.metadata.title,
      metadata: processedContent.metadata,
      blocks: processedContent.blocks
    });
  } catch (error) {
    console.error('SlimPaneAI: 内容提取失败:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract content'
    });
  }
}

/**
 * 专业的页面内容处理（基于新架构）
 */
function processCurrentPageContent() {
  const metadata = extractMetadata();
  const cleanedContent = extractAndCleanContent();
  const blocks = segmentIntoBlocks(cleanedContent);
  const rawText = blocks.map(b => b.content).join('\n\n');

  return {
    metadata,
    blocks,
    rawText,
  };
}

/**
 * 提取页面元数据
 */
function extractMetadata() {
  const url = window.location.href;
  const title = document.title || extractTitleFromContent();
  const author = extractAuthor();
  const publishedTime = extractPublishedTime();
  const language = detectLanguage();

  return {
    url,
    title,
    author,
    publishedTime,
    capturedAt: new Date().toISOString(),
    language,
    wordCount: 0, // 将在后面计算
  };
}

/**
 * 提取和清理主要内容
 */
function extractAndCleanContent(): string {
  // 尝试使用简化的 Readability 算法
  const readabilityContent = trySimpleReadability();
  if (readabilityContent) {
    return readabilityContent;
  }

  // 回退到自定义提取算法
  return customContentExtraction();
}

/**
 * 简化版 Readability 算法
 */
function trySimpleReadability(): string | null {
  try {
    // 创建文档副本以避免修改原始DOM
    const documentClone = document.cloneNode(true) as Document;

    const article = simpleReadability(documentClone);
    return article ? htmlToText(article.innerHTML) : null;
  } catch (error) {
    console.warn('Readability extraction failed:', error);
    return null;
  }
}

/**
 * 简化版 Readability 核心算法
 */
function simpleReadability(doc: Document): Element | null {
  // 移除噪声元素
  const noisySelectors = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ads', '.ad', '.sidebar', '.menu',
    '.navigation', '.social', '.share', '.comment', '.popup',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
  ];

  noisySelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // 寻找主要内容容器
  const contentSelectors = [
    'main', 'article', '[role="main"]',
    '.main-content', '.content', '.post-content',
    '.article-content', '.entry-content', '#content',
    '#main-content', '.post-body', '.article-body'
  ];

  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element && isContentRich(element)) {
      return element;
    }
  }

  // 如果没找到，使用body但进一步清理
  const body = doc.body;
  if (body) {
    removeRemainingNoise(body);
    return body;
  }

  return null;
}

/**
 * 判断元素是否内容丰富
 */
function isContentRich(element: Element): boolean {
  const text = element.textContent || '';
  const wordCount = text.split(/\s+/).length;
  const linkDensity = calculateLinkDensity(element);

  return wordCount > 100 && linkDensity < 0.3;
}

/**
 * 计算链接密度
 */
function calculateLinkDensity(element: Element): number {
  const totalText = (element.textContent || '').length;
  const linkText = Array.from(element.querySelectorAll('a'))
    .reduce((sum, link) => sum + (link.textContent || '').length, 0);

  return totalText > 0 ? linkText / totalText : 0;
}

/**
 * 移除剩余噪声
 */
function removeRemainingNoise(element: Element): void {
  // 移除小的文本块
  const allElements = element.querySelectorAll('*');
  allElements.forEach(el => {
    const text = el.textContent || '';
    if (text.length < 20 && !['img', 'video', 'audio'].includes(el.tagName.toLowerCase())) {
      const parent = el.parentElement;
      if (parent && parent.children.length > 1) {
        el.remove();
      }
    }
  });
}

/**
 * HTML转文本
 */
function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  // 处理特殊元素
  const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    h.textContent = '\n\n## ' + h.textContent + '\n\n';
  });

  const lists = div.querySelectorAll('li');
  lists.forEach(li => {
    li.textContent = '• ' + li.textContent + '\n';
  });

  const paragraphs = div.querySelectorAll('p');
  paragraphs.forEach(p => {
    p.textContent = p.textContent + '\n\n';
  });

  return div.textContent || '';
}

/**
 * 自定义内容提取（回退方案）
 */
function customContentExtraction(): string {
  const body = document.body;
  if (!body) return '';

  const clone = body.cloneNode(true) as HTMLElement;

  // 移除噪声元素
  const noisySelectors = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ads', '.ad', '.sidebar', '.menu'
  ];

  noisySelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  return htmlToText(clone.innerHTML);
}

/**
 * 将内容分割成语义块
 */
function segmentIntoBlocks(content: string) {
  const blocks: any[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  let position = 0;
  let blockId = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let type = 'paragraph';
    let level: number | undefined;

    // 检测标题
    if (trimmed.startsWith('## ')) {
      type = 'heading';
      level = 2;
    } else if (trimmed.startsWith('# ')) {
      type = 'heading';
      level = 1;
    } else if (trimmed.startsWith('• ')) {
      type = 'list';
    } else if (trimmed.startsWith('```') || trimmed.includes('function') || trimmed.includes('class ')) {
      type = 'code';
    } else if (trimmed.startsWith('>')) {
      type = 'quote';
    }

    blocks.push({
      id: `block-${blockId++}`,
      type,
      content: trimmed,
      level,
      position: position++
    });
  }

  return blocks;
}

/**
 * 提取作者信息
 */
function extractAuthor(): string | undefined {
  const selectors = [
    '[name="author"]',
    '[property="article:author"]',
    '.author',
    '.byline',
    '.post-author'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const content = element.getAttribute('content') || element.textContent;
      if (content && content.trim()) {
        return content.trim();
      }
    }
  }

  return undefined;
}

/**
 * 提取发布时间
 */
function extractPublishedTime(): string | undefined {
  const selectors = [
    '[name="publish_date"]',
    '[property="article:published_time"]',
    'time[datetime]',
    '.publish-date',
    '.post-date'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const datetime = element.getAttribute('datetime') ||
                      element.getAttribute('content') ||
                      element.textContent;
      if (datetime && datetime.trim()) {
        return datetime.trim();
      }
    }
  }

  return undefined;
}

/**
 * 检测语言
 */
function detectLanguage(): string {
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return htmlLang;

  const metaLang = document.querySelector('meta[http-equiv="content-language"]');
  if (metaLang) {
    const content = metaLang.getAttribute('content');
    if (content) return content;
  }

  // 简单的语言检测
  const text = document.body?.textContent || '';
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = text.length;

  if (chineseChars / totalChars > 0.1) {
    return 'zh';
  }

  return 'en';
}

/**
 * 从内容中提取标题（回退方案）
 */
function extractTitleFromContent(): string {
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }

  const firstHeading = document.querySelector('h2, h3');
  if (firstHeading && firstHeading.textContent) {
    return firstHeading.textContent.trim();
  }

  return 'Untitled Page';
}

/**
 * 简单的页面内容提取（用于网页聊天）
 */
function extractSimplePageContent(): string {
  // 尝试提取主要内容
  const mainContent = extractMainContentSimple();
  if (mainContent && mainContent.length > 100) {
    return mainContent;
  }

  // 如果主要内容太少，提取body内容
  return extractBodyContentSimple();
}

/**
 * 提取主要内容区域（简化版）
 */
function extractMainContentSimple(): string {
  const mainSelectors = [
    'main',
    'article',
    '.main-content',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '#main-content'
  ];

  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = extractTextFromElementSimple(element as HTMLElement);
      if (text.length > 100) {
        return text;
      }
    }
  }

  return '';
}

/**
 * 提取body内容（简化版）
 */
function extractBodyContentSimple(): string {
  const body = document.body;
  if (!body) return '';

  // 克隆body以避免修改原始DOM
  const clonedBody = body.cloneNode(true) as HTMLElement;

  // 移除不需要的元素
  removeUnwantedElementsSimple(clonedBody);

  return extractTextFromElementSimple(clonedBody);
}

/**
 * 移除不需要的元素（简化版）
 */
function removeUnwantedElementsSimple(element: HTMLElement): void {
  const unwantedSelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    '.navigation',
    '.nav',
    '.menu',
    '.sidebar',
    '.advertisement',
    '.ads',
    '.ad',
    '.popup',
    '.modal',
    '.cookie-notice',
    '.social-share',
    '.comments',
    '.comment'
  ];

  unwantedSelectors.forEach(selector => {
    const elements = element.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
}

/**
 * 从元素中提取文本（简化版）
 */
function extractTextFromElementSimple(element: HTMLElement): string {
  const text = element.innerText || element.textContent || '';

  // 清理文本：移除多余空白，限制长度
  const cleanText = text
    .replace(/\s+/g, ' ')
    .trim();

  // 限制长度（约8000个字符，大约2000个token）
  const maxLength = 8000;
  if (cleanText.length > maxLength) {
    return cleanText.substring(0, maxLength) + '...';
  }

  return cleanText;
}

// 确保脚本只初始化一次
if (!window.slimPaneAIContentScriptLoaded) {
  window.slimPaneAIContentScriptLoaded = true;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// 声明全局标识
declare global {
  interface Window {
    slimPaneAIContentScriptLoaded?: boolean;
  }
}

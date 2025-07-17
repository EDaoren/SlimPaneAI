// 内容脚本 - 使用动态导入加载 Readability

// 全局类型声明
declare global {
  interface Window {
    slimPaneAIContentScriptLoaded?: boolean;
    Readability?: any;
    isProbablyReaderable?: (doc: Document) => boolean;
  }
}

// 动态导入 Readability
let Readability: any = null;
let isProbablyReaderable: any = null;

// 初始化 Readability
async function initializeReadability() {
  try {
    if (typeof window !== 'undefined' && window.Readability) {
      // 如果已经在全局作用域中可用
      Readability = window.Readability;
      isProbablyReaderable = window.isProbablyReaderable;
      console.log('SlimPaneAI: Using global Readability');
      return true;
    }

    // 尝试动态导入
    const readabilityModule = await import('@mozilla/readability');
    Readability = readabilityModule.Readability;
    isProbablyReaderable = readabilityModule.isProbablyReaderable;
    console.log('SlimPaneAI: Readability imported successfully');
    return true;
  } catch (error) {
    console.warn('SlimPaneAI: Failed to load Readability:', error);
    return false;
  }
}

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

    case 'get-page-content':
    case 'extract-simple-content':
      handleExtractSimpleContent(sendResponse);
      return true; // 保持消息通道开放以支持异步响应
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
async function handleExtractSimpleContent(sendResponse: (response?: any) => void) {
  try {
    console.log('SlimPaneAI: 开始提取页面内容');
    console.log('SlimPaneAI: 当前页面URL:', window.location.href);
    console.log('SlimPaneAI: 页面标题:', document.title);

    // 使用专业的内容处理器
    const processedContent = await processCurrentPageContent();

    if (!processedContent) {
      console.log('SlimPaneAI: 内容提取返回null，可能是特殊页面或提取失败');
      sendResponse({
        success: true,
        content: null,
        title: document.title,
        metadata: null,
        blocks: [],
        error: '页面内容提取失败或当前页面不支持内容提取'
      });
      return;
    }

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
 * 检测是否是特殊页面（不适合内容提取）
 */
function isSpecialPage(): boolean {
  const url = window.location.href;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Chrome 内部页面
  if (protocol === 'chrome:' || protocol === 'chrome-extension:' || protocol === 'moz-extension:' || protocol === 'edge-extension:') {
    console.log('SlimPaneAI: Skipping browser internal page:', url);
    return true;
  }

  // 浏览器特殊页面
  const specialPages = [
    'chrome://extensions/',
    'chrome://settings/',
    'chrome://history/',
    'chrome://downloads/',
    'chrome://bookmarks/',
    'chrome://flags/',
    'chrome://version/',
    'chrome://newtab/',
    'about:blank',
    'about:newtab',
    'about:home',
    'edge://extensions/',
    'edge://settings/',
    'moz-extension://',
    'chrome-extension://'
  ];

  if (specialPages.some(page => url.startsWith(page))) {
    console.log('SlimPaneAI: Skipping special page:', url);
    return true;
  }

  // 本地文件
  if (protocol === 'file:') {
    console.log('SlimPaneAI: Skipping local file:', url);
    return true;
  }

  // 空白页面或无效页面
  if (!hostname || hostname === 'localhost' && url.includes('chrome-extension')) {
    console.log('SlimPaneAI: Skipping invalid page:', url);
    return true;
  }

  // 检查页面是否有实际内容
  const bodyText = document.body?.textContent?.trim();
  if (!bodyText || bodyText.length < 50) {
    console.log('SlimPaneAI: Skipping page with insufficient content');
    return true;
  }

  return false;
}

/**
 * 基于 Mozilla Readability + CSS 黑名单的页面内容处理
 */
async function processCurrentPageContent() {
  try {
    // 首先检查是否是特殊页面
    if (isSpecialPage()) {
      console.log('SlimPaneAI: Skipping content extraction for special page');
      return null;
    }

    // 使用新的 Readability 提取器
    const extractedContent = await extractContentWithReadability();

    if (!extractedContent) {
      console.warn('SlimPaneAI: Readability extraction failed');
      return null;
    }

    return formatReadabilityResult(extractedContent);

  } catch (error) {
    console.error('SlimPaneAI: Content processing failed:', error);
    return null;
  }
}

/**
 * 格式化 Readability 提取结果
 */
function formatReadabilityResult(extractedContent: any) {
  try {
    // 构建元数据
    const metadata = {
      url: window.location.href,
      title: extractedContent.title || document.title,
      author: extractedContent.byline,
      publishedTime: extractPublishedTime(),
      capturedAt: new Date().toISOString(),
      language: extractedContent.lang || detectLanguage(),
      wordCount: extractedContent.length || 0,
      siteName: extractedContent.siteName
    };

    // 清理文本内容，移除多余的换行和空白
    const cleanedText = cleanTextContent(extractedContent.textContent);
    const cleanedExcerpt = extractedContent.excerpt ? cleanTextContent(extractedContent.excerpt) : '';

    // 简单的内容分块（保持与原有接口兼容）
    const blocks = segmentTextIntoBlocks(cleanedText);

    return {
      metadata,
      blocks,
      rawText: cleanedText,
      htmlContent: extractedContent.content, // 额外提供 HTML 内容
      excerpt: cleanedExcerpt
    };
  } catch (error) {
    console.error('SlimPaneAI: Content processing failed:', error);
    return createEmptyResult();
  }
}



/**
 * 清理文本内容，移除多余的换行和空白
 *
 * 这个函数处理以下问题：
 * 1. 连续的多个换行替换为单个换行
 * 2. 保留段落结构，但移除无意义的换行
 * 3. 保留列表和代码块的格式
 * 4. 移除行首和行尾的空白
 */
function cleanTextContent(text: string): string {
  if (!text) return '';

  // 步骤 1: 标准化换行符（将所有换行符统一为 \n）
  let cleaned = text.replace(/\r\n|\r/g, '\n');

  // 步骤 2: 移除行首和行尾的空白
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // 步骤 3: 将连续的 3 个或更多换行符替换为 2 个换行符（保留段落分隔）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 步骤 4: 处理特殊情况 - 保留列表格式
  // 匹配列表项（以 -、*、+、数字. 开头的行）
  const listItemRegex = /^(\s*[-*+]|\s*\d+\.)\s/;

  // 分割为行，处理每一行
  const lines = cleaned.split('\n');
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 如果是空行或列表项，直接添加
    if (line === '' || listItemRegex.test(line)) {
      processedLines.push(line);
      continue;
    }

    // 检查当前行是否应该与上一行合并
    // 条件：上一行不是空行，不是列表项，当前行不是标题（以 # 开头）
    if (i > 0 &&
        processedLines[processedLines.length - 1] !== '' &&
        !listItemRegex.test(processedLines[processedLines.length - 1]) &&
        !line.startsWith('#')) {
      // 合并当前行到上一行，用空格分隔
      processedLines[processedLines.length - 1] += ' ' + line;
    } else {
      processedLines.push(line);
    }
  }

  // 步骤 5: 重新组合处理后的行
  cleaned = processedLines.join('\n');

  // 步骤 6: 移除文本开头和结尾的空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 使用 Mozilla Readability 提取内容
 */
async function extractContentWithReadability() {
  try {
    // 检查是否是特殊页面
    if (isSpecialPage()) {
      console.log('SlimPaneAI: Skipping content extraction for special page');
      return null;
    }

    // 确保 Readability 已加载
    if (!Readability || !isProbablyReaderable) {
      const loaded = await initializeReadability();
      if (!loaded) {
        console.warn('SlimPaneAI: Readability library not available');
        return null;
      }
    }

    // 检查页面是否适合 Readability 处理
    if (!isProbablyReaderable(document)) {
      console.warn('SlimPaneAI: Page is not readerable');
      return null;
    }

    // 创建文档副本
    const clonedDoc = document.cloneNode(true) as Document;

    // 应用黑名单移除噪声元素
    applyReadabilityBlacklist(clonedDoc);

    // 使用 Readability 提取内容
    const reader = new Readability(clonedDoc, {
      debug: false,
      maxElemsToParse: 0,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['highlight', 'code', 'pre']
    });

    const article = reader.parse();

    if (!article) {
      console.warn('SlimPaneAI: Readability failed to parse article');
      return null;
    }

    console.log('SlimPaneAI: Readability extraction successful');
    console.log('SlimPaneAI: Title:', article.title);
    console.log('SlimPaneAI: Content length:', article.textContent.length);

    return {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent || '',
      length: article.length || 0,
      excerpt: article.excerpt || '',
      byline: article.byline || undefined,
      dir: article.dir || undefined,
      siteName: article.siteName || undefined,
      lang: article.lang || undefined
    };

  } catch (error) {
    console.error('SlimPaneAI: Readability extraction error:', error);
    return null;
  }
}

/**
 * 应用 Readability 黑名单移除噪声元素
 */
function applyReadabilityBlacklist(doc: Document): void {
  const host = window.location.hostname.replace(/^www\./, '');

  // 全局黑名单
  const globalBlacklist = [
    // 广告相关
    '.ad', '.ads', '.advert', '.advertisement', '.adsense', '.ad-container',
    '.google-ads', '.banner-ad', '.sponsored', '.promo',

    // 导航和页面结构
    'nav', 'header', 'footer', 'aside',
    '.navigation', '.nav', '.navbar', '.menu', '.sidebar',
    '.breadcrumb', '.breadcrumbs',

    // 弹窗和模态框
    '.popup', '.modal', '.overlay', '.lightbox',
    '.subscribe-modal', '.newsletter-popup', '.cookie-notice',

    // 社交和分享
    '.social', '.social-share', '.share-buttons', '.social-media',
    '.follow-us', '.social-links',

    // 其他噪声
    '.related-posts', '.recommended', '.trending', '.most-read',
    '.pagination', '.tags', '.categories', '.author-bio',
    '.newsletter', '.subscription', '.signup'
  ];

  // 站点特定规则
  const siteRules: Record<string, string[]> = {
    'weibo.com': ['.WB_footer', '.wb_feed_nav', '.WB_global_nav'],
    'zhihu.com': ['.Post-SideActions', '.Recommended', '.Card-section'],
    'tieba.baidu.com': ['.left_section', '.right_section', '.nav_wrap'],
    'csdn.net': ['.tool-box', '.recommend-box', '.aside-box'],
    'jianshu.com': ['.note-bottom', '.follow-detail', '.recommended-notes'],
    'juejin.cn': ['.sidebar', '.recommended-area', '.author-info-block'],
    'stackoverflow.com': ['.js-sidebar', '.s-sidebarwidget', '.module'],
    'reddit.com': ['.sidebar', '.side', '.promotedlink'],
    'github.com': ['.Header', '.footer', '.js-header-wrapper']
  };

  const selectors = [
    ...globalBlacklist,
    ...(siteRules[host] || [])
  ];

  if (selectors.length === 0) return;

  try {
    const elementsToRemove = doc.querySelectorAll(selectors.join(','));
    elementsToRemove.forEach((el) => {
      try {
        el.remove();
      } catch (error) {
        console.warn('Failed to remove element:', error);
      }
    });

    console.log(`SlimPaneAI: Removed ${elementsToRemove.length} noise elements using blacklist`);
  } catch (error) {
    console.warn('SlimPaneAI: Failed to apply blacklist:', error);
  }
}



/**
 * 将文本分割成简单的块
 */
function segmentTextIntoBlocks(text: string) {
  const blocks: any[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  let blockId = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;

    blocks.push({
      id: `block-${blockId++}`,
      type: 'paragraph',
      content: trimmed,
      position: blockId
    });
  }

  return blocks;
}

/**
 * 提取页面元数据（保持向后兼容）
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

/**
 * 测试内容提取（可在控制台调用）
 */
function testContentExtraction() {
  console.log('SlimPaneAI: 测试 Mozilla Readability 内容提取');

  const processedContent = processCurrentPageContent();

  console.log('SlimPaneAI: 提取的内容长度:', processedContent.rawText.length);
  console.log('SlimPaneAI: 内容块数量:', processedContent.blocks.length);
  console.log('SlimPaneAI: 内容预览:', processedContent.rawText.substring(0, 500) + '...');

  if (processedContent.htmlContent) {
    console.log('SlimPaneAI: HTML 内容长度:', processedContent.htmlContent.length);
  }

  if (processedContent.excerpt) {
    console.log('SlimPaneAI: 摘要:', processedContent.excerpt);
  }

  // 显示换行符统计
  const lineBreaks = (processedContent.rawText.match(/\n/g) || []).length;
  const doubleLineBreaks = (processedContent.rawText.match(/\n\n/g) || []).length;
  const tripleLineBreaks = (processedContent.rawText.match(/\n\n\n/g) || []).length;

  console.log('SlimPaneAI: 换行符统计:');
  console.log('  - 单换行符:', lineBreaks);
  console.log('  - 双换行符:', doubleLineBreaks);
  console.log('  - 三换行符及以上:', tripleLineBreaks);

  return processedContent;
}

/**
 * 测试文本清理功能（可在控制台调用）
 */
function testTextCleaning(sampleText?: string) {
  const testText = sampleText || `这是第一段文本。


这是第二段文本，
有一些不必要的换行。


这是第三段。

- 这是一个列表项
- 这是另一个列表项


这是最后一段文本。`;

  console.log('SlimPaneAI: 测试文本清理功能');
  console.log('原始文本:');
  console.log(JSON.stringify(testText));

  const cleaned = cleanTextContent(testText);
  console.log('清理后文本:');
  console.log(JSON.stringify(cleaned));

  console.log('长度对比:');
  console.log('  - 原始长度:', testText.length);
  console.log('  - 清理后长度:', cleaned.length);
  console.log('  - 节省字符:', testText.length - cleaned.length);
  console.log('  - 节省比例:', ((testText.length - cleaned.length) / testText.length * 100).toFixed(2) + '%');

  return { original: testText, cleaned: cleaned };
}

// 将测试函数暴露到全局作用域，方便在控制台调用
(window as any).testSlimPaneContentExtraction = testContentExtraction;
(window as any).testSlimPaneTextCleaning = testTextCleaning;

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

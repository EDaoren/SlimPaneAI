/**
 * Readability 库加载器
 * 将 Mozilla Readability 库注入到页面中
 */

(function() {
  // 检查是否已加载
  if (window.Readability && window.isProbablyReaderable) {
    console.log('SlimPaneAI: Readability already loaded');
    return;
  }

  // 加载 Readability 库
  try {
    // 注意：这里使用的是 Mozilla Readability 的 UMD 构建版本
    // 实际使用时需要确保路径正确
    const readabilityScript = document.createElement('script');
    readabilityScript.src = chrome.runtime.getURL('readability.js');
    readabilityScript.onload = function() {
      console.log('SlimPaneAI: Readability library loaded successfully');
    };
    readabilityScript.onerror = function(error) {
      console.error('SlimPaneAI: Failed to load Readability library:', error);
    };
    document.head.appendChild(readabilityScript);
  } catch (error) {
    console.error('SlimPaneAI: Error loading Readability:', error);
  }
})();

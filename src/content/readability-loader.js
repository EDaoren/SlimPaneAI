/**
 * Readability 库加载器
 * 将 Mozilla Readability 库注入到页面中
 */

(function() {
  // 检查是否已加载
  if (window.Readability && window.isProbablyReaderable) {
    return;
  }

  // 加载 Readability 库
  try {
    // 注意：这里使用的是 Mozilla Readability 的 UMD 构建版本
    // 实际使用时需要确保路径正确
    const readabilityScript = document.createElement('script');
    readabilityScript.src = chrome.runtime.getURL('readability.js');
    readabilityScript.onload = function() {
      // Readability library loaded successfully
    };
    readabilityScript.onerror = function(error) {
      // Failed to load Readability library
    };
    document.head.appendChild(readabilityScript);
  } catch (error) {
    // Error loading Readability
  }
})();

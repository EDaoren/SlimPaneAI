/**
 * Error message formatting utilities
 */

export interface ErrorTemplate {
  title: string;
  message: string;
  suggestions: string[];
  type: 'config' | 'network' | 'api' | 'general';
}

const ERROR_TEMPLATES: Record<string, ErrorTemplate> = {
  noModel: {
    title: '🤖 未配置AI模型',
    message: '请先配置一个AI模型才能开始聊天。',
    suggestions: [
      '点击右侧工具栏 ⚙️ 打开设置页面',
      '选择一个AI服务提供商（OpenAI、Claude、Gemini等）',
      '输入有效的API密钥',
      '保存配置后即可开始聊天'
    ],
    type: 'config'
  },
  apiKey: {
    title: '🔑 API密钥未配置',
    message: '当前模型的API密钥未正确配置。',
    suggestions: [
      '检查API密钥是否正确输入',
      '确认API密钥是否有效且未过期',
      '检查API密钥是否有足够的使用额度'
    ],
    type: 'config'
  },
  network: {
    title: '🌐 网络连接问题',
    message: '无法连接到AI服务，请检查网络连接。',
    suggestions: [
      '检查网络连接是否正常',
      '尝试刷新页面重新发送',
      '如果使用代理，请检查代理设置'
    ],
    type: 'network'
  },
  rateLimit: {
    title: '⏱️ 请求频率限制',
    message: '请求过于频繁，请稍后再试。',
    suggestions: [
      '等待几分钟后重新发送消息',
      '检查API使用配额是否充足',
      '考虑升级API服务计划'
    ],
    type: 'api'
  }
};

/**
 * Format error message into user-friendly HTML
 */
export function formatErrorMessage(error: string): string {
  const cleanError = error.replace(/^Error:\s*/, '');
  
  // Determine error type and get template
  let template: ErrorTemplate;
  
  if (cleanError.includes('No model configured') || cleanError.includes('API key not configured')) {
    template = cleanError.includes('API key') ? ERROR_TEMPLATES.apiKey : ERROR_TEMPLATES.noModel;
  } else if (cleanError.includes('rate limit') || cleanError.includes('429')) {
    template = ERROR_TEMPLATES.rateLimit;
  } else if (cleanError.includes('network') || cleanError.includes('fetch')) {
    template = ERROR_TEMPLATES.network;
  } else {
    // Generic error
    template = {
      title: '❌ 发生错误',
      message: cleanError,
      suggestions: [
        '请稍后重试',
        '如果问题持续，请联系技术支持'
      ],
      type: 'general'
    };
  }

  return createErrorHTML(template, extractRequestId(cleanError));
}

/**
 * Create formatted HTML for error display
 */
function createErrorHTML(template: ErrorTemplate, requestId?: string): string {
  const suggestions = template.suggestions
    .map(suggestion => `• ${suggestion}`)
    .join('\n');

  return `<div style="color: #dc2626; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">
<strong>${template.title}</strong>

${template.message}

**💡 解决建议：**
${suggestions}

${requestId ? `**🔍 请求ID：** ${requestId}` : ''}
</div>`;
}

/**
 * Extract request ID from error message
 */
function extractRequestId(error: string): string | undefined {
  const match = error.match(/request id:\s*([^)]+)/);
  return match ? match[1] : undefined;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: string): boolean {
  const recoverablePatterns = [
    'rate limit',
    'network',
    'timeout',
    'temporary'
  ];
  
  return recoverablePatterns.some(pattern => 
    error.toLowerCase().includes(pattern)
  );
}

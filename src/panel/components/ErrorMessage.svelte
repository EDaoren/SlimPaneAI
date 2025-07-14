<script lang="ts">
  import type { Message } from '@/types';
  import { t } from '@/lib/i18n';

  export let message: Message;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 解析错误消息，提取有用信息
  function parseErrorMessage(content: string): { title: string; details: string; suggestion?: string } {
    const errorContent = content.replace(/^Error:\s*/, '');

    // 处理API错误
    if (errorContent.includes('API request failed')) {
      if (errorContent.includes('429') || errorContent.includes('rate_limit_exceeded')) {
        return {
          title: '请求频率限制',
          details: '当前API请求过于频繁，服务器负载饱和',
          suggestion: '建议等待几分钟后重新发送消息'
        };
      } else if (errorContent.includes('401') || errorContent.includes('unauthorized')) {
        return {
          title: 'API密钥错误',
          details: 'API密钥无效或已过期',
          suggestion: '请检查设置中的API密钥配置'
        };
      } else if (errorContent.includes('403') || errorContent.includes('forbidden')) {
        return {
          title: '访问被拒绝',
          details: 'API密钥没有访问权限',
          suggestion: '请检查API密钥的权限设置'
        };
      } else if (errorContent.includes('500') || errorContent.includes('502') || errorContent.includes('503')) {
        return {
          title: '服务器错误',
          details: 'AI服务提供商服务器出现问题',
          suggestion: '请稍后重试，或尝试切换其他模型'
        };
      }
    }

    // 处理上游负载饱和错误
    if (errorContent.includes('上游负载已饱和') || errorContent.includes('负载饱和')) {
      return {
        title: '服务器繁忙',
        details: '当前服务器负载过高，请稍后再试',
        suggestion: '建议等待几分钟后重新发送消息'
      };
    }
    
    // 处理网络错误
    if (errorContent.includes('Network') || errorContent.includes('fetch')) {
      return {
        title: '网络连接错误',
        details: '无法连接到AI服务',
        suggestion: '请检查网络连接或稍后重试'
      };
    }
    
    // 处理模型配置错误
    if (errorContent.includes('No model configured')) {
      return {
        title: '模型未配置',
        details: '请先配置AI模型',
        suggestion: '点击右侧工具栏的设置按钮进行配置'
      };
    }
    
    // 处理超时错误
    if (errorContent.includes('timeout')) {
      return {
        title: '请求超时',
        details: '请求处理时间过长',
        suggestion: '请稍后重试，或尝试简化问题'
      };
    }
    
    // 默认错误处理
    return {
      title: '请求失败',
      details: errorContent,
      suggestion: '请稍后重试'
    };
  }

  $: errorInfo = parseErrorMessage(message.content);
</script>

<div class="error-message mb-4">
  <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
    <!-- Error Icon -->
    <div class="flex-shrink-0">
      <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
        <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>

    <!-- Error Content -->
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-medium text-red-900 mb-1">
        {errorInfo.title}
      </h4>
      
      <p class="text-sm text-red-700 mb-2">
        {errorInfo.details}
      </p>
      
      {#if errorInfo.suggestion}
        <p class="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
          💡 {errorInfo.suggestion}
        </p>
      {/if}
      
      <!-- Timestamp -->
      <div class="mt-2 text-xs text-red-500">
        {formatTime(message.timestamp)}
      </div>
    </div>

    <!-- Retry Button (可选) -->
    <div class="flex-shrink-0">
      <button
        class="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
        title="重试"
        on:click={() => {
          // 可以添加重试逻辑
          console.log('Retry button clicked');
        }}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .error-message {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<script lang="ts">
  /**
   * ModelAvatar - 统一的模型头像组件
   * 为不同的AI模型显示对应的彩色头像图标
   */
  
  export let modelId: string | undefined = undefined;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  
  // 尺寸映射
  const sizeMap = {
    sm: { container: '1.5rem', icon: '0.75rem' },
    md: { container: '2rem', icon: '1rem' },
    lg: { container: '2.5rem', icon: '1.25rem' }
  };
  
  $: currentSize = sizeMap[size];
  
  // 为不同模型生成头像配置
  function getModelAvatar(modelId?: string) {
    if (!modelId) {
      return {
        bg: '#6b7280',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }

    const modelLower = modelId.toLowerCase();
    
    // GPT 系列 - 绿色
    if (modelLower.includes('gpt')) {
      return {
        bg: '#10b981',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }
    
    // Claude 系列 - 橙色
    if (modelLower.includes('claude')) {
      return {
        bg: '#f59e0b',
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
      };
    }
    
    // Gemini 系列 - 蓝色
    if (modelLower.includes('gemini')) {
      return {
        bg: '#3b82f6',
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
      };
    }
    
    // o1 系列 - 紫色
    if (modelLower.includes('o1')) {
      return {
        bg: '#8b5cf6',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      };
    }
    
    // 默认 - 灰色
    return {
      bg: '#6b7280',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
    };
  }
  
  $: avatar = getModelAvatar(modelId);
</script>

<div 
  class="model-avatar"
  style="
    width: {currentSize.container}; 
    height: {currentSize.container}; 
    background-color: {avatar.bg}; 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    flex-shrink: 0;
  "
>
  <svg 
    style="width: {currentSize.icon}; height: {currentSize.icon}; color: white;" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d={avatar.icon} 
    />
  </svg>
</div>

<style>
  .model-avatar {
    transition: transform 0.2s ease;
  }
  
  .model-avatar:hover {
    transform: scale(1.05);
  }
</style>

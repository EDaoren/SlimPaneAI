<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import type { Message } from '@/types';
  import MessageItem from './MessageItem.svelte';
  import TypingIndicator from './TypingIndicator.svelte';

  export let messages: Message[];
  export let isStreaming: boolean;

  let container: HTMLElement;
  let scrollTop = 0;
  let containerHeight = 0;
  let totalHeight = 0;
  
  // 虚拟滚动配置
  const ITEM_HEIGHT = 120; // 估算的消息项高度
  const BUFFER_SIZE = 5; // 缓冲区大小（上下各渲染几个额外项目）
  const OVERSCAN = 3; // 预渲染项目数

  // 过滤系统消息
  $: displayMessages = messages.filter(msg => msg.type !== 'system');
  $: totalHeight = displayMessages.length * ITEM_HEIGHT;

  // 计算可见范围
  $: visibleStart = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  $: visibleEnd = Math.min(
    displayMessages.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
  );
  $: visibleMessages = displayMessages.slice(visibleStart, visibleEnd);

  // 计算偏移量
  $: offsetY = visibleStart * ITEM_HEIGHT;

  let shouldAutoScroll = true;
  let lastMessageCount = 0;

  // 检查是否应该自动滚动
  function checkAutoScroll() {
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    shouldAutoScroll = isNearBottom;
  }

  // 滚动到底部
  async function scrollToBottom() {
    if (!container) return;
    
    await tick();
    container.scrollTop = container.scrollHeight;
  }

  // 处理滚动事件
  function handleScroll() {
    if (!container) return;
    
    scrollTop = container.scrollTop;
    checkAutoScroll();
  }

  // 处理容器大小变化
  function handleResize() {
    if (!container) return;
    containerHeight = container.clientHeight;
  }

  // 监听消息变化
  $: if (displayMessages.length > lastMessageCount) {
    lastMessageCount = displayMessages.length;
    if (shouldAutoScroll) {
      setTimeout(scrollToBottom, 0);
    }
  }

  // 监听流式传输状态变化
  $: if (isStreaming && shouldAutoScroll) {
    setTimeout(scrollToBottom, 0);
  }

  onMount(() => {
    handleResize();
    scrollToBottom();
    
    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  });

  afterUpdate(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  });
</script>

<div 
  class="virtual-message-list"
  bind:this={container}
  bind:clientHeight={containerHeight}
  on:scroll={handleScroll}
>
  <!-- 虚拟滚动容器 -->
  <div class="virtual-container" style="height: {totalHeight}px;">
    <!-- 可见消息项 -->
    <div class="visible-items" style="transform: translateY({offsetY}px);">
      {#each visibleMessages as message, index (message.id)}
        <div class="message-wrapper" data-index={visibleStart + index}>
          <MessageItem {message} />
        </div>
      {/each}
      
      {#if isStreaming}
        <div class="message-wrapper typing-wrapper">
          <TypingIndicator />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .virtual-message-list {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }

  .virtual-container {
    position: relative;
    width: 100%;
  }

  .visible-items {
    position: relative;
    width: 100%;
  }

  .message-wrapper {
    min-height: 120px; /* 与 ITEM_HEIGHT 保持一致 */
    padding: 0.5rem 1rem;
  }

  .typing-wrapper {
    min-height: 60px;
  }

  /* 优化滚动性能 */
  .virtual-message-list {
    will-change: scroll-position;
    -webkit-overflow-scrolling: touch;
  }

  .visible-items {
    will-change: transform;
  }

  /* 滚动条样式 */
  .virtual-message-list::-webkit-scrollbar {
    width: 6px;
  }

  .virtual-message-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .virtual-message-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .virtual-message-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
</style>

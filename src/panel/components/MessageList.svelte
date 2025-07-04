<script lang="ts">
  import type { Message } from '@/types';
  import MessageItem from './MessageItem.svelte';
  import TypingIndicator from './TypingIndicator.svelte';
  
  export let messages: Message[];
  export let isStreaming: boolean;
  
  // Filter out system messages for display (they're used for prompts)
  $: displayMessages = messages.filter(msg => msg.type !== 'system');
</script>

<div class="message-list p-4 pb-2">
  {#each displayMessages as message (message.id)}
    <MessageItem {message} />
  {/each}

  {#if isStreaming}
    <TypingIndicator />
  {/if}
</div>

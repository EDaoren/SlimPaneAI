<script lang="ts">
  // TypingIndicator component for showing loading state
</script>

<div class="typing-indicator" style="display: flex; gap: 0.5rem; margin-left: 2.5rem;">

  <!-- Typing Animation -->
  <div style="flex: 1; min-width: 0;">
    <div style="padding: 0.75rem 0; max-width: 85%;">
      <div style="display: flex; align-items: center; gap: 0.25rem;">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6b7280;
    animation: typing 1.4s infinite ease-in-out;
  }
  
  .typing-dot:nth-child(1) { 
    animation-delay: -0.32s; 
  }
  
  .typing-dot:nth-child(2) { 
    animation-delay: -0.16s; 
  }
  
  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let options: Array<{ id: string; name: string; icon?: string }> = [];
  export let value = '';
  export let placeholder = '请选择...';
  export let disabled = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let variant: 'default' | 'primary' | 'secondary' = 'default';
  export let compact = false; // 紧凑模式，只显示图标和简短名称

  const dispatch = createEventDispatcher<{
    change: { value: string; option: any };
  }>();

  let isOpen = false;
  let selectContainer: HTMLElement;
  let dropdownMenu: HTMLElement;
  let shouldOpenUpward = false;
  let shouldAlignRight = false;

  $: selectedOption = options.find(opt => opt.id === value);
  $: displayText = compact && selectedOption
    ? getCompactDisplayName(selectedOption.name)
    : selectedOption?.name || placeholder;

  // 获取紧凑显示名称
  function getCompactDisplayName(fullName: string): string {
    // 提取模型名称的关键部分
    if (fullName.includes('GPT-4')) return 'GPT-4';
    if (fullName.includes('GPT-3.5')) return 'GPT-3.5';
    if (fullName.includes('Claude 3 Opus')) return 'Opus';
    if (fullName.includes('Claude 3 Sonnet')) return 'Sonnet';
    if (fullName.includes('Claude 3 Haiku')) return 'Haiku';
    if (fullName.includes('Gemini Pro')) return 'Gemini';
    if (fullName.includes('自定义')) return '自定义';

    // 默认取第一个单词或前8个字符
    const words = fullName.split(' ');
    return words.length > 1 ? words[words.length - 1] : fullName.substring(0, 8);
  }

  // Size classes
  $: sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5'
  }[size];

  // Variant classes
  $: variantClasses = {
    default: 'bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500',
    primary: 'bg-blue-50 border-blue-200 hover:border-blue-300 focus:border-blue-500',
    secondary: 'bg-gray-50 border-gray-200 hover:border-gray-300 focus:border-gray-400'
  }[variant];

  function calculateDropdownPosition() {
    if (!selectContainer) return;

    const rect = selectContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const maxDropdownHeight = 300;
    const estimatedDropdownWidth = 400; // 最大宽度

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = viewportWidth - rect.left;

    // 计算垂直位置
    shouldOpenUpward = spaceBelow < maxDropdownHeight && spaceAbove > maxDropdownHeight;

    // 计算水平位置 - 如果右侧空间不足，则右对齐
    shouldAlignRight = spaceRight < estimatedDropdownWidth && rect.right > estimatedDropdownWidth;
  }

  function toggleDropdown() {
    if (disabled) return;

    if (!isOpen) {
      calculateDropdownPosition();
    }

    isOpen = !isOpen;
  }

  function selectOption(option: any) {
    value = option.id;
    isOpen = false;
    dispatch('change', { value: option.id, option });
  }

  function handleClickOutside(event: MouseEvent) {
    if (selectContainer && !selectContainer.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleDropdown();
        break;
      case 'Escape':
        isOpen = false;
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          toggleDropdown();
        } else {
          // Focus next option
          const currentIndex = options.findIndex(opt => opt.id === value);
          const nextIndex = Math.min(currentIndex + 1, options.length - 1);
          if (nextIndex !== currentIndex) {
            selectOption(options[nextIndex]);
          }
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex(opt => opt.id === value);
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (prevIndex !== currentIndex) {
            selectOption(options[prevIndex]);
          }
        }
        break;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', calculateDropdownPosition);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('resize', calculateDropdownPosition);
  });
</script>

<div class="custom-select" bind:this={selectContainer}>
  <button
    class="select-trigger {sizeClasses} {variantClasses}"
    class:open={isOpen}
    class:disabled
    on:click={toggleDropdown}
    on:keydown={handleKeydown}
    {disabled}
    type="button"
    role="combobox"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <div class="select-content">
      {#if selectedOption?.icon}
        <span class="option-icon">{selectedOption.icon}</span>
      {/if}
      <span class="select-text" class:placeholder={!selectedOption}>
        {displayText}
      </span>
    </div>
    <svg 
      class="select-arrow" 
      class:rotated={isOpen}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div
      class="dropdown-menu"
      class:upward={shouldOpenUpward}
      class:align-right={shouldAlignRight}
      bind:this={dropdownMenu}
      role="listbox"
    >
      {#each options as option}
        <button
          class="dropdown-option"
          class:selected={option.id === value}
          on:click={() => selectOption(option)}
          type="button"
          role="option"
          aria-selected={option.id === value}
        >
          {#if option.icon}
            <span class="option-icon">{option.icon}</span>
          {/if}
          <span class="option-text">{option.name}</span>
          {#if option.id === value}
            <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-select {
    position: relative;
    width: 100%;
  }

  .select-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid var(--border-secondary);
    border-radius: 8px;
    background: var(--bg-secondary);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 500;
    gap: 8px;
    color: var(--text-primary);
  }

  .select-trigger:hover:not(.disabled) {
    background: var(--bg-tertiary);
    border-color: var(--border-primary);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .select-trigger:focus {
    outline: none;
    background: var(--bg-tertiary);
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .select-trigger.open {
    background: var(--bg-tertiary);
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .select-trigger.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--bg-disabled, #f9fafb);
  }

  .select-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .select-text {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
  }

  .select-text.placeholder {
    color: var(--text-muted);
  }

  .select-arrow {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .select-arrow.rotated {
    transform: rotate(180deg);
  }

  .option-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 100%;
    width: max-content;
    max-width: 400px;
    background: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    padding: 4px;
    animation: slideDown 0.15s ease-out;
  }

  .dropdown-menu.upward {
    top: auto;
    bottom: calc(100% + 4px);
    animation: slideUp 0.15s ease-out;
  }

  .dropdown-menu.align-right {
    left: auto;
    right: 0;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dropdown-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 14px;
    color: var(--text-primary);
  }

  .dropdown-option:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .dropdown-option.selected {
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 500;
  }

  .dropdown-option.selected:hover {
    background: #dbeafe;
  }

  .option-text {
    flex: 1;
    text-align: left;
    white-space: nowrap;
  }

  .check-icon {
    width: 16px;
    height: 16px;
    color: #1d4ed8;
    flex-shrink: 0;
  }

  /* 滚动条样式 */
  .dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }

  .dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }

  .dropdown-menu::-webkit-scrollbar-thumb {
    background: var(--border-secondary);
    border-radius: 3px;
  }

  .dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
</style>

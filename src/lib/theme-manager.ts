import type { UserPreferences } from '@/types';
import { setLanguage } from './i18n';

// 防止重复应用主题的锁
let isApplyingTheme = false;

/**
 * Apply theme to the document with smooth transitions
 * 使用双缓冲技术减少闪烁
 */
export function applyTheme(preferences: UserPreferences) {
  // 防止重复调用
  if (isApplyingTheme) {
    console.log('🎨 [Theme] Theme application already in progress, skipping');
    return;
  }
  const { theme } = preferences;

  // Determine target theme
  let targetTheme: 'light' | 'dark';
  if (theme === 'auto') {
    targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    targetTheme = theme;
  }

  // Get current theme
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  // Only update if theme actually changed
  if (currentTheme !== targetTheme) {
    isApplyingTheme = true;

    // 简单直接的切换：先添加新主题，再移除旧主题
    // 这样确保始终有一个主题类存在，避免无主题状态
    const root = document.documentElement;

    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // 短暂延迟后重置锁
    setTimeout(() => {
      isApplyingTheme = false;
    }, 100);
  } else {
    isApplyingTheme = false;
  }

  // Apply other preferences (these are less likely to cause flicker)
  applyFontSize(preferences.fontSize);
  applyMessageDensity(preferences.messageDensity);

  // Note: Language preference is handled separately to avoid conflicts
}

/**
 * Watch for system theme changes
 */
export function watchSystemTheme(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    callback();
  };

  mediaQuery.addEventListener('change', handleChange);

  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * Apply font size preference with smooth transition
 */
function applyFontSize(fontSize: 'small' | 'medium' | 'large') {
  const root = document.documentElement;
  const targetClass = `font-${fontSize}`;

  // Only update if font size actually changed
  if (!root.classList.contains(targetClass)) {
    requestAnimationFrame(() => {
      // Remove existing font size classes
      root.classList.remove('font-small', 'font-medium', 'font-large');
      // Add new font size class
      root.classList.add(targetClass);
    });
  }
}

/**
 * Apply message density preference with smooth transition
 */
function applyMessageDensity(density: 'compact' | 'normal' | 'relaxed') {
  const root = document.documentElement;
  const targetClass = `density-${density}`;

  // Only update if density actually changed
  if (!root.classList.contains(targetClass)) {
    requestAnimationFrame(() => {
      // Remove existing density classes
      root.classList.remove('density-compact', 'density-normal', 'density-relaxed');
      // Add new density class
      root.classList.add(targetClass);
    });
  }
}

/**
 * Get current system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize theme on app startup
 */
export function initializeTheme(preferences?: UserPreferences) {
  if (preferences) {
    applyTheme(preferences);
  } else {
    // Apply default theme
    const defaultPreferences: UserPreferences = {
      theme: 'auto',
      language: 'zh',
      defaultModel: '',
      lastSelectedModel: '',
      fontSize: 'medium',
      messageDensity: 'normal',
      pageContentEnabled: true,
      autoExtractContent: false,
      showContentPanel: false,
      pageChatSystemPrompt: '你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。要求：1. 仔细阅读和理解网页内容；2. 基于内容事实进行回答，不要编造信息；3. 如果问题无法从内容中找到答案，请明确说明；4. 回答要准确、简洁、有条理。',
      webChatExtractionMode: 'readability'
    };
    applyTheme(defaultPreferences);
  }
}

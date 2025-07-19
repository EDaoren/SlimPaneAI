import type { UserPreferences } from '@/types';
import { setLanguage } from './i18n';

/**
 * Apply theme to the document
 */
export function applyTheme(preferences: UserPreferences) {
  const { theme } = preferences;

  // Remove existing theme classes
  document.documentElement.classList.remove('light', 'dark');

  if (theme === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    // Use explicit theme
    document.documentElement.classList.add(theme);
  }

  // Apply other preferences
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
 * Apply font size preference
 */
function applyFontSize(fontSize: 'small' | 'medium' | 'large') {
  const root = document.documentElement;

  // Remove existing font size classes
  root.classList.remove('font-small', 'font-medium', 'font-large');

  // Add new font size class
  root.classList.add(`font-${fontSize}`);
}

/**
 * Apply message density preference
 */
function applyMessageDensity(density: 'compact' | 'normal' | 'relaxed') {
  const root = document.documentElement;

  // Remove existing density classes
  root.classList.remove('density-compact', 'density-normal', 'density-relaxed');

  // Add new density class
  root.classList.add(`density-${density}`);
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
      pageChatSystemPrompt: '你是一个专业的网页内容分析助手。请基于提供的网页内容回答用户问题。要求：1. 仔细阅读和理解网页内容；2. 基于内容事实进行回答，不要编造信息；3. 如果问题无法从内容中找到答案，请明确说明；4. 回答要准确、简洁、有条理。'
    };
    applyTheme(defaultPreferences);
  }
}

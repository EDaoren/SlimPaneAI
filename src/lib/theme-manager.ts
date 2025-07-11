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

  // Apply language preference
  if (preferences.language) {
    setLanguage(preferences.language as 'zh' | 'en');
  }
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
      messageDensity: 'normal'
    };
    applyTheme(defaultPreferences);
  }
}

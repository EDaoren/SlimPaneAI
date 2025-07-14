import type { UserPreferences } from '@/types';

export interface ThemeVariables {
  // 背景色
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-tertiary': string;
  
  // 文字颜色
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  
  // 边框颜色
  '--border-primary': string;
  '--border-secondary': string;
  
  // 消息气泡
  '--message-user-bg': string;
  '--message-user-text': string;
  '--message-assistant-bg': string;
  '--message-assistant-text': string;
  '--message-assistant-border': string;
  
  // 输入框
  '--input-bg': string;
  '--input-border': string;
  '--input-focus-border': string;
  '--input-focus-shadow': string;
  
  // 字体大小
  '--font-size-base': string;
  '--font-size-small': string;
  '--font-size-large': string;
  
  // 消息密度
  '--message-spacing': string;
  '--message-padding': string;
}

const lightTheme: ThemeVariables = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f8fafc',
  '--bg-tertiary': '#f1f5f9',
  
  '--text-primary': '#111827',
  '--text-secondary': '#374151',
  '--text-muted': '#6b7280',
  
  '--border-primary': '#e5e7eb',
  '--border-secondary': '#d1d5db',
  
  '--message-user-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '--message-user-text': '#ffffff',
  '--message-assistant-bg': '#f8fafc',
  '--message-assistant-text': '#1e293b',
  '--message-assistant-border': '#e2e8f0',
  
  '--input-bg': '#ffffff',
  '--input-border': '#d1d5db',
  '--input-focus-border': '#3b82f6',
  '--input-focus-shadow': '0 0 0 3px rgba(59, 130, 246, 0.1)',
  
  '--font-size-base': '0.875rem',
  '--font-size-small': '0.75rem',
  '--font-size-large': '1rem',
  
  '--message-spacing': '1rem',
  '--message-padding': '0.75rem 1rem',
};

const darkTheme: ThemeVariables = {
  '--bg-primary': '#1f2937',
  '--bg-secondary': '#111827',
  '--bg-tertiary': '#0f172a',
  
  '--text-primary': '#f9fafb',
  '--text-secondary': '#e5e7eb',
  '--text-muted': '#9ca3af',
  
  '--border-primary': '#374151',
  '--border-secondary': '#4b5563',
  
  '--message-user-bg': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  '--message-user-text': '#ffffff',
  '--message-assistant-bg': '#374151',
  '--message-assistant-text': '#f9fafb',
  '--message-assistant-border': '#4b5563',
  
  '--input-bg': '#374151',
  '--input-border': '#4b5563',
  '--input-focus-border': '#3b82f6',
  '--input-focus-shadow': '0 0 0 3px rgba(59, 130, 246, 0.2)',
  
  '--font-size-base': '0.875rem',
  '--font-size-small': '0.75rem',
  '--font-size-large': '1rem',
  
  '--message-spacing': '1rem',
  '--message-padding': '0.75rem 1rem',
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getFontSizeVariables(fontSize: 'small' | 'medium' | 'large'): Partial<ThemeVariables> {
  const fontSizes = {
    small: {
      '--font-size-base': '0.75rem',
      '--font-size-small': '0.625rem',
      '--font-size-large': '0.875rem',
    },
    medium: {
      '--font-size-base': '0.875rem',
      '--font-size-small': '0.75rem',
      '--font-size-large': '1rem',
    },
    large: {
      '--font-size-base': '1rem',
      '--font-size-small': '0.875rem',
      '--font-size-large': '1.125rem',
    },
  };
  
  return fontSizes[fontSize];
}

function getMessageDensityVariables(density: 'compact' | 'normal' | 'relaxed'): Partial<ThemeVariables> {
  const densities = {
    compact: {
      '--message-spacing': '0.5rem',
      '--message-padding': '0.5rem 0.75rem',
    },
    normal: {
      '--message-spacing': '1rem',
      '--message-padding': '0.75rem 1rem',
    },
    relaxed: {
      '--message-spacing': '1.5rem',
      '--message-padding': '1rem 1.25rem',
    },
  };
  
  return densities[density];
}

export function applyTheme(preferences: UserPreferences): void {
  if (typeof document === 'undefined') return;
  
  // 确定使用的主题
  let activeTheme: 'light' | 'dark';
  if (preferences.theme === 'auto') {
    activeTheme = getSystemTheme();
  } else {
    activeTheme = preferences.theme;
  }
  
  // 获取基础主题变量
  const baseTheme = activeTheme === 'dark' ? darkTheme : lightTheme;
  
  // 获取字体大小变量
  const fontSizeVars = getFontSizeVariables(preferences.fontSize);
  
  // 获取消息密度变量
  const densityVars = getMessageDensityVariables(preferences.messageDensity);
  
  // 合并所有变量
  const allVariables = {
    ...baseTheme,
    ...fontSizeVars,
    ...densityVars,
  };
  
  // 应用CSS变量到根元素
  const root = document.documentElement;
  Object.entries(allVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // 添加主题类名到body
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .replace(/font-size-\w+/g, '')
    .replace(/density-\w+/g, '')
    .trim();
    
  document.body.classList.add(
    `theme-${activeTheme}`,
    `font-size-${preferences.fontSize}`,
    `density-${preferences.messageDensity}`
  );
}

// 监听系统主题变化
export function watchSystemTheme(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = () => callback();
  mediaQuery.addEventListener('change', handler);
  
  return () => mediaQuery.removeEventListener('change', handler);
}

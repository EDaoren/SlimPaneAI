import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import CopyButtonPlugin from 'highlightjs-copy';
import { katex } from '@mdit/plugin-katex';

// 初始化 highlightjs-copy 插件
hljs.addPlugin(new CopyButtonPlugin({
  lang: 'zh-CN', // 设置为中文
  callback: (text, el) => {
    // 代码已复制到剪贴板
  }
}));

// 创建markdown-it实例
const md: MarkdownIt = new MarkdownIt({
  html: true,        // 允许HTML标签
  breaks: false,     // 不将换行符转换为<br>
  linkify: true,     // 启用自动链接识别
  typographer: true, // 启用typographer
  highlight: function (str: string, lang: string): string {
    // 使用highlight.js进行代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        const result = hljs.highlight(str, { language: lang });
        return result.value;
      } catch (__) {}
    }
    // 当无法高亮时，返回转义后的HTML以确保安全
    return MarkdownIt().utils.escapeHtml(str);
  }
});

// 使用 @mdit/plugin-katex 插件处理数学公式
md.use(katex, {
  delimiters: 'all', // 支持美元符号和方括号语法
  throwOnError: false,
  errorColor: '#cc0000',
  strict: false,
  trust: false,
  displayMode: false
});

// 让 markdown-it 使用默认的代码块渲染
// highlightjs-copy 插件会自动为所有 <pre><code> 元素添加复制按钮

// 自定义内联代码渲染
md.renderer.rules.code_inline = function (tokens, idx, options, env, renderer) {
  const token = tokens[idx];
  return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`;
};



/**
 * 渲染markdown内容
 * @param content 原始markdown内容
 * @param options 渲染选项
 * @returns 渲染后的HTML
 */
export function renderMarkdown(content: string, options: {
  enableMath?: boolean;
  mathRenderer?: (content: string) => string;
} = {}): string {
  if (!content) return '';

  // 使用 markdown-it 渲染（包含 KaTeX 插件处理数学公式）
  const html = md.render(content);

  return html;
}

/**
 * 为指定容器内的代码块应用高亮
 * @param container 包含代码块的容器元素
 */
export function highlightCodeBlocks(container: HTMLElement): void {
  if (typeof window === 'undefined') return;

  // 查找所有代码块，包括已经高亮的（为了添加复制按钮）
  const codeBlocks = container.querySelectorAll('pre code');
  if (codeBlocks.length === 0) return; // 没有代码块

  codeBlocks.forEach((block) => {
    try {
      const codeElement = block as HTMLElement;
      const preElement = codeElement.parentElement as HTMLElement;

      // 如果还没有hljs类，进行高亮
      if (!codeElement.classList.contains('hljs')) {
        hljs.highlightElement(codeElement);
      }

      // 确保pre元素也有hljs类（用于样式）
      if (preElement && preElement.tagName === 'PRE' && !preElement.classList.contains('hljs')) {
        preElement.classList.add('hljs');
      }
    } catch (error) {
      console.warn('Failed to process code block:', error);
    }
  });
}

/**
 * 检查容器内是否有需要高亮的代码块
 * @param container 包含代码块的容器元素
 * @returns 是否有需要高亮的代码块
 */
export function hasUnhighlightedCodeBlocks(container: HTMLElement): boolean {
  if (typeof window === 'undefined') return false;

  // 检查是否有代码块需要处理（包括添加复制按钮）
  const codeBlocks = container.querySelectorAll('pre code');
  return codeBlocks.length > 0;
}

/**
 * 获取markdown-it实例（用于高级自定义）
 */
export function getMarkdownInstance(): MarkdownIt {
  return md;
}

/**
 * 简单的markdown渲染（不包含数学公式）
 */
export function renderSimpleMarkdown(content: string): string {
  return renderMarkdown(content, { enableMath: false });
}

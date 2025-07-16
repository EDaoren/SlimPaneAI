import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import CopyButtonPlugin from 'highlightjs-copy';
import 'highlight.js/styles/github-dark.css';
import 'highlightjs-copy/dist/highlightjs-copy.min.css';

// 初始化 highlightjs-copy 插件
hljs.addPlugin(new CopyButtonPlugin({
  lang: 'zh-CN', // 设置为中文
  callback: (text, el) => {
    console.log('代码已复制到剪贴板');
  }
}));

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,        // 允许HTML标签
  breaks: false,     // 不将换行符转换为<br>
  linkify: true,     // 自动识别链接
  typographer: true, // 启用一些语言中性的替换和引号美化
  highlight: function (str, lang) {
    // 使用highlight.js进行代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // 使用外部默认转义
  }
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

  let processedContent = content;

  // 如果启用数学公式，先保护数学公式
  const mathBlocks: string[] = [];
  const inlineMathBlocks: string[] = [];
  
  if (options.enableMath && options.mathRenderer) {
    // 保护块级数学公式 $$...$$
    processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      const index = mathBlocks.length;
      const rendered = options.mathRenderer!(math.trim());
      mathBlocks.push(rendered);
      return `__MATH_BLOCK_${index}__`;
    });

    // 保护内联数学公式 $...$
    processedContent = processedContent.replace(/\$([^$\n]+?)\$/g, (match, math) => {
      const index = inlineMathBlocks.length;
      const rendered = options.mathRenderer!(math.trim());
      inlineMathBlocks.push(rendered);
      return `__INLINE_MATH_${index}__`;
    });
  }

  // 使用markdown-it渲染
  let html = md.render(processedContent);

  // 恢复数学公式
  if (options.enableMath) {
    mathBlocks.forEach((math, index) => {
      html = html.replace(`__MATH_BLOCK_${index}__`, math);
    });
    inlineMathBlocks.forEach((math, index) => {
      html = html.replace(`__INLINE_MATH_${index}__`, math);
    });
  }

  // 在客户端环境中，为新渲染的代码块初始化 highlight.js
  if (typeof window !== 'undefined') {
    // 使用 setTimeout 确保 DOM 更新后再初始化
    setTimeout(() => {
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }, 0);
  }

  return html;
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

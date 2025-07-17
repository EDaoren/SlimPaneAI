import App from './App.svelte';
import 'uno.css';
import './style.css';
// 导入 KaTeX 样式
import 'katex/dist/katex.min.css';
// 确保 highlight.js 主题在最后加载，避免被其他样式覆盖
import 'highlight.js/styles/github-dark.css';
import 'highlightjs-copy/dist/highlightjs-copy.min.css';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;

declare module 'highlightjs-copy' {
  interface CopyButtonPluginOptions {
    /**
     * 是否自动隐藏复制按钮 (默认: true)
     * 设置为 false 时复制按钮将始终可见
     */
    autohide?: boolean;

    /**
     * 复制完成后的回调函数
     */
    callback?: (text: string, el: HTMLElement) => void;

    /**
     * 在复制前处理文本的钩子函数
     */
    hook?: (text: string, el: HTMLElement) => string;

    /**
     * 语言设置，用于无障碍访问
     */
    lang?: string;
  }

  /**
   * highlight.js 复制按钮插件
   */
  export default class CopyButtonPlugin {
    constructor(options?: CopyButtonPluginOptions);
  }
}
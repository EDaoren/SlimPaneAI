# 轻量版 Sider 浏览器插件设计与实现方案

---

## 1. 需求澄清 — 明确“轻量”与“必备”如何定义

| 维度 | 推荐做法 | 典型重功能（可暂不实现） |
|------|----------|--------------------------|
| **目标用户** | 自己 & 小团队；不需要 SaaS 级计费、团队管理 | 企业工单、多人协作等 |
| **核心场景** | - 网页侧边栏即时提问<br>- 选中文本后：① 总结 ② 翻译 ③ 解释 | PDF 整本解析、YouTube 视频摘要、AI 画图等 |
| **成本** | 使用个人 OpenAI / Claude / Gemini API Key；本地存储会话 | 复杂订阅计费、云端知识库 |

> 聚焦“侧边栏聊天 + 选中文本上下文增强”即可覆盖 Sider 约 80 %的日常使用场景，同时充分保持轻量与本地化。

---

## 2. 总体架构（Manifest V3 + SidePanel API）

```
┌─────────────────┐
│  ServiceWorker  │ 负责：
│  (background)   │ · 保存 API Key / 设置
│                 │ · 网络请求 (fetch LLM)
└────────▲────────┘
         │ runtime message
┌────────┴────────┐
│ Side Panel UI   │ HTML+TS/JS/Svelte
│ (default_path)  │ · 聊天窗口
└───▲─────────▲───┘
    │ postMessage │ DOM 事件
┌───┴─────────┴───┐
│ Content Script  │ 注入网页；监听选择/右键；高亮
└────────────────┘
```

- **Manifest V3**：`action`, `side_panel.default_path`, `permissions: ["activeTab","storage","scripting","contextMenus"]`
- **chrome.sidePanel API**：允许一键打开/收起侧栏，并可在不同站点共用同一 HTML 文件
- **消息流**：`content‑script ⇄ service‑worker ⇄ LLM`，保证 UI 不阻塞渲染
- **跨浏览器兼容**：若需支持 Firefox（暂无 SidePanel），可退化为注入固定位置的 `div`，并通过 `webextension‑polyfill` 统一 API

---

## 3. 技术选型 — 轻量、易维护

| 层次 | 方案 | 说明 |
|------|------|------|
| 前端 UI | **Svelte + Vite** (≈ 10 KB gz) 或原生 HTML/CSS + lit‑html | React 虽常用但打包体积较大 |
| 状态管理 | Svelte store / 自建 EventEmitter | 无需 Redux 等重量级库 |
| 语言 | TypeScript | 编译期保障，避免运行时崩溃 |
| 样式 | UnoCSS / Tailwind JIT | “原子 CSS” 减少重复 |
| 网络 | fetch + 流式解析 (ReadableStream) | 获得连续输出体验 |
| 打包 | `vite build --emptyOutDir`；`crx` CLI 生成 zip | 自动更新版本号 |

---

## 4. 分阶段实施路线（8 周示例）

| 周次 | 里程碑 | 关键任务 |
|------|--------|----------|
| 1 | **项目骨架** | manifest.json、SidePanel HTML、Vite 环境、ESLint/Prettier |
| 2 | **API 设置页** | Options UI：存/取 Key；本地加密后写入 storage |
| 3–4 | **聊天面板 MVP** | - 侧栏基本输入/输出<br>- 流式显示 LLM 响应<br>- 保存最近 20 条会话到 `indexedDB` |
| 5 | **选中文本 → 上下文** | content‑script 捕捉 selection，右键「总结/翻译」，将文本发给后台 |
| 6 | **Prompt 工程** | 预置 3 种系统提示：总结、字斟句酌翻译、分点解释 |
| 7 | **UI 打磨 & i18n** | Svelte i18n 简体/English；响应式布局 |
| 8 | **打包 & 发布** | Chrome Web Store 上架（走 CRX 签名）；生成 Edge & Brave 版本 |

---

## 5. 关键代码片段与开源参考

### 5.1 Manifest 样板

```json
{
  "manifest_version": 3,
  "name": "Lite Side AI",
  "version": "0.0.1",
  "action": { "default_icon": "icon.png" },
  "side_panel": { "default_path": "panel/index.html" },
  "permissions": ["activeTab", "storage", "scripting", "contextMenus"],
  "host_permissions": ["*://*/"],
  "background": { "service_worker": "background.js", "type": "module" }
}
```

### 5.2 service_worker.ts（网络代理核心）

```ts
chrome.runtime.onMessage.addListener(async (msg, sender, sendResp) => {
  if (msg.type === "ask-llm") {
    const { apiKey } = await chrome.storage.local.get("apiKey");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(msg.payload),
    });
    // 流式读取并分片转发给面板
    const reader = resp.body!.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chrome.runtime.sendMessage({ type: "llm-chunk", value });
    }
  }
});
```

### 5.3 开源仓库可借鉴

- **Syncia** — 选中文本浮动工具栏、侧栏聊天；MIT 协议，可直接 fork  
- **chatgpt-sidebar-extension** — 纯 JS 侧栏切换示例  
- **dompy/chatgpt-sidebar** — 医学词汇解释小插件，演示如何在高亮处插入按钮  

---

## 6. 未来迭代与性能 / 安全要点

| 方向 | 建议 |
|------|------|
| **功能插件化** | 将「PDF 摘要」「YouTube 摘要」等作为独立模块，`dynamic import()` 懒加载；无用即不打包 |
| **缓存 & 限流** | 相同文本 Hash 去重；在 storage 记录 timestamp，1 分钟内不重复请求 |
| **隐私** | 默认 **不** 上传任何页面内容；仅当用户显式触发才发送选中文本 |
| **Manifest V3 限制** | Background 线程 30 秒空闲即挂起，长连接逻辑放面板页 |
| **跨模型支持** | 抽象 `adapter` 层，统一 OpenAI/Anthropic/Gemini 参数 |
| **自动更新** | GitHub Actions：push `main` → 打包 CRX → 上传 Chrome Developer Dashboard |

---

## 结语

按以上 “需求 → 架构 → 技术选型 → 实施路线 → 关键代码” 的五步法先做出 **可聊、可总结、可翻译** 的 MVP，即可覆盖 Sider 约 80 % 高频场景，且体积控制在 **\< 400 KB**。后续再基于插件化架构逐步扩展功能，始终保持 **轻量 + 可维护**。祝你开发顺利！
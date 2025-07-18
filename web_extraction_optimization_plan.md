# 网页正文提取优化方案

> **版本**：v1.0  
> **作者**：ChatGPT (根据您现有 `content script` 诊断整理)  
> **目的**：在 **不重写整体架构** 的前提下，把正文提取的 **准确率、完整度** 提升到可接受水平（> 90 %），并保持页面首屏延迟 ≤ 200 ms。

---

## 1. 背景与目标

您当前的提取流程已集成 Mozilla Readability，但在多种页面场景（SPA、技术文档、长报告、富媒体新闻）仍出现 **正文缺失、图片丢失、内容被截断** 等问题。

本方案围绕 _“阈值过窄 + 处理过度”_ 的主要矛盾，提出 **7 项改进** 和 **1 套验证机制**，并给出可直接粘贴到代码中的参考实现。

---

## 2. 问题清单（Diagnostics）

| # | 症状 | 代码位置 & 原因 |
|---|------|----------------|
| 1 | 文章中作者简介、目录、首图被删 | `blacklist[]` 过宽；`header / aside / figure` 被整体过滤 |
| 2 | 列表项、短标题、代码行消失 | 预处理 `if (!text || text.length < 10) remove()` |
| 3 | 长文被硬裁到 8 kB | `maxLength = 8000` 直截 `substring` |
| 4 | SPA 骨架屏抓到空 div | `waitForSPAContent()` 被注释，缺乏 DOM 变化监听 |
| 5 | `isProbablyReaderable == false` 直接返回 null | 错把启发式当绝对判定 |
| 6 | 行合并导致格式错乱；短行再被过滤 | 粗暴 `prev += ' ' + line` & `<10 字符丢弃` |
| 7 | 图片/视频丢失 | `classesToPreserve` 只包含 `code` 类，未保留 `lazy-`, `wp-` 等 |

---

## 3. 优化原则

1. **先保真，再去噪**：正文容器不再提前删除，让 Readability 自行评分。  
2. **启发式必须可退化**：任何规则触发失败，都应回落到纯文本而非终止。  
3. **阈值可配置**：所有长度 / 得分阈值抽成常量，便于 A/B 调整。  
4. **异步等待要兜底**：SPA 监听 `MutationObserver`，设超时（3–5 s）。  
5. **日志与指标并重**：输出 `extracted_len / body_len`、`block_count`、`img_kept`，用于监控。

---

## 4. 逐项修改与示例代码

### 4.1 精简黑名单

```ts
// before
const blacklist = ['nav','header','footer','aside','.navbar','.menu', …];

// after – 仅保留广告/弹窗/浮层
const blacklist = ['.ad', '.ads', '.banner', '.popup', '.subscribe', '.share-side'];
blacklist.forEach(sel => document.querySelectorAll(sel).forEach(n => n.remove()));
```

> **收益**：不再误删 `<figure>`, `<header>` 内封面图等节点。

---

### 4.2 仅删除“纯空白”节点

```ts
function isPureEmpty(node: HTMLElement) {
  return !node.innerText.trim()
         && !node.querySelector('img, picture, video, pre, code, li, table');
}
document.querySelectorAll('div, span, p').forEach(n => {
  if (isPureEmpty(n)) n.remove();
});
```

---

### 4.3 长文分页而非裁剪

```ts
const MAX_CHUNK = 3 * 1024; // 3 kB
export function splitIntoChunks(text: string) {
  const paras = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = '';
  paras.forEach(p => {
    if (buf.length + p.length > MAX_CHUNK) {
      chunks.push(buf);
      buf = '';
    }
    buf += p + '\n\n';
  });
  if (buf) chunks.push(buf);
  return chunks;
}
```

---

### 4.4 等待 SPA 内容加载

```ts
function waitForSPAContent(rootSel = 'main, [role=main]') {
  return new Promise<void>(resolve => {
    const root = document.querySelector(rootSel) || document.body;
    const obs = new MutationObserver(() => {
      if (root.innerText.trim().length > 1000) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(); }, 5000); // 超时兜底
  });
}
await waitForSPAContent();
```

---

### 4.5 `isProbablyReaderable` 失败时降级

```ts
let article = null;
if (Readability.isProbablyReaderable(doc)) {
  article = new Readability(doc, opts).parse();
}
if (!article) {
  article = { title: document.title, textContent: document.body.innerText };
}
```

---

### 4.6 行处理 —— 保留格式 & 短行

```ts
// 不再合并行；仅 trim 末尾空格
const cleaned = text.split('\n').map(l => l.trimEnd()).join('\n');
```

---

### 4.7 补充 `classesToPreserve`

```ts
const reader = new Readability(doc, {
  keepClasses: true,
  classesToPreserve: [
    'language-', 'highlight', 'figure', 'gallery',
    /^lazy-/, /^wp-/, /^zoomable/, /^video-/
  ]
});
```

---

## 5. 验证与监控

1. **字段日志**  
   - `orig_len` vs `extract_len` (比值 <0.2 预警)  
   - `img_total` vs `img_kept`  
   - 触发 fallback/spa 等标记

2. **A/B 实验**  
   - 100 域名 *旧算法* vs *新算法*，统计 *空结果 / 缺图 / 被裁剪* 比率。  
   - 使用脚本自动对比差异，人工抽样复核。

3. **回滚策略**  
   - 通过 Manifest `storage.sync` 保存 `useNewExtractor = true/false`，线上问题可即时切换。

---

## 6. 后续迭代方向

| 优先级 | 功能 | 说明 |
|--------|------|------|
| ★★★ | 域名特征库自动化 | 收集失败日志 → 生成 rule PR → CI 回归 |
| ★★☆ | LayoutLM 微调 | 针对特殊站点（技术文档、论坛）训练正文分类器 |
| ★★☆ | OCR 兜底 | 后端 Puppeteer 截图 + Tesseract，解决图片型文章 |
| ★☆☆ | UI 质量指示 | 提取成功率、丢失警告在插件图标上红点提示 |

---

### 附：调试脚本（Node）

```bash
node crawl.js https://example.com | jq '.metrics'
```

---

## 7. 结语

采用 **“放宽阈值 → 精确兜底 → 指标驱动”** 的分层思路，可在 **1‑2 天** 内显著提高正文提取质量，并为后续机器学习、OCR 等扩展留足接口。祝优化顺利，期待看见新的提取效果！
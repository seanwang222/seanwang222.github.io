# Sichen Wang · 个人知识空间

一个跑在 GitHub Pages 上的个人站：**工程笔记 + 知识图谱 + 成长时间线 + 数据足迹**。
纯静态构建，无后端、无数据库、无第三方统计 —— 写一个 Markdown 文件，push 一次就上线。

线上地址（配好 Pages 后）：<https://wangsichen222.github.io>

---

## 它包含什么

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `/` | 站点索引卡片、精选笔记、四个入口、最近记录 |
| 知识空间 | `/knowledge/` | 全部笔记，支持标题/正文/标签搜索与标签筛选 |
| 笔记详情 | `/knowledge/<文件名>/` | 正文、反向链接、相关笔记、上下篇 |
| 知识图谱 | `/graph/` | 力导向图，节点为笔记与标签，可拖动、可点击跳转 |
| 时间线 | `/timeline/` | 按日期排的里程碑、功能、修复与写作 |
| 作品 | `/projects/` | 项目档案：技术栈、状态、关键取舍 |
| 数据足迹 | `/footprint/` | 提交节律、活跃时段、语言构成、仓库表，全部由 GitHub 数据算出 |
| RSS | `/rss.xml` | 笔记订阅 |

## 技术选择

- **Astro 5**：内容集合 + 全静态输出，页面几乎没有 JS，只有图谱和搜索这两处需要脚本。
- **Markdown 即内容源**：`src/content/notes/*.md`，文件名就是笔记 id。
- **双向链接自建**：`src/plugins/remark-wikilink.mjs` 在构建时把 `[[id]]` 解析成站内链接，`src/lib/notes.ts` 反向扫出反链与图谱。
- **数据先落盘再构建**：`scripts/fetch-github.mjs` 抓 GitHub API 生成 `src/data/github.json`，页面读本地 JSON，运行时不发网络请求。

```
src/
├── content/notes/       # 笔记正文（Markdown）
├── content.config.ts    # frontmatter 校验规则
├── data/                # site / timeline / projects / github.json
├── lib/notes.ts         # 排序、反链、图谱、阅读时长
├── plugins/             # remark 双链插件
├── components/          # NoteCard / GraphCanvas / Header / Footer
├── layouts/Base.astro   # 全局骨架、主题、页脚
├── pages/               # 路由
└── styles/global.css    # 设计变量与全站排版
scripts/fetch-github.mjs # 生成数据足迹用的 JSON
.github/workflows/deploy.yml
```

## 本地跑起来

```bash
npm install
npm run fetch:github   # 可选：刷新提交数据（建议配 GH_TOKEN 提高额度）
npm run dev            # http://localhost:4321
npm run build          # 产物在 dist/
npm run preview        # 预览构建结果
```

`fetch:github` 支持两个环境变量：`GH_OWNER`（默认 wangsichen222）、`GH_TOKEN`（可选）。
拉取失败时会沿用仓库里已提交的 `github.json`，不会让构建挂掉。

## 写一篇笔记

在 `src/content/notes/` 新建 `webdav-quirk.md`：

```markdown
---
title: 坚果云用 409 表示路径不存在
summary: 一句话说明这条笔记解决什么问题，列表页会显示它。
date: 2026-10-18
tags: [WebDAV, 同步]
kind: note          # note 工程笔记 / essay 长文随想 / log 流水记录
featured: false     # true 会出现在首页精选
draft: false        # true 则不参与构建
source: https://github.com/wangsichen222/DayMark
---

正文……

引用另一条笔记：[[atomic-write]] 或带别名的 [[atomic-write|原子写]]。
```

规则只有三条：

1. **文件名即链接目标**，`[[文件名]]` 自动变成站内链接；指向不存在的笔记会渲染成待补链接。
2. **反链不用手写**，构建时扫描全文生成；改完文件名记得搜索旧 id 替换。
3. **标签别超过 5 个**，标签同时是图谱里的节点，过密会把图撑散。

## 维护时间线与作品

- 时间线：`src/data/timeline.ts`，一个对象一条记录，`kind` 决定颜色标签。
- 作品：`src/data/projects.ts`，`highlights` 里写具体做法而不是形容词。
- 站点信息：`src/data/site.ts`（姓名、简介、链接、城市）。

## 部署到 GitHub Pages

**方案 A：用户站（推荐，地址最短）**

1. 新建仓库 `wangsichen222.github.io`，把本目录推到 `main`。
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
3. push 后 `.github/workflows/deploy.yml` 自动构建并发布，几分钟后访问 `https://wangsichen222.github.io`。

**方案 B：项目仓库**

1. 仓库名任意（如 `blog`），把 `astro.config.mjs` 里的 `base` 改成 `'/blog'`。
2. `site` 改为 `https://wangsichen222.github.io`，同样在 Pages 里选 GitHub Actions。
3. 访问 `https://wangsichen222.github.io/blog/`。

> 用自定义域名时，把 `site` 改成域名，并在 `public/` 放 `CNAME` 文件。

## 约定

- 全站只有一个深色主题：配色是为长时间读代码和长文定的，不做花哨的主题切换。
- 所有动效都尊重 `prefers-reduced-motion`。
- 内容优先于装饰：没有滚动视差、没有背景粒子、没有第三方字体请求。

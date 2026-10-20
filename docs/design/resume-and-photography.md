# 设计规范：个人电子简历 `/resume/` 与摄影作品集 `/photos/`

状态：设计稿（未实现）。配套原型：`docs/design/prototype/index.html`（可直接双击在浏览器打开）。
适用仓库：`wangsichen222.github.io`（Astro 5.18 全静态，GitHub Pages）。

---

## 0. 结论先行

| 决策 | 取哪个 | 为什么 |
| --- | --- | --- |
| 简历的数据源 | `src/data/resume.ts`（结构化 TS），**不用 Markdown** | 简历要精确控制分页、打印与"能力→证据"的对齐；Markdown 的自由排版在这里是负债 |
| 简历的呈现 | 屏幕深色版 + **打印时自动切浅色 A4**，同一份 DOM | 不要求访问者切主题；`@media print` 与"打印预览"开关共用一套浅色令牌 |
| 摄影数据源 | `src/content/photos/*.md` + `public/photos/` 构建产物 | 与既有 `notes` 集合同构：文件名即 id，frontmatter 由 zod 校验，push 即发布 |
| 图片进不进 Git | **原图不进**，只提交构建后的 web 尺寸图 | 60 帧 × ≤200KB ≈ 12MB 可控；原图本地/NAS 留档，CI 不需要拿到它们 |
| 瀑布怎么实现 | **CSS 多列**，不用 JS 量行跨度 | 零 JS、打印安全、不需要测量兜底；代价是列优先阅读顺序与放弃跨列大图（§3.4） |
| 打印样式挂哪 | **一个 `.is-print` 类**，由 `beforeprint` 与页面上的预览开关共同加 | 预览与真实打印共用一套规则，不会漂移；也避免重复声明（§2.5） |
| 看图交互 | 原型用**页内 stage**（大图 + EXIF 面板，就地展开） | 无遮罩、无焦点陷阱、URL 可分享、移动端天然可用；生产可平滑升级 `<dialog>` |
| 导航怎么放 | 主导航加「影像」，**「简历」做成右侧独立按钮** | 简历是目的地不是浏览路径；7 个文字项会把 820px 断点挤爆 |

两页共用现有设计令牌（`src/styles/global.css` 的 `--ink-*` / `--paper-*` / `--brass` / `--line*` / `--wrap` / `--radius` / `--ease`），**不新增颜色，不新增字体，不引入任何第三方请求**。

---

## 1. 与现有体系的关系

### 1.1 导航（`src/data/site.ts`）

```ts
nav: [
  { href: '/knowledge/', label: '知识空间', en: 'Knowledge' },
  { href: '/graph/',     label: '知识图谱', en: 'Graph' },
  { href: '/timeline/',  label: '时间线',   en: 'Timeline' },
  { href: '/projects/',  label: '作品',     en: 'Projects' },
  { href: '/footprint/', label: '足迹',     en: 'Footprint' },
  { href: '/photos/',    label: '影像',     en: 'Photography' },   // 新增
],
resume: { href: '/resume/', label: '简历', en: 'Résumé' },          // 新增：CTA 槽位
```

`SiteHeader` 在 `.nav` 之后加一个 `.nav-cta`（黄铜 1px 描边胶囊，hover 填充 `--brass-soft`）；移动端抽屉里作为最后一项，样式与 `.mobile-link` 一致但左边加 14px 黄铜短横线，与 `.eyebrow::before` 同族。

> 备选：若不想再加第 6 项，把「时间线」和「足迹」收进首页入口卡与页脚，主导航保持 5 项。原型演示的是"6 项 + CTA"。

### 1.2 首页

- 「四个入口」→「六个入口」：新增 `影像`（meta：`N 帧 / M 系列`）与 `简历`（meta：`可打印 A4`）。`entry-grid` 已是 `repeat(2, 1fr)`，6 项正好 3 行，无需改版式。
- `INDEX CARD` 增加一行 `影像 · N`；`笔记 / 提交 / 活跃日` 保持不变。
- 收尾引言区下方补一条 `arrow-link`：`看我的简历 →`（`/resume/`）。

### 1.3 复用与新增的版式原语

| 原语 | 状态 | 用在哪 |
| --- | --- | --- |
| `.eyebrow` `.section-head` `.section-title .idx` `.chip` `.arrow-link` `.link-quiet` `.prose` | 已有，直接复用 | 两页的标题区、筛选、次要链接 |
| `.file-card`（首页归档卡） | 已有，抽成 `ArchiveCard.astro` 组件 | 简历的「联系卡」、摄影的「设备卡」 |
| `.rule-grid`（1px 分隔的表格式行） | 新增，约 30 行 CSS | 简历经历行、EXIF 表 |
| `.photo-grid` + `.photo-stage` | 新增 | 摄影页 |

新增 CSS 全部写进各组件的 `<style>`，只有确实跨页复用的才进 `global.css`，避免全局表继续膨胀。

---

## 2. `/resume/` 个人电子简历

### 2.1 这个页面服务谁

三类读者，停留时间差别极大，所以版式必须同时成立：

1. **30 秒扫读者**（HR、面试官临场翻）：只看抬头 + 核心能力 + 最近一段经历 → 这三块必须在首屏内，且不需要滚动即可判断"要不要继续看"。
2. **打印/PDF 接收方**：A4 单页到两页，黑白打印后可读 → 信息不能靠颜色承载。
3. **复制文本的人**：正文必须是可选中、可粘贴不失真的真实文本 → **禁止用图片承载任何信息**，禁止 `user-select: none`。

### 2.2 信息架构（自上而下）

| # | 区块 | 内容 | 数据来源 |
| --- | --- | --- | --- |
| — | 抬头 | 姓名、定位一句话、角色 · 城市、联系行（邮箱 / GitHub / 本站）；右侧「打印 / 存 PDF」按钮 | `site.ts` + `resume.basics` |
| 01 | 摘要 | ≤3 行，职业化改写版 `site.intro` | `resume.summary` |
| 02 | 核心能力 | 3–4 条「结论 + 证据」，证据是站内笔记或项目链接 | `resume.strengths[]` |
| 03 | 经历 | 倒序，机构 · 角色 · 起止 · 3 条成果（成果写动作与结果，不写形容词） | `resume.experience[]` |
| 04 | 代表项目 | 精选 2–3 个，每个 2 条 highlights + 一行技术栈 + 状态 | `projects.ts`（`featured` 优先） |
| 05 | 技术栈 | 4 组矩阵，每项标注档位（主力 / 常用 / 了解） | `resume.stack[]` |
| 06 | 其他 | 写作（N 篇笔记）、摄影（→ `/photos/`）、认证、语言 | `resume.extras[]` |
| — | 页脚注 | 「最后更新 · YYYY-MM-DD」+ 一句来源说明（项目与提交数据与 `/footprint/` 同源） | `resume.updated` |

**待你补的空位**：`experience[]` 的工作/实习经历。原型里用虚线「待填」块占位，**没有编造任何机构、职位或时间**——这类内容一旦进 Git 历史就撤不回来。

### 2.3 数据模型

`src/data/resume.ts`：

```ts
import type { Project } from './projects';

export type SkillTier = 'primary' | 'frequent' | 'familiar';

export interface Resume {
  updated: string;                 // '2026-10-20'，参与打印页脚
  basics: {
    headline: string;              // 一句定位，≤28 字
    availability?: string;         // 可选：'可远程 · 合肥'
    email: string;
    github: string;
    site: string;
    phone?: string;                // 默认不填；填了会同时进打印版
  };
  summary: string[];               // 1–3 段，每段 ≤90 字
  strengths: { claim: string; proof: string; href?: string }[];
  experience: {
    org: string;
    role: string;
    from: string;                  // 'YYYY.MM'
    to?: string;                   // 省略 = 至今
    location?: string;
    bullets: string[];             // 2–4 条，每条 ≤60 字
    stack?: string[];
    placeholder?: boolean;         // true → 渲染为「待填」虚线块
  }[];
  projects: { ref: string; why?: string }[];   // 引用 projects.ts 的 name
  stack: { group: string; items: { name: string; tier: SkillTier }[] }[];
  extras: { label: string; value: string; href?: string }[];
}

export const resume: Resume = { /* ... */ };
export const featuredProjects: Project[] = /* 由 projects ref 解析 */;
```

约定：

- `strengths[].href` 指向站内笔记（`/knowledge/webdav-409/`），简历因此与知识空间自然连通，不需要新机制。
- `projects[].ref` 用 `projects.ts` 里的 `name`，简历不复制项目正文，避免两处漂移（单一来源，与 `single-source-of-truth` 笔记的判断一致）。
- 档位只有三档，不用数字熟练度（`React 85%` 这类是无意义信息）。

### 2.4 版式

- 容器沿用 `.wrap`（`--wrap: 1120px`）。桌面为**非对称双栏**：左 `minmax(0, 1.55fr)` 正文，右 `minmax(260px, 0.85fr)` 粘性侧栏（联系卡 + 技术栈 + 其他），与首页 `hero-grid` 同一比例，视觉上是同一家族。
- 侧栏 `position: sticky; top: 90px`，滚动时长经历不至于把联系方式推走。
- 经历行：`grid-template-columns: 96px 1fr`（左列 `from — to`，等宽小字），与首页 `.recent-item` 的三列节奏一致。
- 字号只用现有 4 级：`--fs-h1`（姓名）/ `1.06rem`（区块标题）/ `--fs-body`（正文）/ `--fs-small`+`--fs-micro`（元信息）。
- 间距只用 `8 / 14 / 22 / 34 / clamp(56px,8vw,104px)` 这组既有节奏。

### 2.5 打印（这是简历页最难也最有区分度的一块）

**架构：所有打印规则挂在一个 `.is-print` 类上，而不是散在 `@media print` 里。**

```js
window.addEventListener('beforeprint', () => root.classList.add('is-print'));
window.addEventListener('afterprint', () => root.classList.remove('is-print'));
```

```css
@page { size: A4; margin: 14mm 13mm; }        /* 只有 @page 留在 @media print 里 */

.pp.is-print {
  /* 令牌反转：深墨 → 白纸黑字，黄铜压暗到 #8a6a2f 保证对比 */
  --ink-0: #fff; --paper: #1c1c1c; --paper-strong: #000; --brass: #8a6a2f;
  --line: rgba(0,0,0,.16); --line-soft: rgba(0,0,0,.09);
  font-size: 0.78rem; line-height: 1.45; letter-spacing: 0;
}
.pp.is-print .site-header, .pp.is-print .site-footer,
.pp.is-print .no-print, .pp.is-print .exp.is-todo { display: none; }
.pp.is-print .resume-grid { grid-template-columns: minmax(0,1.6fr) minmax(150px,.8fr); }
```

为什么用类而不是 `@media print`：**页面上的「打印版预览」开关与真实打印共用同一套规则**，不会出现"预览好看、打印另一副样子"的漂移；也省掉一份 30 行的重复声明。

三条实测结论（都是踩过才知道的）：

1. **A4 打印视口只有 793px 宽，会命中屏显的 `max-width: 900px` 断点而塌成单栏**，页数直接翻倍。所以打印样式里必须显式恢复双栏。
2. **压页数靠删内容，不靠缩字号。** 当前内容量实测 **2 页 A4**（0.78rem / 1.45 已经是纸面可读的下限）；把「待填」的工作经历补完会到 3 页，那时该做的是砍区块（例如打印时隐去 02 的证据行），而不是继续缩字。
3. **纸上不需要"可点击的 affordance"**：`.exp .stack` 的 chips 与 04 技术栈重复，打印时隐去；证据行保留笔记标题但去掉 `↳` 前缀改写成「证据：」。

其余要点：

- 屏显深色与打印浅色共用同一份 DOM，不生成第二份 HTML。
- 外链在打印版补出可见地址（`data-print` 存短形式，避免 `https://` 全串撑爆行宽）。
- 目标 **≤3 页 A4**；单页版留给 `?compact=1` 的 v2，现在不做。
- 页面上放 `.no-print` 的「打印 / 存 PDF」按钮调 `window.print()`，另给一个「打印版预览」开关用同一个 `.is-print` 类，不弹窗就能看效果。


### 2.6 结构化数据与 SEO

- `<title>`：`简历 · Sichen Wang`（沿用 `Base.astro` 的 `${title} · ${site.name}` 规则）。
- JSON-LD（放 `Base` 的 `head` slot，仅 `/resume/` 注入）：

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Sichen Wang",
  "jobTitle": "前端 / 桌面应用开发",
  "email": "mailto:…",
  "url": "https://wangsichen222.github.io/resume/",
  "sameAs": ["https://github.com/wangsichen222"],
  "address": { "@type": "PostalAddress", "addressLocality": "合肥", "addressCountry": "CN" }
}
```

- 电话、住址、证件照一律**不放**（隐私且用不上）；头像位默认用现有 `SW` monogram，真实照片作为可选项由你决定。

### 2.7 无障碍

- 语义：`<main>` 内一个 `<h1>`（姓名），区块 `<h2>`，经历条目用 `<article>`；时间用 `<time datetime>`。
- 技术栈档位不能只靠颜色：文字标签「主力 / 常用 / 了解」直接可见，`--brass` 只做强调。
- 打印按钮是 `<button type="button">`，键盘可达，复用全局 `:focus-visible`。
- 正文对比度：`--paper` `#e9e6df` on `--ink-0` `#08090a` ≈ 14.5:1；`--paper-faint` `#6d6a63` 只用于 ≥12px 的元信息（对比约 4.6:1，达标但不再往更小字号用）。
- 尊重 `prefers-reduced-motion`（全局已有分支，简历页不加新动效）。

---

## 3. `/photos/` 摄影作品集

### 3.1 目标

图片是主角，界面退到后面。深色底（`--ink-0`）本就是看图的最佳衬底，这条站点的调性和摄影集天然契合——所以设计任务是**减法**：把版式让给画面，只在 hover / 详情里补信息。

### 3.2 信息架构

| 区块 | 内容 |
| --- | --- |
| 抬头 | `eyebrow: PHOTOGRAPHY · 2024 — 2026`、一句拍摄观、元信息行（`N 帧 / M 系列 / 最近一帧日期`） |
| 设备卡 | 复用 `ArchiveCard`：机身、镜头、后期、拍摄原则（`--fs-micro` 等宽小字，右栏） |
| 筛选 | 系列 chips（全部 / 城市 / 自然 / 建筑 / 街边）+ 计数；纯前端过滤，不改 URL |
| 网格 | 混合宽高比瀑布，1 张 feature 跨 2 列 |
| stage | 点开后就地展开：大图 + 右侧信息面板（标题、系列、地点、时间、EXIF、说明、许可）+ 上一张/下一张/关闭 |
| 页尾 | 许可声明（默认「署名为主、禁止商用」，具体条款由你定）、设备与拍摄习惯一句话 |

### 3.3 数据模型

`src/content/photos/*.md`，**文件名即 slug**，与 `notes` 完全同构：

```ts
// src/content.config.ts 内新增
const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: z.object({
    title: z.string(),
    series: z.string(),                       // 城市 / 自然 / 建筑 / 街边
    location: z.string(),                     // '合肥 · 淮河路'
    capturedAt: z.coerce.date(),
    ratio: z.string().default('3:2'),         // '3:2' | '2:3' | '1:1' | '4:5' | '5:4'
    alt: z.string(),                          // 无障碍描述，必填
    caption: z.string().default(''),          // 一句话，≤40 字
    exif: z.object({
      camera: z.string().optional(),
      lens: z.string().optional(),
      focal: z.string().optional(),           // '35mm'
      aperture: z.string().optional(),        // 'f/8'
      shutter: z.string().optional(),         // '20s'
      iso: z.number().optional(),
    }).default({}),
    featured: z.boolean().default(false),     // 跨 2 列 + 首页/抬头精选位
    draft: z.boolean().default(false),
    thumb: z.string(),                        // 'photos/2026-rain-street/640.webp'
    full: z.string(),                         // 'photos/2026-rain-street/1600.webp'
  }),
});
```

`alt` 设为必填是刻意的：没有描述就还没资格发布。系列名不建枚举，因为新增系列不该改代码。

### 3.4 网格与版式

**用 CSS 多列做瀑布，不用 JS 量行跨度。**

```css
.photo-grid { columns: 3; column-gap: clamp(10px, 1.6vw, 18px); }
.photo-cell {
  position: relative; width: 100%; overflow: hidden;
  aspect-ratio: var(--r);            /* 由 ratio 字段写入，如 1.5 / 0.6667 */
  margin: 0 0 clamp(10px, 1.6vw, 18px);
  break-inside: avoid;
}
.photo-cell img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 900px) { .photo-grid { columns: 2; } }
@media (max-width: 560px) { .photo-grid { columns: 1; } }
```

两条都是原型实测踩出来的，别省：

1. **`img` 必须绝对定位。** 多列流里父元素的高度来自 `aspect-ratio`，属于"不确定高度"，此时 `height: 100%` 会解析成 0——图片全部存在但一格都画不出来，只剩绝对定位的角标浮在空白上。
2. **先试过 `grid-auto-rows: 8px` + JS 算 `grid-row: span N` 的真瀑布**，它支持左→右阅读顺序和跨列大图，但每次布局都要读一次宽度：页面处于 `display: none`（首屏在另一页）或宿主视口为 0 时量到 0，跨度就永远不更新，需要额外的 `ResizeObserver` + 双帧 `requestAnimationFrame` 兜底。原型与生产都只要"不裁切 + 无空洞"，所以选了零 JS 的多列。**代价**：阅读顺序变成列优先（最新的几帧落在第一列），且"精选帧"无法跨两列撑场面——改用黄铜描边 + 「精选」角标标记。若日后要严格日期左→右，再换回 JS 方案，替换范围只有这一个组件。

其余：

- **保留原始宽高比，不做统一裁切**——摄影集里把 2:3 竖构图裁成 3:2 是不可接受的失真。
- hover：`filter: brightness(1.05) saturate(1)` + 底部信息条 `translateY(6px)→0` 淡入（黄铜 1px 顶线，`--fs-micro` 等宽显示焦距/光圈）。不做缩放，避免糊。
- 加载中：`background: var(--ink-2)` + 1px 内描边，不用 LTRU 模糊图（省体积）。
- 空态（某系列 0 张）：一行 `.dim` 文案 + 「看全部」按钮，不做插画。
- 侧栏里的次级栅格（如简历技术栈）在窄栏要退回单列、标签置于条目之上——`96px + 1fr` 的两列在 262px 栏里只剩 140px 给条目，会挤成一行一个。
- 简历抬头那句定位，中文用整句会在窄栏里剩两个孤字，改成 `角色 · 主张 · 主张` 的一行式短语更稳。


### 3.5 看图：stage 方案（原型采用）

点缩略图 → 网格上方展开 `.photo-stage`（大图 + 信息面板），`scrollIntoView({ block: 'start' })`，并把焦点移到 stage 容器（`tabindex="-1"`）。上一张/下一张在系列内循环，`←`/`→` 键绑定，`Esc` 关闭并把焦点还给原缩略图。URL 同步 `#<slug>`，刷新或分享后直接打开那一帧（`astro` 静态页无路由成本）。

为什么原型不用遮罩灯箱：沙箱预览、自动高度容器、打印场景下 `position: fixed` 遮罩都会添乱，而 stage 在这些环境里行为一致。生产环境若要更沉浸，可升级为原生 `<dialog>` + `showModal()`（自带焦点陷阱与 `::backdrop`），信息面板结构可原样搬过去——这条改动只影响一个组件。

### 3.6 图片管线（本设计里唯一有工程风险的部分）

**约束**：GitHub Pages 只发静态文件；原图（单张 20–60MB）不该进 Git；CI 必须仍能全自动构建，不能依赖只有本人才有的原图。

| 方案 | 做法 | 代价 | 结论 |
| --- | --- | --- | --- |
| A 原图进 Git | 直接 commit 原图，构建时 `astro:assets` 生成多尺寸 | 仓库迅速涨到 GB 级，clone 变慢，历史不可压缩 | 否 |
| B Git LFS | 原图走 LFS，CI 拉 LFS | 免费 1GB 存储 / 1GB 月流量，几十张原图就超；超额按量付费 | 否 |
| C 原图放私有仓/Release，CI 下载 | 公开仓只放产物 | 要配 PAT secret、下载步骤、失败回退；链路最长 | 备选（帧数上百再考虑） |
| **D 提交构建产物** | 本地跑 `npm run build:photos` 生成 web 尺寸图，**只把这些小图 commit 进 `public/photos/`**，原图留在本地/NAS 并被 `.gitignore` 排除 | 新增照片要多跑一条本地命令 | **采用** |

D 的落地形态：

```
photos-raw/                 # 原图，.gitignore 掉（含 *.CR3/*.NEF/*.ARW 与导出 JPEG）
  2026/2026-rain-street/…
public/photos/
  2026-rain-street/640.webp     # 网格缩略
  2026-rain-street/1600.webp    # stage 大图
  2026-rain-street/320.webp     # （可选）首屏临时候选
src/content/photos/2026-rain-street.md
scripts/build-photos.mjs    # 读 photos-raw → 生成尺寸 → 写/更新 md 的 thumb/full/exif/ratio
```

`build-photos.mjs` 的职责（与 `fetch-github.mjs` 同一套风格：失败不阻断构建）：

1. 扫 `photos-raw/**/*.jpg`，按目录名 → slug；
2. `sharp` 输出 320/640/1600 三档 WebP（`quality: 78`，`effort: 6`），已存在且 mtime 更新则跳过；
3. **剥离 EXIF 中的 GPS 与相机序列号**，只把 `focal/aperture/shutter/iso/camera/lens` 写进 frontmatter 白名单字段；
4. 计算宽高写入 `ratio`；
5. 生成或补齐 `src/content/photos/<slug>.md`（已有正文不动，只更新元信息块）；
6. 打印清单：新增/更新/跳过、每张体积、总增量。

**性能预算**（超了就改，不是建议）：

| 指标 | 预算 |
| --- | --- |
| 单帧缩略 | ≤ 80 KB（WebP 640 宽） |
| 单帧大图 | ≤ 250 KB（WebP 1600 宽） |
| 首屏请求 | 只拉视口内 6–8 张，其余 `loading="lazy" decoding="async"` |
| 页面 JS | ≤ 15 KB（筛选 + stage 自己写，约 120 行原生 JS，不引库） |
| 整站增量 | 60 帧 ≈ 8–12 MB 静态资源，Pages 无流量费顾虑，但 clone 体积要提前告知 |
| 布局稳定 | 每张图都有显式 `width`/`height`（由 `ratio` 推），CLS ≈ 0 |

### 3.7 许可与隐私

- 页尾固定一行许可声明，默认「© 年份 Sichen Wang · 署名为主、禁止商用（CC BY-NC 4.0）」，具体由你定；同时给每帧 `caption` 留 `rights` 覆盖位。
- GPS 由构建脚本强制剥离（3.6 第 3 条），不依赖人工记得。
- 出现可识别人脸/车牌的帧，发布前自行判断是否处理；`draft: true` 就是为此保留的闸门。
- 右键保存拦不住也不打算拦；水印只加在 `caption` 里，不糊在画面上。

### 3.8 无障碍

- 每张图是可聚焦 `<button>`（不是 `<a href="#">`），`aria-label` = 标题 + 系列 + 地点 + 年份。
- `alt` 必填且写"看到什么"，不写"某某拍的"（信息已在周围文本里）。
- 筛选 chips 用 `role="group"` + `aria-pressed`，筛选结果数量变化通过 `aria-live="polite"` 播报。
- stage 打开时 `aria-expanded="true"` 回指缩略图；键盘全链路可完成"看某张图 → 下一张 → 关闭"。
- 减动效：`prefers-reduced-motion` 下信息条直接终态，`scrollIntoView` 用 `behavior: 'auto'`。

---

## 4. 落地文件清单

**新增**

```
src/data/resume.ts                     # 简历数据（含待填标记）
src/content/photos/*.md                # 每帧一个文件
src/content/README.md                  # 放图与命名约定（可选）
src/components/ArchiveCard.astro       # 从首页 file-card 抽出
src/components/ResumeSection.astro     # 01–06 区块标题统一结构
src/components/PhotoGrid.astro
src/components/PhotoStage.astro
src/pages/resume.astro
src/pages/photos/index.astro
src/pages/photos/[slug].astro          # 可选：每帧独立 URL（stage 的 #hash 也能满足）
scripts/build-photos.mjs               # 图片管线（sharp 需 devDependency）
public/photos/**                       # 构建产物（提交进仓库）
docs/design/resume-and-photography.md  # 本文件
docs/design/prototype/**               # 可交互原型
```

**改动**

```
src/content.config.ts     # +photos 集合
src/data/site.ts          # +nav 项、+resume CTA 槽位
src/components/SiteHeader.astro   # +.nav-cta
src/pages/index.astro     # 入口 4→6、INDEX CARD +影像行、收尾 +简历链接
src/styles/global.css     # 只加 @media print 的令牌反转块与 .no-print
.gitignore                # +photos-raw/、+vibe_images/
package.json              # +build:photos 脚本、+sharp devDependency
```

**实施顺序（三个可独立验收的 PR）**

1. `feat(resume)`：数据 + 页面 + 打印样式 + nav CTA。验收：屏幕版、`Ctrl+P` 预览 A4 两页内、Lighthouse a11y ≥ 95。
2. `feat(photos)`：集合 + 网格 + stage + 10 帧真图。验收：首屏 ≤ 8 请求、单帧 ≤ 80KB、键盘走完一遍流程。
3. `chore(pipeline)`：`build-photos.mjs` + 剩余照片 + 首页入口卡与 INDEX CARD 计数。验收：删掉 `public/photos` 后重跑脚本可完整复原。

---

## 5. 原型说明与验证记录

打开 `docs/design/prototype/index.html`（本地双击即可，无需服务器；页面本身零网络请求，图片走同目录 `assets/`）。

可交互点：

- 顶部导航在「简历 / 影像」两页间切换（hash 路由，可分享）；未包含的页面链接点了会弹一行说明，不静默失败。
- 简历页：「打印版预览」开关（走与真实打印同一个 `.is-print` 类）、「打印 / 存 PDF」按钮（`window.print()`）、能力条目的证据行、移动端抽屉（≤820px）。
- 影像页：系列筛选（含计数与空态）、多列瀑布、hover 信息条、点击展开 stage、`←`/`→` 换帧、`Esc` 关闭、`#photos/<slug>` 深链。

已验证（无头 Edge，`--force-prefers-reduced-motion`，取终态）：

| 检查 | 结果 |
| --- | --- |
| 1440×1900 影像页 | 三列瀑布，混合比例无空洞、无裁切 |
| 1440×3200 简历页 | 01–03 左栏、04–05 侧栏、06 全宽，双栏无大片留白 |
| 390px iframe 移动端 | 汉堡菜单出现、单列、抬头一行不换行、无横向溢出 |
| A4 打印 PDF | **2 页**，浅色令牌生效、页头页脚与「待填」块隐去、双栏保留 |
| 控制台 | 无 error / warning |
| 演示图体积 | 缩略 17–52 KB、大图 87–233 KB（JPEG，生产按 §3.6 换 WebP） |

未验证（落地时要补）：真实浏览器里 `beforeprint` 的触发时机（headless 打印已证明生效）、`<dialog>` 版灯箱、真图替换后的比例分布与首屏请求数、Lighthouse 分数。

演示数据边界（重要）：

- 6 张摄影图是 **AI 生成的演示图**，EXIF、地点、日期同为演示值，仅用于验证版式与信息密度；替换真图时按 3.6 的目录与字段约定整片换掉即可。
- 简历中的项目、笔记、技术栈取自本仓库现有数据（`src/data/projects.ts`、`src/content/notes/`），**工作经历为「待填」占位**，未编造。
- 姓名、邮箱、GitHub、城市取自 `src/data/site.ts`。

---

## 6. 需要你拍板的 4 件事

1. **导航是否加第 6 项**（备选：把时间线/足迹收进首页与页脚，主导航维持 5 项）。
2. **简历是否要英文版**（本设计默认中文为主 + 英文小标；双语两版会让内容漂移，若要英文建议单独 `/en/resume/` 且延后）。
3. **是否放真实头像**（默认 `SW` monogram；放照片就要接受它进公开历史）。
4. **摄影许可条款**（默认「署名为主、禁止商用」；若打算卖图或允许转载，措辞要改）。

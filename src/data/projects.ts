export interface Project {
  name: string;
  zh: string;
  tagline: string;
  desc: string;
  stack: string[];
  status: string;
  period: string;
  repo?: string;
  featured?: boolean;
  highlights: { title: string; body: string }[];
  metric?: { label: string; value: string };
}

export const projects: Project[] = [
  {
    name: 'DayMark',
    zh: '每日打卡 · 待办 · 日程',
    tagline: '一个本地优先的桌面应用，数据先落在自己机器上，云盘只是同步通道。',
    desc:
      '打卡、待办、日程三件事合到一个窗口里。同步走坚果云 WebDAV，不依赖自建服务端；所有写入经过同一套落盘时序，冲突时先留档再覆盖。',
    stack: ['Electron 44', 'React 18', 'Vite 4', 'WebDAV', 'safeStorage'],
    status: '持续开发 · v1.1.4',
    period: '2026.10 — 至今',
    repo: 'https://github.com/seanwang222/DayMark',
    featured: true,
    highlights: [
      {
        title: '落盘时序反转',
        body: '回填完成前，所有写库请求一律丢弃；主进程用 .tmp + 同卷 rename 原子写。半截 JSON 不会被当成「本机为空」推上云端。',
      },
      {
        title: '冲突决策抽成纯函数',
        body: 'planPull / planPush 只判断「是否会丢较新的那一方」，主进程只负责执行动作；动手前先在本机与云端各留一份档。',
      },
      {
        title: '按真机语义重写同步',
        body: '坚果云用 409 表示路径不存在，也不是 404。目录逐级 MKCOL，连接自检用 PROPFIND 定位缺在哪一层，提示里直接给出该层实际有哪些目录。',
      },
      {
        title: '六套回归串成一条命令',
        body: 'backup / stats / webdav / todo / persistence / config，mock 服务验证协议语义，pre-commit 据此把关，不触碰真实账号。',
      },
    ],
    metric: { label: '回归用例', value: '6 套' },
  },
  {
    name: 'DayMark Docs',
    zh: '架构说明与边界记录',
    tagline: '文档不是结论的复述，而是结论的可核对来源。',
    desc:
      '为 DayMark 写的三篇架构说明，逐条标注 file:line。每篇末尾单列「已知差异」：文档与代码冲突的地方照实写下，以代码为准。',
    stack: ['Markdown', 'Mermaid', 'Structurizr DSL'],
    status: '随代码演进',
    period: '2026.10',
    repo: 'https://github.com/seanwang222/DayMark/tree/master/docs/architecture',
    highlights: [
      {
        title: 'persistence.md',
        body: 'ready 闸门为什么必须在回填完成前丢弃所有写库；beforeunload 为什么只能走 sendSync；原子写的 .tmp + rename 理由。',
      },
      {
        title: 'sync.md',
        body: 'pull / push 的决策表与两个「为空」方向的不对称；读本地必须放在 await 网络之后；syncedAt 一律重新读配置再写。',
      },
      {
        title: 'stats.md',
        body: '分母口径的两处排除、季/年从月汇总所以「加 0」天然生效、连续段为什么不能在循环末尾取 running。',
      },
    ],
    metric: { label: '篇幅', value: '3 篇' },
  },
  {
    name: 'Personal Space',
    zh: '个人知识空间',
    tagline: '知识应该自己长成网络，而不是堆成列表。',
    desc:
      '你现在看到的这个站点。笔记写在 Markdown 里，[[双向链接]] 自动生成反链与知识图谱，作品与提交足迹从 GitHub 读回，构建成纯静态页面挂到 GitHub Pages。',
    stack: ['Astro 5', 'TypeScript', 'Canvas', 'GitHub Actions'],
    status: '运行中',
    period: '2026.10 — 至今',
    repo: 'https://github.com/seanwang222/seanwang222.github.io',
    highlights: [
      {
        title: '内容即仓库',
        body: '一篇文章一个 Markdown 文件，push 即发布。没有后台、没有数据库，文章的版本历史就是 Git 历史。',
      },
      {
        title: '双向链接与图谱',
        body: '编译期解析 [[链接]] 生成反链，同时输出节点与边给前端做力导向布局，零运行时数据库。',
      },
      {
        title: '足迹来自真实提交',
        body: '构建前拉取 GitHub 提交记录，热力图、时段分布与活跃天数全部由数据算出，没有一条是手填的。',
      },
    ],
    metric: { label: '运行时依赖', value: '0' },
  },
];

export const featuredProject = projects.find((project) => project.featured)!;
export const otherProjects = projects.filter((project) => !project.featured);

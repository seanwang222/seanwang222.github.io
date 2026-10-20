export type TimelineKind = 'milestone' | 'project' | 'writing' | 'fix';

export interface TimelineEvent {
  /** YYYY-MM-DD */
  date: string;
  title: string;
  desc: string;
  kind: TimelineKind;
  tags?: string[];
  link?: string;
  linkLabel?: string;
}

export const kindMeta: Record<TimelineKind, { label: string; color: string }> = {
  milestone: { label: '里程碑', color: 'var(--brass)' },
  project: { label: '功能', color: 'var(--jade)' },
  writing: { label: '写作', color: 'var(--sky)' },
  fix: { label: '修复', color: 'var(--rose)' },
};

/**
 * 时间线数据 —— 全部来自真实提交记录，按需增删。
 * 新增一条：照抄下面任意对象，改日期与描述即可。
 */
export const timeline: TimelineEvent[] = [
  {
    date: '2026-10-19',
    title: '个人知识空间上线',
    desc: '用 Astro 把工程笔记、项目档案与提交足迹收进同一个站点，双向链接与知识图谱由 Markdown 自动生成。',
    kind: 'milestone',
    tags: ['Astro', '知识管理'],
  },
  {
    date: '2026-10-18',
    title: '提醒模块的完成态收敛为「两条退场规则」',
    desc: '行动项新增 completedAt，按计划完成日划线：按时完成留灰，逾期补做直接退出。排序键仍只有一个，勾选后行数与行高不变。',
    kind: 'fix',
    tags: ['Electron', '状态机'],
    link: 'https://github.com/wangsichen222/DayMark/commit/aafe695',
    linkLabel: 'aafe695',
  },
  {
    date: '2026-10-17',
    title: 'WebDAV 同步按坚果云真机语义重写',
    desc: '实测坚果云用 409 表示「路径不存在」而非 404。pull、ensureDir、checkConnection 全部改按真机行为判断，并把「缺哪一层」写进提示。',
    kind: 'fix',
    tags: ['WebDAV', '同步'],
    link: 'https://github.com/wangsichen222/DayMark/commit/c423834',
    linkLabel: 'c423834',
  },
  {
    date: '2026-10-16',
    title: '统计口径改为按区间计算，新增归档',
    desc: '完成天数、完成率、连续天数只算所选月/季/年区间，连续段不跨区间边界；打卡项与待办加入 archived 字段，退出界面但保留历史。',
    kind: 'project',
    tags: ['数据建模', '统计'],
    link: 'https://github.com/wangsichen222/DayMark/commit/ee62fab',
    linkLabel: 'ee62fab',
  },
  {
    date: '2026-10-14',
    title: '写下三篇架构说明',
    desc: 'persistence / sync / stats 各一篇，按 file:line 逐条对照代码，每篇末尾单列「已知差异」——文档与代码冲突时以代码为准。',
    kind: 'writing',
    tags: ['文档', '架构'],
    link: 'https://github.com/wangsichen222/DayMark/commit/79abc96',
    linkLabel: '79abc96',
  },
  {
    date: '2026-10-12',
    title: '提交门禁改为默认生效',
    desc: 'prepare 生命周期脚本让 pre-commit 随 npm install 自动就位；node_modules 缺失时不再放行，.gitignore 由逐条列举改为目录级忽略。',
    kind: 'fix',
    tags: ['工程化', 'Git'],
    link: 'https://github.com/wangsichen222/DayMark/commit/527164e',
    linkLabel: '527164e',
  },
  {
    date: '2026-10-12',
    title: '数据安全加固：落盘时序反转与原子写',
    desc: 'ready 闸门之前一律不写库，回填完成后再放行；主进程改 .tmp + 同卷 rename，避免半截 JSON 被当作「本机为空」推上云端。六套回归串成一条 verify。',
    kind: 'project',
    tags: ['数据安全', 'Electron'],
    link: 'https://github.com/wangsichen222/DayMark/commit/b669de4',
    linkLabel: 'b669de4',
  },
  {
    date: '2026-10-08',
    title: 'DayMark 纳入版本控制',
    desc: '首次导入源码，只跟踪可编辑文件与配置。同步不再静默丢掉较新的一份数据：覆盖前比对 updatedAt，确认强行覆盖前自动留档。',
    kind: 'project',
    tags: ['Electron', '本地优先'],
    link: 'https://github.com/wangsichen222/DayMark/commit/496de86',
    linkLabel: '496de86',
  },
  {
    date: '2024-04-25',
    title: '建立个人 profile 仓库',
    desc: 'GitHub 主页 README 落地的第一天，此后长期处于极简状态——直到需要一个真正放笔记的地方。',
    kind: 'milestone',
    tags: ['GitHub'],
    link: 'https://github.com/wangsichen222/wangsichen222',
    linkLabel: 'repo',
  },
  {
    date: '2019-12-28',
    title: '注册 GitHub',
    desc: '第一个账号，第一个 fork。当时只是为了下载别人写好的东西。',
    kind: 'milestone',
    tags: ['GitHub'],
  },
];

export function groupByYear(events: TimelineEvent[]) {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? 1 : -1));
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of sorted) {
    const year = event.date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(event);
  }
  return [...groups.entries()].map(([year, items]) => ({ year, items }));
}

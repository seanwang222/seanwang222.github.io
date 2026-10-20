export const site = {
  name: 'Sichen Wang',
  handle: 'SeanHub',
  githubUser: 'wangsichen222',
  city: '合肥',
  role: '前端 / 桌面应用开发',
  tagline: '把能长期运行的东西，一件一件做出来。',
  intro:
    '我在合肥写前端与桌面应用。偏好本地优先的架构、可验证的结论，以及把踩过的坑连根写清楚。这里存放我的工程笔记、做过的项目，和一条按时间排下来的记录。',
  email: 'wangsichen222@outlook.com',
  links: {
    github: 'https://github.com/wangsichen222',
    email: 'mailto:wangsichen222@outlook.com',
  },
  nav: [
    { href: '/knowledge/', label: '知识空间', en: 'Knowledge' },
    { href: '/graph/', label: '知识图谱', en: 'Graph' },
    { href: '/timeline/', label: '时间线', en: 'Timeline' },
    { href: '/projects/', label: '作品', en: 'Projects' },
    { href: '/footprint/', label: '足迹', en: 'Footprint' },
  ],
};

export type SiteConfig = typeof site;

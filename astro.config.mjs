import { defineConfig } from 'astro/config';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';

// 部署形态：GitHub Pages 用户站（仓库名 wangsichen222.github.io）
// 如果改用普通项目仓库，把 base 改成 '/仓库名'
export default defineConfig({
  site: 'https://wangsichen222.github.io',
  base: '/',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkWikilink],
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
  build: {
    format: 'directory',
  },
});

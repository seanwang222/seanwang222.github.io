import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';

// 部署形态：GitHub Pages 用户站（仓库名 seanwang222.github.io）
// 如果改用普通项目仓库，把 base 改成 '/仓库名'
export default defineConfig({
  site: 'https://seanwang222.github.io',
  base: '/',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath, remarkWikilink],
    rehypePlugins: [
      [rehypeKatex, { throwOnError: false, strict: false, errorColor: '#c98b8b' }],
    ],
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
  build: {
    format: 'directory',
  },
});

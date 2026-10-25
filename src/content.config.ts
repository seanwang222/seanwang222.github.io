import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 笔记 = 知识空间的最小单位。
 * 文件名即 id，`[[id]]` 形式的双向链接直接指向它。
 */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // note: 工程笔记 / essay: 长文随想 / log: 流水记录
    kind: z.enum(['note', 'essay', 'log']).default('note'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    // 这条笔记对应的仓库或来源
    source: z.string().optional(),
  }),
});

/**
 * 雷达学习 = 教材的章节树。
 * chapter 是每章导读，section 是拆分后的分节笔记，code 是配套 MATLAB 代码解读。
 */
const radar = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/radar' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().default(''),
    summary: z.string(),
    part: z.string(),
    chapter: z.number().int(),
    chapterTitle: z.string(),
    chapterTitleEn: z.string(),
    section: z.string(),
    kind: z.enum(['chapter', 'section', 'code']),
    order: z.number(),
    tags: z.array(z.string()).default([]),
    source: z.string().optional(),
  }),
});

export const collections = { notes, radar };

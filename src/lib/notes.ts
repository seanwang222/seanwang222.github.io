import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function noteHref(id: string): string {
  return `/knowledge/${id}/`;
}

/** 提取正文里的所有双向链接目标（去重） */
export function extractLinks(body: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  WIKILINK.lastIndex = 0;
  while ((match = WIKILINK.exec(body)) !== null) {
    found.add(match[1].trim());
  }
  return [...found];
}

/** 中文按 380 字/分钟、西文按 200 词/分钟估算 */
export function readingTime(body: string): number {
  const cjk = (body.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = body.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(cjk / 380 + words / 200));
}

export function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getNotes(includeDrafts = false): Promise<Note[]> {
  const all = await getCollection('notes', ({ data }) => includeDrafts || !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function getTags(notes: Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'));
}

/** 反链：哪些笔记指向了当前笔记 */
export function getBacklinks(notes: Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id && extractLinks(note.body ?? '').includes(id));
}

export function getOutgoing(notes: Note[], note: Note): Note[] {
  const targets = extractLinks(note.body ?? '');
  return notes.filter((other) => targets.includes(other.id));
}

/** 孤立笔记（无进无出）——知识花园里值得补链接的地方 */
export function findOrphans(notes: Note[]): Note[] {
  return notes.filter((note) => {
    const out = extractLinks(note.body ?? '');
    const inbound = getBacklinks(notes, note.id).length;
    return out.length === 0 && inbound === 0;
  });
}

/**
 * 图谱数据：笔记节点 + 标签节点。
 * 笔记之间是双向链接（实线），笔记与标签是归档关系（细线）。
 */
export function buildGraph(notes: Note[], minTagCount = 2) {
  const tagCount = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.data.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const hubTags = new Set(
    [...tagCount.entries()].filter(([, count]) => count >= minTagCount).map(([tag]) => tag)
  );

  const titles = new Map(notes.map((note) => [note.id, note.data.title]));
  const nodes: Array<{
    id: string;
    label: string;
    type: 'note' | 'tag';
    tag?: string;
    href?: string;
    degree: number;
    date?: string;
    kind?: string;
  }> = [];
  const links: Array<{ source: string; target: string; type: 'link' | 'tag' }> = [];
  const known = new Set(notes.map((note) => note.id));
  const seenPair = new Set<string>();

  for (const note of notes) {
    nodes.push({
      id: note.id,
      label: note.data.title,
      type: 'note',
      href: noteHref(note.id),
      degree: 0,
      date: note.data.date.toISOString().slice(0, 10),
      kind: note.data.kind,
      tag: note.data.tags[0],
    });

    for (const target of extractLinks(note.body ?? '')) {
      if (!known.has(target) || target === note.id) continue;
      const key = [note.id, target].sort().join('::');
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      links.push({ source: note.id, target, type: 'link' });
    }

    for (const tag of note.data.tags) {
      if (!hubTags.has(tag)) continue;
      links.push({ source: note.id, target: `tag:${tag}`, type: 'tag' });
    }
  }

  const tagNames = [...hubTags];
  for (const tag of tagNames) {
    nodes.push({ id: `tag:${tag}`, label: tag, type: 'tag', degree: 0 });
  }

  const degree = new Map<string, number>();
  for (const link of links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  return { nodes, links, titles: Object.fromEntries(titles) };
}

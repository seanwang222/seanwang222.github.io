import type { APIRoute } from 'astro';
import { getNotes } from '../lib/notes';
import { site } from '../data/site';

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site: astroSite }) => {
  const notes = await getNotes();
  const origin = (astroSite ?? new URL('https://wangsichen222.github.io')).href.replace(/\/$/, '');

  const items = notes
    .map(
      (note) => `    <item>
      <title>${escape(note.data.title)}</title>
      <link>${origin}/knowledge/${note.id}/</link>
      <guid>${origin}/knowledge/${note.id}/</guid>
      <pubDate>${note.data.date.toUTCString()}</pubDate>
      <description>${escape(note.data.summary)}</description>
${note.data.tags.map((tag) => `      <category>${escape(tag)}</category>`).join('\n')}
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(site.name)} · 知识空间</title>
    <link>${origin}/</link>
    <description>${escape(site.intro)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

import { visit } from 'unist-util-visit';

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * 把正文里的 [[note-id]] / [[note-id|显示文字]] 转成站内链接。
 * 只在 text 节点上操作，跳过已有链接与代码块，避免二次替换。
 */
export default function remarkWikilink(options = {}) {
  const href = options.href ?? ((id) => `/knowledge/${id}/`);

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      if (!node.value.includes('[[')) return;
      if (parent.type === 'link' || parent.type === 'linkReference') return;

      const children = [];
      let last = 0;
      let match;
      WIKILINK.lastIndex = 0;

      while ((match = WIKILINK.exec(node.value)) !== null) {
        if (match.index > last) {
          children.push({ type: 'text', value: node.value.slice(last, match.index) });
        }
        const target = match[1].trim();
        const label = (match[2] ?? match[1]).trim();
        children.push({
          type: 'link',
          url: href(target),
          data: { hProperties: { class: 'wikilink', 'data-note': target } },
          children: [{ type: 'text', value: label }],
        });
        last = match.index + match[0].length;
      }

      if (children.length === 0) return;
      if (last < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

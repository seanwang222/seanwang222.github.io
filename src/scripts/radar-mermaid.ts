/**
 * 构建期只保留代码块，图在浏览器里渲染：
 * mermaid 体积不小，按需动态加载，失败时回退成可读的源码。
 */
export async function renderMermaidBlocks(root: ParentNode = document): Promise<void> {
  const candidates = findBlocks(root);
  if (candidates.length === 0) return;

  let mermaid: typeof import('mermaid').default;
  try {
    mermaid = (await import('mermaid')).default;
  } catch {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    darkMode: true,
    securityLevel: 'strict',
    fontFamily:
      '"PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", system-ui, sans-serif',
    themeVariables: {
      background: '#0d0e11',
      primaryColor: '#191c21',
      primaryTextColor: '#e9e6df',
      primaryBorderColor: '#d6a756',
      secondaryColor: '#121418',
      tertiaryColor: '#121418',
      lineColor: '#6d6a63',
      textColor: '#d9d5cd',
      mainBkg: '#121418',
      nodeBorder: '#3a3d44',
      clusterBkg: '#0f1114',
      clusterBorder: '#2a2d33',
      edgeLabelBackground: '#0d0e11',
      fontSize: '14px',
    },
    flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: true },
  });

  const nodes: HTMLElement[] = [];
  const sources = new Map<HTMLElement, string>();

  for (const pre of candidates) {
    const source = pre.textContent?.trim() ?? '';
    if (!source) continue;
    const block = document.createElement('div');
    block.className = 'mermaid-block';
    block.dataset.state = 'pending';
    block.textContent = source;
    pre.replaceWith(block);
    nodes.push(block);
    sources.set(block, source);
  }

  if (nodes.length === 0) return;

  try {
    await mermaid.run({ nodes, suppressErrors: true });
  } catch {
    /* 下面逐个检查结果 */
  }

  for (const block of nodes) {
    const svg = block.querySelector('svg');
    if (svg) {
      block.dataset.state = 'ready';
      annotateWide(block, svg);
      continue;
    }
    block.dataset.state = 'error';
    block.textContent = '';
    const details = document.createElement('details');
    details.className = 'mermaid-fallback';
    const summary = document.createElement('summary');
    summary.textContent = '图形未能渲染，展开查看源码';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = sources.get(block) ?? '';
    pre.appendChild(code);
    details.append(summary, pre);
    block.appendChild(details);
  }
}

/** 宽图在窄屏保持原始字号，改为容器内横向滚动，避免整张图缩到看不清。 */
function annotateWide(block: HTMLElement, svg: SVGSVGElement): void {
  const width = svg.viewBox?.baseVal?.width || svg.getBoundingClientRect().width;
  if (!width || width < 600) return;
  block.classList.add('is-wide');
  block.style.setProperty('--mermaid-natural', `${Math.min(Math.ceil(width), 1280)}px`);
  requestAnimationFrame(() => {
    if (block.scrollWidth <= block.clientWidth + 2) return;
    const hint = document.createElement('p');
    hint.className = 'mermaid-scroll-hint';
    hint.textContent = '图形较宽，可左右滑动查看';
    block.after(hint);
  });
}

function findBlocks(root: ParentNode): HTMLElement[] {
  const direct = [...root.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]')];
  if (direct.length > 0) return direct;
  return [...root.querySelectorAll<HTMLElement>('pre')].filter((pre) =>
    pre.querySelector('code.language-mermaid, code[class*="language-mermaid"]')
  );
}

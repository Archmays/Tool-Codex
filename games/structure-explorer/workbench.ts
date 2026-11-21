import './styles.css';
import './materials.css';
import { exhibits } from './data/exhibits';
import { materialIds, materials } from './data/materials';
import { materialStory, swatch } from './material-story';

const DIRECTORY = '?play=structure-explorer';
const exhibitURL = (id: string) => `${DIRECTORY}&amp;exhibit=${encodeURIComponent(id)}`;

export function mountStructureExplorer(root: HTMLElement): { destroy(): void } {
  const requested = new URLSearchParams(window.location.search).getAll('exhibit');
  const exhibit = requested.length === 1 ? exhibits.find(item => item.id === requested[0]) : undefined;
  const unknown = requested.length > 0 && !exhibit;
  root.className = 'structure-explorer-mount';
  root.innerHTML = `<main class="structure-explorer" data-structure-view="${exhibit?.id ?? 'directory'}">
    <header class="structure-header"><div><p class="structure-eyebrow">看看里面 · 动手试试</p><h1>结构探索馆</h1></div>
      <nav aria-label="探索馆导航">${exhibit ? `<a tabindex="0" href="${DIRECTORY}" data-structure-directory>返回探索馆</a>` : ''}<a tabindex="0" href="?world=my-game-world" data-structure-home>返回首页 ↗</a></nav>
    </header>
    ${exhibit ? `<section class="structure-exhibit" aria-label="铅笔工作原理演示"><iframe title="${exhibit.title}交互演示" src="${exhibit.entry}" data-pencil-frame></iframe></section><footer class="structure-footer"><a tabindex="0" href="${DIRECTORY}">返回探索馆</a><a tabindex="0" href="?world=my-game-world">返回首页 ↗</a></footer>` : `
    <section class="structure-intro"><h2>小小物件，里面藏着什么？</h2><p>选一个物件，看看结构，再动手试一试。</p></section>
    ${unknown ? '<p role="status">这个展品还没有开放，先来看看铅笔吧。</p>' : ''}
    <section class="structure-catalog" aria-label="选择一个展品">${exhibits.map(item => `
      <a tabindex="0" class="structure-card" href="${exhibitURL(item.id)}" data-structure-pencil>
        <img src="${item.preview}" width="900" height="430" alt="黄色木杆铅笔的结构演示台">
        <div><h2>${item.title}</h2><p>${item.summary}</p><span class="structure-card-action">${item.action} <span aria-hidden="true">→</span></span></div>
      </a>`).join('')}</section>
    <section class="structure-materials" aria-labelledby="directory-material-title">
      <h2 id="directory-material-title">材料图鉴</h2><p>看看这些东西都是什么做的。</p>
      <div class="directory-materials">${materialIds.map(id => {
        const material = materials[id];
        return `<details class="directory-material" data-directory-material="${id}">
          <summary>${swatch(material.swatchColor)}<span><strong>${material.name}</strong><small>${material.category}</small></span></summary>
          <div class="directory-material-story">${materialStory(material)}<h3>用到它的展品</h3>
          ${exhibits.filter(item => material.usedInExhibits.includes(item.id)).map(item => `<a tabindex="0" href="${exhibitURL(item.id)}">${item.action} →</a>`).join('')}</div>
        </details>`;
      }).join('')}</div>
    </section>`}
  </main>`;

  const frame = root.querySelector<HTMLIFrameElement>('[data-pencil-frame]');
  let documentHeight = 1300;
  let inspecting = false;
  const fitInspector = (): void => {
    if (frame && inspecting) frame.style.height = `${window.innerHeight}px`;
  };
  const resize = (event: MessageEvent): void => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
    if (event.data?.type === 'pencil-inspector' && typeof event.data.open === 'boolean') {
      inspecting = event.data.open;
      if (inspecting) { fitInspector(); frame.scrollIntoView({ block: 'start' }); }
      else frame.style.height = `${documentHeight}px`;
      return;
    }
    if (event.data?.type !== 'pencil-height' || !Number.isFinite(event.data.height)) return;
    documentHeight = Math.max(500, Math.min(20000, event.data.height));
    if (!inspecting) frame.style.height = `${documentHeight}px`;
  };
  window.addEventListener('message', resize);
  window.addEventListener('resize', fitInspector);
  const cancelInput = (): void => { frame?.contentWindow?.postMessage({ type: 'pencil-cancel-input' }, window.location.origin); };
  window.addEventListener('scroll', cancelInput, { passive: true });
  if (!exhibit && document.referrer) {
    const from = new URL(document.referrer);
    if (from.origin === location.origin && from.searchParams.get('exhibit') === 'pencil') root.querySelector<HTMLAnchorElement>('[data-structure-pencil]')?.focus();
  }
  return { destroy() { window.removeEventListener('message', resize); window.removeEventListener('resize', fitInspector); window.removeEventListener('scroll', cancelInput); if (frame) frame.remove(); root.replaceChildren(); } };
}

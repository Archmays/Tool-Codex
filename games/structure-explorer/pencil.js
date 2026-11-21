import { createPaper, deposit } from '../../public/structure-explorer/pencil-model.js';
import { createPencil3D } from './pencil-3d';
import './materials.css';
import { materials } from './data/materials';
import { pencilParts } from './data/pencil-parts';
import { materialIcon, materialStory, swatch } from './material-story';

document.documentElement.dataset.buildCommit = (import.meta.env.VITE_BUILD_COMMIT || 'local-source').trim() || 'local-source';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const views = { assembled: '整支笔', xray: '透视看', exploded: '拆开看', longitudinal: '纵剖', cross: '横剖' };
const chips = [
  ['all', '全部'], ['paint-upper', '表面涂层', '上半涂层'], ['paint-lower', '下半涂层'],
  ['wood-upper', '木壳', '上半木壳'], ['wood-lower', '下半木壳'],
  ['core', '笔芯'], ['seam', '胶合缝'], ['tip', '笔尖区域'],
];
const originNodes = [
  { ids: ['wood'], part: '木壳', source: '森林树木', icon: 'tree' },
  { ids: ['graphite', 'clay'], part: '笔芯', source: '石墨矿与黏土', icon: 'mine' },
  { ids: ['lacquer'], part: '表面涂层', source: '颜料与树脂', icon: 'coat' },
  { ids: ['glue'], part: '胶合缝', source: '木工胶黏剂', icon: 'press' },
  { ids: ['paper-fiber', 'rubber'], part: '纸与橡皮', source: '木浆纤维与橡胶', icon: 'slats' },
];
const ratios = {
  '2H': { graphite: 31, explanation: '黏土比例较高 → 笔芯更硬 → 磨下的石墨颗粒少 → 线条浅而细。' },
  HB: { graphite: 50, explanation: '石墨与黏土较均衡 → 笔芯软硬适中 → 日常写字常用。' },
  '2B': { graphite: 72, explanation: '石墨比例较高 → 笔芯更软 → 更容易磨下石墨颗粒 → 线条深而黑。' },
};
function ratioBar(grade) {
  const { graphite, explanation } = ratios[grade];
  return `<div class="ratio" data-ratio-grade="${grade}"><div class="ratio-bar" aria-hidden="true" style="--graphite:${graphite}%"><span></span><span></span></div>
  <div class="ratio-legend"><span>石墨</span><span>黏土</span></div><p>${explanation}</p></div>`;
}
const svgNS = 'http://www.w3.org/2000/svg';
$('.page').innerHTML = `
<header><h1>没有墨水，铅笔怎样留下黑线？</h1><p class="intro">拆开铅笔，找找它的材料从哪来，再动手写一写、擦一擦。</p></header>
<nav class="tabs" aria-label="选择演示"><button class="selected" data-mode="0" aria-pressed="true">1 拆开看</button><button data-mode="1" tabindex="-1" aria-pressed="false">2 材料从哪来</button><button data-mode="2" tabindex="-1" aria-pressed="false">3 比一比</button><button data-mode="3" tabindex="-1" aria-pressed="false">4 擦一擦</button></nav>
<p id="question" class="question">真正写字的是哪部分？外面的木壳又帮了什么忙？</p>
<div id="exploration-grid" class="grid"><section aria-label="铅笔探索台"><div class="card iso-plate">
<div class="figure-head"><span id="scene-title">结构观察台</span><button id="expand-view">扩大查看</button></div>
<div id="view-buttons" data-for="0" class="control-row" role="group" aria-label="观察视图">${Object.entries(views).map(([id, name]) => `<button data-view="${id}" aria-pressed="${id === 'assembled'}">${name}</button>`).join('')}</div>
<div id="stage-home"><div id="stage" class="iso-stage" tabindex="0" role="group" aria-label="铅笔操作区。书写和擦除模式左右键移动，起点键回到起点，终点键到终点。结构中选择旋转或平移后拖动，滚轮或双指缩放。方向键旋转，加减键缩放，起点键复位，终点键拆开。"><div id="structure"><div id="three-host"><div id="part-labels" aria-hidden="true"></div></div><div class="drag-mode-controls" role="group" aria-label="拖动方式"><span>拖动方式</span><button id="drag-rotate" aria-pressed="true">旋转</button><button id="drag-pan" aria-pressed="false">平移</button><button id="toggle-labels" aria-pressed="false">显示标签</button></div><p id="cut-caption" class="cut-caption" hidden></p><p id="model-help" class="small">选择旋转或平移，再拖动 · 滚轮或双指缩放</p><p id="three-error" role="status" hidden>三维画面暂时不可用，请重新载入页面。</p></div>
<div id="contact" hidden><svg id="paper-scene" viewBox="0 0 760 430" role="img" aria-label="铅笔或橡皮沿纸面移动，保留笔迹与橡皮屑。"><defs><pattern id="paper-texture" width="17" height="13" patternUnits="userSpaceOnUse"><path d="M1 5l6 -1m4 6l5 -2" stroke="#bcb9aa" opacity=".17" stroke-width=".7"/></pattern></defs><path d="M48 58H712V367H48Z" fill="#fdfcf7" stroke="#c5c8ba" stroke-width="2"/><path d="M48 58H712V367H48Z" fill="url(#paper-texture)"/><g id="marks"></g><g id="crumbs"></g><g id="tool-pencil"><path d="M-9 -137H9V-22L0 0L-9 -22Z" fill="#e4bd50" stroke="#8a6c2d" stroke-width="1.5"/><path d="M-9 -22H9L0 0Z" fill="#e6c9a2"/><path d="M-3 -7H3L0 0Z" fill="#333b3c"/><path d="M-5 -130V-25" stroke="#ffdf7c" stroke-width="2"/></g><g id="tool-eraser"><path d="M-24 -28H24V0H-24Z" fill="#e9b8b7" stroke="#977372" stroke-width="1.5"/><path d="M-24 -28l8 -7h48l-8 7Z" fill="#f3d0cc"/><path d="M24 -28l8 -7V-7L24 0Z" fill="#bd9090"/></g></svg></div></div></div>
<div class="control-row explode-controls" data-for="0"><button id="boom">BOOM！拆开</button><button id="return-parts" hidden>返回原位观察</button><label for="explode-slider">拆开程度 <input id="explode-slider" type="range" min="0" max="100" value="0"><output for="explode-slider" id="explode-readout">0%</output></label></div>
<div class="figure-foot"><span id="hint">拖动观察，点 BOOM 看里面。</span><span id="readout">完整铅笔 · 可自由旋转</span></div></div>
<div class="controls"><div id="part-tray" data-for="0" class="part-tray" role="group" aria-label="选择一个部件观察">
${chips.map(([id, label]) => `<button data-inspect-part="${id}" tabindex="${id === 'all' ? 0 : -1}" aria-pressed="${id === 'all'}">${id === 'all' ? '' : swatch(materials[pencilParts[id].materialIds[0]].swatchColor)}<span>${label}</span></button>`).join('')}
</div>
<div id="view-tools-home"><div id="observation-tools"><details><summary>键盘与辅助观察</summary><p class="small">图中方向键旋转，加减键缩放，起点键复位，终点键拆开，回车或空格开合，退出键取消高亮或关闭大图。也可使用下方控件。</p><div class="view-tools" role="group" aria-label="观察视图"><button id="zoom-in">放大</button><button id="zoom-out">缩小</button><button id="pan-left">向左</button><button id="pan-right">向右</button><button id="pan-up">向上</button><button id="pan-down">向下</button><button id="view-reset">视图复位</button><output id="zoom-readout">1×</output></div><div class="control-row" data-for="0"><button id="turn-left">向左转</button><button id="turn-right">向右转</button><button id="turn-up">向上转</button><button id="turn-down">向下转</button></div></details></div></div>
<div data-for="2" hidden><div class="control-row"><label for="pressure">写字力度 <select id="pressure"><option value="0">轻轻写</option><option value="1" selected>平常力度</option><option value="2">稍重一点</option></select></label><label for="grade">笔芯 <select id="grade"><option>2H</option><option selected>HB</option><option>2B</option></select></label><label for="paper">纸面 <select id="paper"><option value="smooth">较光滑</option><option value="ordinary" selected>普通纸</option><option value="rough">较粗糙</option></select></label></div><section class="ratio-window" aria-labelledby="ratio-title"><h2 id="ratio-title">材料配比小窗</h2><p class="small">定性比例示意，各品牌配方可能不同。</p><div id="free-ratio"></div></section><p class="small">自由试写：换笔后，已经画好的线会保留。前后移动会再画一遍。</p></div>
<div data-for="3" hidden><button id="seed">先画一条线</button></div><div class="control-row"><label id="position-label" for="position">移动工具 <input id="position" type="range" min="0" max="100" value="0"></label><button id="auto" aria-pressed="false">自动演示</button><button id="reset">换一张纸</button></div></div>
<p id="caption" class="caption">笔芯留下笔迹。木壳让细细的笔芯更方便握住，也受到保护。</p><p id="status" class="status" aria-live="polite">先猜一猜，再打开看看。</p>
</section><aside class="aside" aria-label="观察与解释"><div id="structure-key" class="observation-card"><h2 id="part-title"></h2><p id="part-description"></p><ul id="part-materials" class="material-traits" aria-label="部件材料"></ul><p id="part-source" class="part-source"></p><button id="part-origin" class="action-button" hidden>看完整来源链</button><button id="inspect-part" hidden>单独拿出来放大转着看</button></div>
<div id="zoom-card" hidden><h2 id="micro-title">纸面发生了什么？</h2><svg id="micro-process" viewBox="0 0 400 280" role="img" aria-label="笔尖或橡皮与纸面接触的分步过程示意"><g id="micro-tip"><path d="M177 10L198 4L234 101L219 109Z" fill="#e5c8a1" stroke="#8c7356"/><path d="M219 109L234 101L239 140Z" fill="#3e4446"/></g><g id="micro-eraser"><path d="M68 36H339V135Q275 142 208 135Q139 142 68 135Z" fill="#e6b6b6" stroke="#755b5b"/><g id="picked"></g></g><g id="fibers"><path d="M18 151Q80 135 140 153T270 153T382 151M18 165Q80 149 140 167T270 167T382 165M18 179Q80 163 140 181T270 181T382 179M18 193Q80 177 140 195T270 195T382 193" fill="none" stroke="#bcad94" stroke-width="2"/></g><g id="micro-particles"></g><g id="moving-particles"></g><text id="micro-label" x="20" y="247">笔尖还没有碰到纸。</text></svg><div class="process-controls"><div class="control-row"><button id="process-prev">上一步</button><button id="process-next">下一步</button></div><label for="process-step">过程 <input id="process-step" type="range" min="0" max="3" value="0"></label></div><p id="process-description" aria-live="polite"></p><p class="small">碎片和纸纤维为放大示意，不按比例，不是显微照片。</p><details><summary>为什么换笔会改变痕迹？</summary><p>笔芯的石墨和黏土配比会影响软硬。较软的笔芯，通常更容易留下较深的痕迹。</p><p>纸面也参与了这个过程：它的凹凸会磨下极细的颗粒。所以比较时，要把其他条件保持相同。</p></details></div>
<section id="eraser-material" class="observation-card" data-for="3" hidden><h2>橡皮是什么做的？</h2><p>${materials.rubber.sourceHeadline}</p><p>摩擦时，柔软的橡皮表面贴住纸上的石墨碎片，把它们裹成灰黑色的橡皮屑。黑色从纸面转移到了橡皮屑里。</p>
<button class="action-button" data-origin-link="rubber">看橡皮的来源链</button></section></aside></div>
<section id="material-mode" data-for="1" hidden aria-label="材料从哪来">
<section class="material-map" aria-labelledby="map-title"><h2 id="map-title">铅笔大自然材料地图</h2>
<div class="map-scene">
<svg class="map-lines" viewBox="0 0 480 400" preserveAspectRatio="none" aria-hidden="true">
<path data-map-line="0" d="M105 59Q143 104 212 137"/><path data-map-line="1" d="M375 59Q335 109 252 141"/>
<path data-map-line="2" d="M105 244Q155 189 191 153"/><path data-map-line="3" d="M375 244Q325 187 281 151"/>
<path data-map-line="4" d="M240 345Q245 236 237 171"/></svg>
<svg class="map-pencil" viewBox="0 0 260 86" role="img" aria-label="铅笔剖面：薄漆、两片木壳和中间的笔芯">
<path d="M15 43L50 17H240Q249 17 249 25V61Q249 69 240 69H50Z" fill="#e9c28b" stroke="#715137" stroke-width="2"/>
<path d="M50 17H240Q249 17 249 25H42Z" fill="#efbd3d"/><path d="M42 61H249Q249 69 240 69H50Z" fill="#dfaa2c"/>
<path d="M19 43H249M56 34H240M56 52H240" fill="none" stroke="#ab754c" stroke-width="1.5" stroke-dasharray="5 4"/>
<path d="M15 43L29 37H249V49H29Z" fill="#41474d"/><path d="M37 40H245" stroke="#858992" stroke-width="1.5"/></svg>
${originNodes.map((node, i) => `<button type="button" data-map-node="${i}" aria-pressed="${i === 0}">${materialIcon(node.icon)}<span><strong>${node.part}</strong><small>${node.source}</small></span></button>`).join('')}</div></section>
<section id="material-story" class="observation-card" aria-labelledby="material-title"><div id="material-switch" class="control-row" role="group" aria-label="选择材料"></div>
<div id="material-text"></div></section></section>
<section id="comparison-lab" class="lab" data-for="2" hidden aria-labelledby="lab-title"><div class="lab-heading"><div><h2 id="lab-title">公平地比一比</h2><p>先猜结果，再让三条线在相同条件下写出来。</p></div><label for="compare-kind">这次改变 <select id="compare-kind"><option value="grade">笔芯：2H、HB、2B</option><option value="pressure">力度：轻、中、重</option><option value="paper">纸面：光滑、普通、粗糙</option><option value="passes">遍数：1、2、3遍</option></select></label></div><p id="compare-conditions"></p><button id="compare-run">按相同条件试写</button><div id="comparison-results" class="comparison-results"><p class="empty-result">你猜哪一条会更深？点“按相同条件试写”，留下三条结果。</p></div><p id="compare-result" aria-live="polite"></p><details><summary>继续追问：2B一定更深吗？</summary><p>如果2H写得重，2B写得轻，还能只看编号判断吗？回到上面的自由试写区，换一个条件试试。</p><p>比较笔芯本身时，我们把力度、纸面和遍数保持一样。否则，几种原因会混在一起。</p></details></section>
<section class="thinking" data-for="3" hidden><h2>黑色消失了吗？</h2><p>把过程移到最后一步：一些碎片留在纸上，一些被橡皮带走。看看橡皮和橡皮屑里发生了什么。</p><details><summary>继续追问：为什么有时擦不干净？</summary><p>纸面、笔芯、橡皮和写字力度都会影响结果。很深的笔迹或纸面上的压痕，可能仍然留下痕迹。</p><p>换成圆珠笔，为什么擦除效果会不同？这里还没有模拟墨水，你可以保留猜想。</p></details></section>
<footer class="exhibit-note"><p>结构与过程是教学示意；笔迹模型用于比较趋势，不是实测数据。每一步都可以用按钮和键盘操作。</p><details><summary>来源与示意说明</summary><p>科学说明依据公开的制造工艺与化学科普资料。<a tabindex="0" href="./sources.md" target="_blank" rel="noopener">查看来源与模型边界</a></p></details><details><summary>家长伴读提示（可选）</summary><ol>
<li><strong>找接缝</strong>：拿一支普通木杆铅笔看笔尾端面，和孩子一起找找两片木头粘合的那条细缝（对照横剖面虚线）。</li>
<li><strong>摸笔尖</strong>：看看削尖的地方为什么没有黄漆，摸一摸裸露木头和外面漆面的手感差别。</li>
<li><strong>比软硬</strong>：如果家里刚好有 HB 和 2B（或不同铅笔），用差不多力气各画一条线，问孩子“你猜哪一支里面的石墨更多？”。</li>
</ol></details></footer>`;
document.body.insertAdjacentHTML('beforeend', '<dialog id="inspector-dialog" aria-labelledby="inspector-title"><header><h2 id="inspector-title">靠近观察</h2><button id="close-inspector">关闭大图</button></header><div id="inspector-stage"></div><div id="inspector-tools"></div><p class="small">选择旋转或平移后拖动；按住上档键并拖动左键可临时平移。滚轮或双指缩放，退出键返回。</p><p id="inspector-description" class="small"></p></dialog>');
$('.page').removeAttribute('aria-busy');
const stage = $('#stage'), still = matchMedia('(prefers-reduced-motion: reduce)');
const STRUCTURE = 0, ORIGINS = 1, WRITING = 2, ERASING = 3;
let mode=STRUCTURE,pos=0,target=0,lastPos=0,auto=false,clock=0,raf=0,last=0;
let sceneVisible=true,visible=true,gesture=null;
let marks=createPaper(),pressure=1,grade='HB',paper='ordinary',crumbs=[],processStep=0,localRemoved=0;
let view='assembled',part='all',zoom=1,center=[465,210], explosionActive=false;
let showLabels=false, labelPreference=null, selectedMaterial='wood';
let structure;
const baseBox=()=>[0,0,760,430];
const activeSvg=()=>$('#paper-scene');
const pathAt=t=>[100+t*560,237+26*Math.sin(t*Math.PI*3)];
const markEls=marks.map((_,i)=>{const p=pathAt(i/(marks.length-1)),el=document.createElementNS(svgNS,'ellipse');el.setAttribute('cx',p[0]);el.setAttribute('cy',p[1]);el.setAttribute('rx',2.2);el.setAttribute('ry',4.2);el.setAttribute('fill','#343638');$('#marks').append(el);return el;});
function resetView(){if(mode===STRUCTURE){structure?.reset();return;}const b=baseBox();center=[b[0]+b[2]/2,b[1]+b[3]/2];zoom=1;renderView();}
function renderView(){if(mode===STRUCTURE)return;const b=baseBox(),w=b[2]/zoom,h=b[3]/zoom;center[0]=Math.max(b[0],Math.min(b[0]+b[2],center[0]));center[1]=Math.max(b[1],Math.min(b[1]+b[3],center[1]));activeSvg().setAttribute('viewBox',`${center[0]-w/2} ${center[1]-h/2} ${w} ${h}`);$('#zoom-readout').textContent=`${zoom.toFixed(1).replace('.0','')}×`;$('#zoom-out').disabled=zoom<=1;$('#zoom-in').disabled=zoom>=6;}
function renderParts() {
  const record = pencilParts[part];
  $('#part-title').textContent = record.title;
  $('#part-description').textContent = record.description;
  $('#part-materials').innerHTML = record.materialIds.map(id => `<li>${swatch(materials[id].swatchColor)}${materials[id].shortName}</li>`).join('');
  $('#part-source').textContent = record.sourcePreview;
  $('#part-origin').hidden = part === 'all';
  $('#inspect-part').hidden = part === 'all';
}
const labelAnchors = new Map();
const crossLabelOrder = ['paint-upper', 'wood-upper', 'core', 'wood-lower', 'paint-lower'];
const labelInset = 8;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function positionLabel(label, left, top) {
  const { anchor, bubble, x, y } = label;
  anchor.style.left = x + 'px';
  anchor.style.top = y + 'px';
  bubble.style.left = (left - x + anchor.offsetWidth / 2) + 'px';
  bubble.style.top = (top - y + anchor.offsetHeight / 2) + 'px';
}

function positionCrossLabels(labels, width, height, referenceBottom) {
  const layers = crossLabelOrder.map(id => labels.get(id)).filter(Boolean);
  const seam = labels.get('seam');
  const center = labels.get('core') ?? layers[0];
  if (center) {
    const halfWidth = Math.max(...layers.map(label => label.halfWidth));
    const seamSpace = seam ? seam.halfWidth * 2 + labelInset : 0;
    const left = clamp(center.x, labelInset + halfWidth, width - labelInset - halfWidth - seamSpace);
    const rowHeight = 2 * Math.max(...layers.map(label => label.halfHeight));
    const gapCount = layers.length - 1;
    const available = height - 2 * labelInset - rowHeight * layers.length;
    const gap = clamp(available / Math.max(1, gapCount), 0, 6);
    const pitch = rowHeight + gap;
    const lastTop = height - labelInset - rowHeight / 2;
    const firstLimit = lastTop - pitch * gapCount;
    // Leave room for every lower layer before placing the current one.
    let nextTop = Math.min(firstLimit, Math.max(labelInset, referenceBottom + gap) + rowHeight / 2);
    layers.forEach((label, index) => {
      const latestTop = lastTop - pitch * (gapCount - index);
      const preferredTop = label.y + (label.id === 'core' ? -22 : 0);
      const top = clamp(preferredTop, nextTop, latestTop);
      positionLabel(label, left, top);
      nextTop = top + pitch;
    });
    if (seam) {
      const seamLeft = Math.max(seam.x + seam.halfWidth + 6, left + halfWidth + labelInset + seam.halfWidth);
      positionLabel(seam, Math.min(seamLeft, width - labelInset - seam.halfWidth),
        clamp(seam.y, labelInset + seam.halfHeight, height - labelInset - seam.halfHeight));
    }
  } else if (seam) {
    positionLabel(seam, clamp(seam.x + seam.halfWidth + 6, labelInset + seam.halfWidth, width - labelInset - seam.halfWidth),
      clamp(seam.y, labelInset + seam.halfHeight, height - labelInset - seam.halfHeight));
  }
}

function renderLabels(points, referenceBottom) {
  const layer = $('#part-labels');
  layer.hidden = !showLabels;
  if (!showLabels) return;
  const { clientWidth: width, clientHeight: height } = layer;
  const labels = new Map();
  for (const { id, x, y } of points) {
    let anchor = labelAnchors.get(id);
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.className = 'part-label-anchor';
      anchor.dataset.partLabel = id;
      const bubble = document.createElement('span');
      bubble.textContent = pencilParts[id].title;
      anchor.append(bubble);
      layer.append(anchor);
      labelAnchors.set(id, anchor);
    }
    anchor.hidden = false;
    const bubble = anchor.firstElementChild;
    labels.set(id, { id, x, y, anchor, bubble, halfWidth: bubble.offsetWidth / 2, halfHeight: bubble.offsetHeight / 2 });
  }
  for (const [id, anchor] of labelAnchors) anchor.hidden = !labels.has(id);
  if (view === 'cross') {
    positionCrossLabels(labels, width, height, referenceBottom);
    return;
  }
  const used = [];
  for (const label of labels.values()) {
    const { id, x, y, halfWidth, halfHeight } = label;
    const direction = id.endsWith('upper') ? -1 : 1;
    const left = clamp(x, labelInset + halfWidth, width - labelInset - halfWidth);
    const minTop = labelInset + halfHeight;
    const maxTop = height - labelInset - halfHeight;
    const initialTop = clamp(y + (id === 'core' ? -22 : direction * 20), minTop, maxTop);
    const step = 2 * halfHeight + 5;
    let top = initialTop;
    const overlaps = candidate => used.some(placed =>
      Math.abs(placed.left - left) < placed.halfWidth + halfWidth + 4 &&
      Math.abs(placed.top - candidate) < placed.halfHeight + halfHeight + 4
    );
    for (let offset = step; overlaps(top) && offset < height; offset += step) {
      const preferred = initialTop + direction * offset;
      const alternate = initialTop - direction * offset;
      if (preferred >= minTop && preferred <= maxTop && !overlaps(preferred)) top = preferred;
      else if (alternate >= minTop && alternate <= maxTop && !overlaps(alternate)) top = alternate;
    }
    used.push({ left, top, halfWidth, halfHeight });
    positionLabel(label, left, top);
  }
}
function structureChanged(s) {
  $('#drag-rotate').setAttribute('aria-pressed', String(s.dragMode === 'rotate'));
  $('#drag-pan').setAttribute('aria-pressed', String(s.dragMode === 'pan'));
  if (view !== s.view) labelPreference = null;
  view = s.view;
  const nextPart = s.selected || 'all';
  if (part !== nextPart) { part = nextPart; renderParts(); }
  zoom = s.scale;
  explosionActive = s.exploded;
  const percent = Math.round(s.explodeAmount * 100);
  $('#explode-slider').value = percent;
  $('#explode-readout').textContent = `${percent}%`;
  $('#zoom-readout').textContent = `${zoom.toFixed(1).replace('.0', '')}×`;
  $('#zoom-in').disabled = zoom >= 8;
  $('#zoom-out').disabled = zoom <= .6;
  $('#boom').textContent = s.exploded ? '合起来' : 'BOOM！拆开';
  $('#return-parts').hidden = !s.inspecting;
  $$('#view-buttons [data-view]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.view === view)));
  const detailed = ['exploded', 'cross', 'longitudinal'].includes(view);
  showLabels = !s.inspecting && (labelPreference ?? detailed);
  $('#toggle-labels').hidden = s.inspecting;
  $('#toggle-labels').setAttribute('aria-pressed', String(showLabels));
  $('#toggle-labels').textContent = showLabels ? '隐藏标签' : '显示标签';
  const splitChips = view === 'exploded' || view === 'cross';
  const tray = $$('[data-inspect-part]');
  chips.forEach(([id, label, expanded], i) => {
    const node = tray[i];
    node.hidden = !splitChips && ['paint-lower', 'wood-lower'].includes(id);
    node.querySelector('span:last-child').textContent = splitChips ? expanded || label : label;
    const selected = !splitChips ? part.replace(/^(wood|paint)-lower$/, '$1-upper') : part;
    node.setAttribute('aria-pressed', String(id === selected));
  });
  if (!tray.some(el => el.tabIndex === 0 && !el.hidden)) {
    const current = tray.find(el => !el.hidden && el.getAttribute('aria-pressed') === 'true') ?? tray[0];
    tray.forEach(el => el.tabIndex = el === current ? 0 : -1);
  }
  $('#cut-caption').hidden = !['cross','longitudinal'].includes(view) || s.inspecting;
  $('#cut-caption').textContent = view === 'cross'
    ? '红色面标出横切位置。点下方放大的截片，找薄漆、木壳、笔芯和中间的胶合缝。'
    : '红色面标出纵切方向。沿笔杆看看笔芯在哪里，比较削尖处与漆面的不同。';
  $('#three-error').hidden = !s.contextLost;
  $('#readout').textContent = part === 'all' ? views[view] : `${views[view]} · 已选${pencilParts[part].title}`;
}
function renderMaterial(id) {
  selectedMaterial = id;
  const material = materials[id];
  const activeNode = originNodes.findIndex(node => node.ids.includes(id));
  $$('[data-map-node]').forEach((node, index) => node.setAttribute('aria-pressed', String(index === activeNode)));
  $$('[data-map-line]').forEach((line, index) => line.classList.toggle('active', index === activeNode));
  const options = originNodes[activeNode].ids;
  const variants = $('#material-switch');
  if (variants.dataset.group !== String(activeNode)) {
    variants.dataset.group = activeNode;
    variants.hidden = options.length === 1;
    variants.innerHTML = options.map(key => `<button data-material-choice="${key}">${materials[key].shortName}</button>`).join('');
  }
  $$('[data-material-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.materialChoice === id)));
  $('#material-text').innerHTML = `<h2 id="material-title" tabindex="-1">${swatch(material.swatchColor)}${material.name}</h2><p class="origin-stage">${material.category}</p>${materialStory(material)}`;
}
function goToMaterial(id) {
  setMode(ORIGINS);
  renderMaterial(id);
  const title = $('#material-title');
  title.focus({ preventScroll: true });
  title.scrollIntoView({ block: 'nearest' });
}
$$('[data-map-node]').forEach((button, i) => button.addEventListener('click', () => renderMaterial(originNodes[i].ids[0])));
$('#material-switch').addEventListener('click', event => {
  const button = event.target.closest('[data-material-choice]');
  if (button) renderMaterial(button.dataset.materialChoice);
});
$$('[data-origin-link]').forEach(button => button.addEventListener('click', () => goToMaterial(button.dataset.originLink)));
const writeSteps=['笔尖还没有碰到纸。','笔尖碰到纸面，开始摩擦。','极细的碎片从笔尖留下。','笔尖离开，碎片留在纸上。'];
const eraseSteps=['先看纸上的笔迹。','橡皮碰到有笔迹的纸面。','一些碎片被带到橡皮中。','橡皮离开，部分碎片被带走。'];
function grains(count,y,shift=0){return Array.from({length:count},(_,i)=>`<path d="M${38+i*14+shift} ${y+(i%3)*3}l5 -2 4 4 -6 3Z" fill="#333b3d"/>`).join('');}
function renderProcess(){
  const sample=marks[Math.min(marks.length-1,Math.floor(pos*marks.length))];
  const present=mode===WRITING?processStep>=2:sample>.001||localRemoved>.001;
  const blankSteps=['这里还没有笔迹。','橡皮碰到空白纸。','这里没有石墨可带走。','橡皮离开，纸面仍然空白。'];
  const label=(mode===ERASING?(present?eraseSteps:blankSteps):writeSteps)[processStep];
  $('#process-step').value=processStep;$('#process-prev').disabled=processStep===0;$('#process-next').disabled=processStep===3;
  $('#micro-label').textContent=label;$('#micro-title').textContent=mode===ERASING?'石墨去哪里了？':'纸面发生了什么？';
  $('#micro-tip').style.display=mode===WRITING?'':'none';$('#micro-eraser').style.display=mode===ERASING?'':'none';
  const count=present?Math.max(3,Math.round(Math.max(sample,localRemoved/4)*22)):0;
  $('#micro-particles').innerHTML=grains(mode===ERASING&&processStep>=2?Math.ceil(count*.4):count,145);
  $('#moving-particles').innerHTML=mode===WRITING&&processStep===2?grains(4,126,150):'';
  $('#picked').innerHTML=mode===ERASING&&processStep>=2&&present?grains(Math.ceil(count*.6),120,45):'';
  $('#micro-tip').setAttribute('transform',`translate(${processStep===3?60:0},${processStep===0||processStep===3?-28:0})`);
  $('#micro-eraser').setAttribute('transform',`translate(0,${processStep===0||processStep===3?-26:0})`);
  const detail=mode===WRITING?['先猜黑线来自哪里，再移动笔尖。','纸面看起来平，放大后有凹凸。','摩擦会留下极细的笔芯颗粒。这里用深灰碎片表示其中的石墨。','黑色留在纸面上，就成了笔迹。碎片不是墨水。'][processStep]:['放大图跟随当前工具所在的位置。先画一条线，才有碎片可带走。','橡皮与纸面摩擦，开始带走一部分石墨。','黑色从纸面转移到橡皮和橡皮屑中，线逐渐变淡。','还有一些留在纸上；擦除是转移，石墨没有凭空消失。'][processStep];
  $('#process-description').textContent=mode===ERASING&&!present?['当前位置没有笔迹。点“先画一条线”，可以准备擦除观察。','橡皮可以碰到纸，但空白处没有石墨。','没有石墨可带走，放大图中也不会出现黑色碎片。','擦过空白纸，不会凭空生成笔迹。'][processStep]:detail;
}
function touch(from,to){
  if(mode!==WRITING&&mode!==ERASING)return;
  const result=deposit(marks,from,to,{grade,pressure,paper},mode===ERASING);localRemoved=result.removed;
  if(mode===ERASING&&result.removed>.01){const lo=Math.floor(Math.min(from,to)*marks.length),hi=Math.min(marks.length-1,Math.ceil(Math.max(from,to)*marks.length));for(let i=lo;i<=hi;i++){if(i%8===0&&!crumbs.some(c=>c.i===i))crumbs.push({i,t:i/(marks.length-1)});}}
  processStep=3;
}
function update(){
  if(mode===ORIGINS)return;
  $('#structure').hidden=mode!==STRUCTURE;$('#structure-key').hidden=mode!==STRUCTURE;$('#contact').hidden=mode===STRUCTURE;$('#zoom-card').hidden=mode===STRUCTURE;
  $('#position-label').hidden=mode===STRUCTURE;$('#reset').hidden=mode===STRUCTURE;
  $('#tool-pencil').style.display=mode===WRITING?'':'none';$('#tool-eraser').style.display=mode===ERASING?'':'none';
  const p=pathAt(pos);$('#tool-pencil').setAttribute('transform',`translate(${p[0]},${p[1]}) rotate(-18)`);$('#tool-eraser').setAttribute('transform',`translate(${p[0]},${p[1]})`);
  markEls.forEach((el,i)=>el.setAttribute('opacity',marks[i]));
  $('#crumbs').innerHTML=crumbs.map((c,i)=>{const p=pathAt(c.t);return `<path d="M${p[0]} ${p[1]+18+i%3*3}l4 -1 3 3 -5 2Z" fill="#85807b"/>`;}).join('');
  if(mode!==STRUCTURE)$('#readout').textContent=mode===WRITING?`${grade} · ${['轻轻写','平常力度','稍重一点'][pressure]} · 笔尖走过`:marks[Math.min(marks.length-1,Math.floor(pos*marks.length))]>.001||localRemoved>.001?'线变淡 · 石墨被带走':'空白处 · 没有石墨可带走';
  $('#position').value=Math.round(pos*100);$('#auto').hidden=mode===STRUCTURE;
  $('#auto').textContent=still.matches?'演示这一步':auto?'暂停演示':'自动演示';$('#auto').setAttribute('aria-pressed',String(auto));
  renderView();renderProcess();
}
function tick(now){const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;if(auto&&!still.matches){clock+=dt;target=(1-Math.cos(clock*1.5))/2;}const f=still.matches?1:1-Math.exp(-dt/.18);pos+=(target-pos)*f;if(Math.abs(pos-target)<.0001)pos=target;if(pos!==lastPos){touch(lastPos,pos);lastPos=pos;}update();raf=visible&&(auto||Math.abs(pos-target)>.0001)?requestAnimationFrame(tick):0;}
function run(){if(!raf&&visible&&(mode===WRITING||mode===ERASING)){last=0;raf=requestAnimationFrame(tick);}}
function take(){auto=false;clock=0;target=pos;update();}
function snapshot(){return{marks:[...marks],crumbs:[...crumbs],pos,lastPos,target,processStep,localRemoved};}
function cancelGesture(){if(gesture){({marks,crumbs,pos,lastPos,target,processStep,localRemoved}=gesture.state);if(stage.hasPointerCapture(gesture.id))stage.releasePointerCapture(gesture.id);}gesture=null;target=pos;lastPos=pos;update();}
function suspend(){structure?.suspend();cancelGesture();take();if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
function setMode(n) {
  if (![STRUCTURE, ORIGINS, WRITING, ERASING].includes(n)) return;
  suspend();
  mode = n;
  $('#exploration-grid').hidden = mode === ORIGINS;
  structure?.setActive(mode === STRUCTURE);
  pos = target = lastPos = 0; processStep = 0; localRemoved = 0;
  $$('[data-mode]').forEach((el, i) => {
    el.tabIndex = i === mode ? 0 : -1;
    el.setAttribute('aria-pressed', String(i === mode));
    el.classList.toggle('selected', i === mode);
  });
  $$('[data-for]').forEach(el => el.hidden = Number(el.dataset.for) !== mode);
  $('#question').textContent = ['真正写字的是哪部分？外面的木壳又帮了什么忙？', '点一个源头，看看材料怎样来到铅笔旁。', '换一支笔，痕迹为什么不同？怎样比才公平？', '擦过以后，黑色去了哪里？'][mode];
  if (mode === ORIGINS) { renderMaterial(selectedMaterial); return; }
  $('#scene-title').textContent = mode === STRUCTURE ? '结构观察台' : mode === WRITING ? '自由试写台' : '擦除观察台';
  $('#caption').textContent = mode === STRUCTURE ? '笔芯留下笔迹。木壳保护笔芯，也方便握笔。'
    : mode === WRITING ? '笔尖划过纸面，留下极细的颗粒。下方的比较台，每次只改变一个条件。' : '橡皮带走一部分石墨，黑线变淡。沿着过程图，看看石墨去了哪里。';
  $('#hint').textContent = mode === STRUCTURE ? '拖动转一转，点画面或部件名称来观察。' : '点击纸面或横向拖动，也可以用移动工具滑条。';
  $('#status').textContent = mode === STRUCTURE ? '' : mode === WRITING ? '先自由试写，或到下方公平地比一比。' : '先有笔迹，才能看见擦除。';
  resetView();
  update();
}
$$('[data-mode]').forEach(el => el.addEventListener('click', () => setMode(Number(el.dataset.mode))));
$('#drag-rotate').addEventListener('click', () => structure.setDragMode('rotate'));
$('#drag-pan').addEventListener('click', () => structure.setDragMode('pan'));
function toggleExplosion() { structure.setExplodeAmount(explosionActive ? 0 : 1, true); }
$('#boom').addEventListener('click', toggleExplosion);
$('#explode-slider').addEventListener('input', e => structure.setExplodeAmount(Number(e.target.value) / 100));
$$('#view-buttons [data-view]').forEach(button => button.addEventListener('click', () => structure.setView(button.dataset.view)));
$('#toggle-labels').addEventListener('click', () => { labelPreference = !showLabels; structure.refresh(); });
function focusPiece(id) {
  structure.focusPart(id === 'all' ? null : id);
  $('#status').textContent = id === 'all' ? '正在观察整支笔。' : `已选${pencilParts[id].title}。可以继续看部件档案。`;
}
$$('[data-inspect-part]').forEach(el => el.addEventListener('click', () => {
  $$('[data-inspect-part]').forEach(node => node.tabIndex = node === el ? 0 : -1);
  focusPiece(el.dataset.inspectPart);
}));
$('#part-tray').addEventListener('keydown', e => {
  if (guardedKey(e) || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
  e.preventDefault();
  const nodes = $$('[data-inspect-part]').filter(el => !el.hidden);
  const at = nodes.indexOf(document.activeElement);
  const previous = ['ArrowLeft','ArrowUp'].includes(e.key);
  const index = e.key === 'Home' ? 0 : e.key === 'End' ? nodes.length - 1 : (at + (previous ? nodes.length - 1 : 1)) % nodes.length;
  $$('[data-inspect-part]').forEach(el => el.tabIndex = el === nodes[index] ? 0 : -1);
  nodes[index].focus();
});
$('#part-origin').addEventListener('click', () => goToMaterial(pencilParts[part].materialIds[0]));
$('#position').addEventListener('input', e => {
  const next = Number(e.target.value) / 100;
  take();
  // The slider still moves the tool when a short screen has scrolled the paper out of view.
  if (still.matches || !visible) {
    touch(pos, next);
    pos = target = lastPos = next;
    update();
    return;
  }
  target = next;
  run();
});
$('#pressure').addEventListener('change',e=>{take();pressure=Number(e.target.value);update();});$('#grade').addEventListener('change',e=>{take();grade=e.target.value;renderRatio();update();});$('#paper').addEventListener('change',e=>{take();paper=e.target.value;update();});
$('#reset').addEventListener('click',()=>{take();marks.fill(0);crumbs=[];pos=target=lastPos=0;localRemoved=0;processStep=0;$('#status').textContent='自由试写区换好新纸了，比较结果仍然保留。';update();});
$('#seed').addEventListener('click',()=>{take();marks.fill(0);deposit(marks,0,1,{grade:'HB',pressure:1,paper:'ordinary'});crumbs=[];pos=target=lastPos=0;processStep=0;localRemoved=0;$('#status').textContent='有一条笔迹了，试着擦一擦。';update();});
$('#auto').addEventListener('click',()=>{if(still.matches){take();const next=pos>.95?0:1;touch(pos,next);pos=target=lastPos=next;update();return;}else{auto=!auto;clock=0;if(!auto)target=pos;}update();run();});
for(const [id,factor]of [['zoom-in',1.5],['zoom-out',1/1.5]])$('#'+id).addEventListener('click',()=>{suspend();if(mode===STRUCTURE)structure.zoom(factor);else{zoom=Math.max(1,Math.min(6,zoom*factor));renderView();}});
for(const [id,x,y]of [['pan-left',-1,0],['pan-right',1,0],['pan-up',0,-1],['pan-down',0,1]])$('#'+id).addEventListener('click',()=>{suspend();if(mode===STRUCTURE){structure.pan(x*.45,y*.45);return;}const b=baseBox();center[0]+=x*b[2]/zoom*.18;center[1]+=y*b[3]/zoom*.18;renderView();});
$('#view-reset').addEventListener('click',()=>{suspend();resetView();});
const dialog=$('#inspector-dialog'),viewTools=$('#observation-tools');
let inspectorDetailsOpen=false,inspectorOpener=$('#expand-view');
for(const [id,x,y] of [['turn-left',-.2,0],['turn-right',.2,0],['turn-up',0,-.2],['turn-down',0,.2]])$('#'+id).addEventListener('click',()=>structure.turn(x,y));
function expand(opener) {
  if (dialog.open) return;
  inspectorDetailsOpen = viewTools.querySelector('details').open;
  inspectorOpener = opener;
  suspend();
  $('#inspector-stage').append(stage);
  $('#inspector-tools').append(viewTools);
  $('#inspector-tools').prepend($('#return-parts'));
  dialog.showModal();
  if (window.parent !== window) window.parent.postMessage({ type: 'pencil-inspector', open: true }, location.origin);
  $('#close-inspector').focus();
}
$('#inspect-part').addEventListener('click', event => {
  structure.inspect(part);
  expand(event.currentTarget);
  $('#inspector-title').textContent = `${pencilParts[part].title} · 转着看`;
  $('#inspector-description').textContent = pencilParts[part].description;
});
$('#expand-view').addEventListener('click', event => expand(event.currentTarget));
function closeInspector() { dialog.close(); }
$('#return-parts').addEventListener('click',closeInspector);
$('#close-inspector').addEventListener('click',closeInspector);
dialog.addEventListener('close',()=>{suspend();structure.returnParts();$('#stage-home').append(stage);$('#view-tools-home').append(viewTools);viewTools.querySelector('details').open=inspectorDetailsOpen;$('#boom').after($('#return-parts'));$('#inspector-title').textContent='靠近观察';$('#inspector-description').textContent='';if(window.parent!==window)window.parent.postMessage({type:'pencil-inspector',open:false},location.origin);(inspectorOpener.isConnected?inspectorOpener:$('#expand-view')).focus();});
dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...dialog.querySelectorAll('button:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.tabIndex>=0&&el.checkVisibility());const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
for(const [id,delta]of [['process-prev',-1],['process-next',1]])$('#'+id).addEventListener('click',()=>{suspend();processStep=Math.max(0,Math.min(3,processStep+delta));renderProcess();});
$('#process-step').addEventListener('input',e=>{const next=Number(e.target.value);suspend();processStep=next;renderProcess();});
function renderRatio() { $('#free-ratio').innerHTML = ratioBar(grade); }
const comparisonConditions={grade:'只换笔芯；普通纸、平常力度、相同笔尖、相同长度，各写一遍。',pressure:'只换力度；HB、普通纸、相同笔尖、相同长度，各写一遍。',paper:'只换纸面；HB、平常力度、相同笔尖、相同长度，各写一遍。',passes:'只换遍数；HB、普通纸、平常力度、相同笔尖和长度。'};
$('#compare-conditions').textContent=comparisonConditions.grade;
$('#compare-kind').addEventListener('change',()=>{$('#compare-conditions').textContent=comparisonConditions[$('#compare-kind').value];$('#compare-result').textContent='条件已选好。重新试写后，下方才会换成这次的结果。';});
$('#compare-run').addEventListener('click',()=>{
  const kind=$('#compare-kind').value;
  const results=[0,1,2].map(i=>{const settings={grade:kind==='grade'?['2H','HB','2B'][i]:'HB',pressure:kind==='pressure'?i:1,paper:kind==='paper'?['smooth','ordinary','rough'][i]:'ordinary'};const passes=kind==='passes'?i+1:1,m=createPaper();for(let p=0;p<passes;p++)deposit(m,0,1,settings);const density=m.reduce((a,b)=>a+b,0)/m.length;const title=kind==='grade'?settings.grade:kind==='pressure'?['轻','中','重'][i]:kind==='paper'?['光滑','普通','粗糙'][i]:passes+'遍';const particles=Array.from({length:160},(_,j)=>`<ellipse cx="${14+j*1.68}" cy="${44+9*Math.sin(j/159*Math.PI*3)+(j%5-2)*1.4}" rx="1.6" ry="2.5" fill="#303738" opacity="${density*(.72+(j%4)*.09)}"/>`).join('');return `<article data-comparison-row><h3>${title}</h3><svg viewBox="0 0 300 94" role="img" aria-label="${title}的试写结果" data-density="${density}" data-grade="${settings.grade}" data-pressure="${settings.pressure}" data-paper="${settings.paper}" data-passes="${passes}"><path d="M10 30H290M10 62H290" stroke="#d6d9cd" stroke-width=".5"/>${particles}</svg><p>${settings.grade} · ${['轻','中','重'][settings.pressure]}力度 · ${['smooth','ordinary','rough'].indexOf(settings.paper)===0?'光滑':settings.paper==='rough'?'粗糙':'普通'}纸 · ${passes}遍</p>${kind === 'grade' ? ratioBar(settings.grade) : ''}</article>`;});
  $('#comparison-results').innerHTML=results.join('');$('#compare-result').textContent={grade:'同样条件下，2H 较浅、HB 居中、2B 较深。通常石墨比例越高，笔芯越软，纸上留下的石墨就越多。定性比例示意，各品牌配方可能不同。',pressure:'同一支HB，这次较重的力度留下较深的痕迹。',paper:'同一支笔，较粗糙的纸面磨下更多细颗粒，示意笔迹更深。',passes:'同一支笔反复涂画，留下的颗粒累积，痕迹逐渐变深。'}[kind];
});
function targetAt(e){const svg=activeSvg(),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());return Math.max(0,Math.min(1,(local.x-100)/560));}
stage.addEventListener('pointerdown',e=>{if(mode===STRUCTURE||!e.isPrimary||e.button!==0){if(gesture)cancelGesture();return;}take();gesture={id:e.pointerId,state:snapshot(),x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;if(e.pointerType==='touch'&&Math.abs(e.clientY-gesture.y)>Math.abs(e.clientX-gesture.x)+8){cancelGesture();return;}if(Math.abs(e.clientX-gesture.x)>5){target=targetAt(e);run();}});
stage.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;gesture=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);target=targetAt(e);run();});
stage.addEventListener('pointercancel',()=>{cancelGesture();structure?.cancel();});stage.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});
document.addEventListener('keydown', e => {
  if (guardedKey(e) || e.key !== 'Escape' || e.repeat) return;
  if (dialog.open) { e.preventDefault(); closeInspector(); }
  else if (mode === STRUCTURE && part !== 'all') {
    if ($('#structure-key').contains(document.activeElement)) stage.focus({ preventScroll: true });
    focusPiece('all');
  }
});
function guardedKey(e){return e.defaultPrevented||e.isComposing||e.keyCode===229||e.ctrlKey||e.metaKey||e.altKey;}
stage.addEventListener('keydown',e=>{if(e.target!==stage||guardedKey(e))return;if(mode===STRUCTURE){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' ','+','=','-','Escape'].includes(e.key))return;e.preventDefault();if(e.repeat&&!e.key.startsWith('Arrow'))return;take();if(e.key.startsWith('Arrow'))structure.turn(e.key==='ArrowLeft'?-.16:e.key==='ArrowRight'?.16:0,e.key==='ArrowUp'?-.16:e.key==='ArrowDown'?.16:0);else if(e.key==='Home')structure.reset();else if(e.key==='End')structure.setView('exploded');else if(e.key==='+'||e.key==='=')structure.zoom(1.2);else if(e.key==='-')structure.zoom(1/1.2);else if(e.key==='Escape'){if(dialog.open)closeInspector();else focusPiece('all');}else toggleExplosion();return;}if(!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key))return;e.preventDefault();if(e.repeat)return;take();target=e.key==='Home'?0:e.key==='End'?1:Math.max(0,Math.min(1,target+(e.key==='ArrowLeft'?-.1:.1)));run();});
$('.tabs').addEventListener('keydown',e=>{if(guardedKey(e)||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();if(e.repeat)return;const next=e.key==='Home'?0:e.key==='End'?3:(mode+(e.key==='ArrowLeft'?3:1))%4;setMode(next);$('[data-mode="'+next+'"]').focus();});
// On touch, focus may arrive after pointerup. Pause autoplay without canceling that confirmed tap.
stage.addEventListener('focus',()=>{auto=false;clock=0;update();$('#status').textContent=mode===STRUCTURE?'方向键旋转，加减键缩放，起点键复位，终点键拆开。可用跳格键前往部件栏。':'左右键移动，起点键回到起点，终点键到终点。';});
new IntersectionObserver(es=>{sceneVisible=es.at(-1).isIntersecting;visible=sceneVisible&&!document.hidden;if(!visible)suspend();else run();}).observe(stage);
document.addEventListener('visibilitychange',()=>{visible=sceneVisible&&!document.hidden;if(!visible)suspend();else run();});
window.addEventListener('blur',suspend);window.addEventListener('pagehide',suspend);
window.addEventListener('scroll',()=>{if(gesture)cancelGesture();},{passive:true});window.addEventListener('wheel',()=>{if(gesture)cancelGesture();},{passive:true});
window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===location.origin&&e.data?.type==='pencil-cancel-input'){if(gesture)cancelGesture();structure?.cancel();}});
still.addEventListener('change',()=>{suspend();update();});
if(window.parent!==window){let sent=0;new ResizeObserver(()=>{const h=Math.ceil($('.page').getBoundingClientRect().height+48);if(h!==sent){sent=h;window.parent.postMessage({type:'pencil-height',height:h},location.origin);}}).observe($('.page'));}
window.pencilDemo={state:()=>({mode,open:structure?.state().explodeAmount ?? 0,pos,auto,marks:[...marks],crumbs:crumbs.length,pressure,grade,paper,view,part,zoom,processStep,structure:structure?.state()}),setMode};
structure=createPencil3D($('#three-host'),structureChanged,focusPiece,renderLabels);
structureChanged(structure.state());renderParts();renderRatio();renderMaterial(selectedMaterial);setMode(STRUCTURE);

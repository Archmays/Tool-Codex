import * as THREE from 'three';
import { pencilParts, type PencilPartId } from './data/pencil-parts';
import { createPencilGeometry, createCrossSection, createLongitudinalSection } from './pencil-geometry';

export type StructureView = 'assembled' | 'xray' | 'exploded' | 'cross' | 'longitudinal';
export type StructureState = { rotation: [number, number]; pan: [number, number]; dragMode: 'rotate' | 'pan'; scale: number; selected: string | null; gesturing: boolean; ready: boolean; view: StructureView; exploded: boolean; explodeAmount: number; inspecting: boolean; contextLost: boolean };
type Anchor = { id: PencilPartId; x: number; y: number };
const groupedParts: Partial<Record<PencilPartId, PencilPartId[]>> = {
  seam: ['wood-upper', 'wood-lower'], tip: ['wood-upper', 'wood-lower', 'core'],
};
const offsets: Record<string, number> = { 'paint-upper': 3.3, 'wood-upper': 1.65, core: 0, 'wood-lower': -1.65, 'paint-lower': -3.3 };

/** The same meshes are assembled, exploded and ray-picked. No projected SVG substitutes. */
export function createPencil3D(host: HTMLElement, notify: (state: StructureState) => void, picked: (id: PencilPartId) => void, projectLabels: (points: Anchor[], referenceBottom: number) => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f7f3');
  const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 100);
  camera.position.set(0, 0, 24);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#f4f7f3');
  const canvas = renderer.domElement;
  canvas.id = 'pencil-3d'; canvas.setAttribute('aria-label', '三维铅笔。选择旋转或平移后拖动，滚轮或双指缩放；点击部件，在原位看它的材料。');
  host.prepend(canvas);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b8172, 2.6));
  const light = new THREE.DirectionalLight(0xffffff, 3.2); light.position.set(-3, 6, 12); scene.add(light);
  const fill = new THREE.DirectionalLight(0xf3d6aa, 1.1); fill.position.set(4, -3, -7); scene.add(fill);
  const pivot = new THREE.Group(); scene.add(pivot);
  const { root, parts } = createPencilGeometry(); pivot.add(root);
  const cross = createCrossSection(), longitudinal = createLongitudinalSection(); pivot.add(cross, longitudinal);
  // The segmented line identifies the joint on the end face, with a readable width at phone sizes.
  const seam = new THREE.Group(); seam.name = 'seam'; seam.userData.partId = 'seam';
  const seamMaterial = new THREE.MeshStandardMaterial({ color: '#886342' });
  const dashGeometry = new THREE.BoxGeometry(.004, .011, .036);
  for (const sign of [-1, 1]) {
    for (const distance of [.136, .203, .27]) {
      const dash = new THREE.Mesh(dashGeometry, seamMaterial);
      dash.position.set(.074, 0, sign * distance);
      dash.name = 'seam'; dash.userData.partId = 'seam';
      seam.add(dash);
    }
  }
  cross.add(seam);
  const meshes = [root, cross, longitudinal].flatMap(group => {
    const records: { mesh: THREE.Mesh; id: PencilPartId; material: THREE.MeshStandardMaterial }[] = [];
    const originals = new Set<THREE.MeshStandardMaterial>();
    group.traverse(node => {
      if (!(node instanceof THREE.Mesh) || !(node.material instanceof THREE.MeshStandardMaterial)) return;
      originals.add(node.material);
      const material = node.material.clone();
      node.material = material;
      records.push({ mesh: node, id: node.userData.partId, material });
    });
    originals.forEach(material => material.dispose());
    return records;
  });
  const cutReference = createPencilGeometry().root;
  cutReference.scale.setScalar(.48); cutReference.position.set(0, 2.5, 0);
  cutReference.rotation.set(.38, .28, 0);
  cutReference.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !(node.material instanceof THREE.MeshStandardMaterial)) return;
    node.material.transparent = true; node.material.opacity = .35; node.material.depthWrite = false;
  });
  pivot.add(cutReference);
  const cuttingPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: '#bb634d', transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }));
  cutReference.add(cuttingPlane);
  const ray = new THREE.Raycaster();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let view: StructureView = 'assembled', selected: PencilPartId | null = null, isolated: PencilPartId | null = null, scale = 1, rotation: [number, number] = [.55, -.22];
  let pan = [0, 0], amount = 0, desired = 0, raf = 0, active = true, disposed = false, contextLost = false;
  let dragMode: 'rotate' | 'pan' = 'rotate', dragAction: 'rotate' | 'pan' = 'rotate';
  let saved: { rotation: [number, number]; scale: number; pan: number[] } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let initial: { rotation: [number, number]; scale: number; pan: number[] } | null = null;
  let down: { x: number; y: number } | null = null, moved = false, multi = false;
  const state = (): StructureState => ({ rotation: [...rotation], pan: [pan[0], pan[1]], dragMode, scale, selected, gesturing: pointers.size > 0, ready: !disposed && !contextLost, view, exploded: desired > 0, explodeAmount: amount, inspecting: isolated !== null, contextLost });
  function publish() { host.dataset.view = view; host.dataset.selected = selected ?? ''; host.dataset.exploded = String(desired > 0); host.dataset.explodeAmount = String(amount); host.dataset.inspecting = String(!!isolated); notify(state()); }
  function layout() {
    const section = !isolated && (view === 'cross' || view === 'longitudinal');
    root.visible = !section; cross.visible = section && view === 'cross'; longitudinal.visible = section && view === 'longitudinal';
    cutReference.visible = section;
    cuttingPlane.rotation.set(view === 'longitudinal' ? Math.PI / 2 : 0, view === 'cross' ? Math.PI / 2 : 0, 0);
    cuttingPlane.scale.set(view === 'cross' ? 1 : 9, 1, 1);
    const aspect = Math.max(.2, host.clientWidth / Math.max(1, canvas.clientHeight));
    const compactCross = cross.visible && (aspect < 1.25 || canvas.clientHeight < 260);
    cross.rotation.set(0, -Math.PI / 2, 0);
    cross.scale.setScalar(compactCross ? 4.7 : 5.6);
    cross.position.y = -.5;
    cutReference.position.y = compactCross ? 2.65 : 2.5;
    longitudinal.rotation.x = -Math.PI / 2; longitudinal.position.y = -.5;
    const isolatedParts = isolated ? groupedParts[isolated] ?? [isolated] : null;
    for (const [id, group] of parts) {
      group.visible = !isolatedParts || isolated === 'tip' || isolatedParts.includes(id as PencilPartId);
      group.position.set(0, isolated || section || view === 'xray' ? 0 : offsets[id] * amount, 0);
      const groove = id === 'wood-upper' ? -.9 : id === 'wood-lower' ? .9 : 0;
      group.rotation.x = groove * (isolated === id ? 1.2 : isolated || section || view === 'xray' ? 0 : amount);
    }
    const focusIds = selected ? [selected, ...(groupedParts[selected] ?? [])] : [];
    for (const { mesh, id, material } of meshes) {
      const focused = !isolated && focusIds.includes(id);
      const xray = view === 'xray' && !isolated;
      const shell = xray && id !== 'core';
      const ghost = !isolated && !!selected && !focused;
      const shellOpacity = id.startsWith('paint') ? .13 : .15;
      material.opacity = shell ? shellOpacity * (ghost ? .75 : 1) : ghost && !xray ? .22 : 1;
      if (id === 'core') material.color.setScalar(xray ? .55 : 1);
      const transparent = material.opacity < 1;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = !transparent;
      material.emissive.set(focused ? '#a96c23' : '#000000');
      material.emissiveIntensity = focused ? .28 : 0;
      mesh.renderOrder = xray && id === 'core' ? 3 : shell && focused ? 2 : 0;
    }
    pivot.rotation.set(rotation[0], rotation[1], isolated && isolated !== 'tip' && aspect < 1 ? .9 : -.04);
    pivot.position.set(pan[0] + (isolated === 'tip' ? 4.3 : 0), pan[1], 0);
    const width = isolated && isolated !== 'tip' && aspect < 1 ? 8 : isolated ? 11.2 : view === 'cross' ? 6.4 : 12.2;
    const height = Math.max(isolated && aspect < 1 ? 10.8 : isolated ? 2.4 : view === 'exploded' ? 8.7 : section ? 6.2 : 4.5, width / aspect);
    camera.left = -height * aspect / (2 * scale); camera.right = -camera.left;
    camera.top = height / (2 * scale); camera.bottom = -camera.top; camera.updateProjectionMatrix();
  }
  const point = new THREE.Vector3();
  const referenceBounds = new THREE.Box3();
  function project() {
    const group = cross.visible ? cross : longitudinal.visible ? longitudinal : root;
    const points: Anchor[] = [];
    if (!isolated) for (const node of group.children) {
      const id: PencilPartId | undefined = node.userData.partId;
      if (!id || !node.visible) continue;
      const paint = id.startsWith('paint');
      const half = id.endsWith('upper') ? 1 : -1;
      if (group === cross) {
        if (id === 'seam') point.set(.077, 0, -.23);
        else if (id === 'core') point.set(.077, 0, 0);
        else point.set(.077, half * (paint ? .298 : .22), paint ? .172 : 0);
      } else if (id === 'core') {
        point.set(-2, group === longitudinal ? -.002 : 0, 0);
      } else if (group === longitudinal) {
        point.set(paint ? 3 : .6, -.002, paint ? -.344 : -.19);
      } else {
        point.set(paint ? 2.9 : .6, half * (paint ? .298 : .18), paint ? .172 : 0);
      }
      node.localToWorld(point).project(camera);
      if (Math.abs(point.x) < 1 && Math.abs(point.y) < 1) points.push({ id, x: (point.x + 1) * canvas.clientWidth / 2, y: (1 - point.y) * canvas.clientHeight / 2 });
    }
    let referenceBottom = 0;
    if (cross.visible) {
      referenceBounds.setFromObject(cutReference);
      // This camera looks along Z, so the bounds' lowest world Y gives the visual bottom.
      point.copy(referenceBounds.min).project(camera);
      referenceBottom = (1 - point.y) * canvas.clientHeight / 2;
    }
    projectLabels(points, referenceBottom);
  }
  function draw() { if (disposed || contextLost || !active) return; layout(); renderer.render(scene, camera); publish(); project(); }
  function resize() { if (disposed) return; const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setSize(w, h, false); draw(); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  function animate() {
    raf = 0; if (!active || disposed) return;
    amount += (desired - amount) * .18;
    if (Math.abs(amount - desired) < .002) amount = desired;
    draw(); if (amount !== desired) raf = requestAnimationFrame(animate);
  }
  function settle() { if (raf) cancelAnimationFrame(raf); raf = 0; amount = desired; }
  function cancel(rollback = true) {
    const ids = [...pointers.keys()]; pointers.clear();
    if (rollback && initial) { rotation = initial.rotation; scale = initial.scale; pan = initial.pan; }
    initial = null; down = null; moved = false; multi = false;
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    draw();
  }
  function reset() {
    cancel();
    rotation = isolated ? [.25, -.15] : view === 'cross' ? [.08, -.08] : view === 'longitudinal' ? [.04, -.05] : [.55, -.22];
    scale = isolated === 'tip' ? 3.2 : 1; pan = [0, 0]; draw();
  }
  function setExplodeAmount(value: number, animateValue = false) {
    if (isolated || !Number.isFinite(value)) return;
    cancel();
    desired = THREE.MathUtils.clamp(value, 0, 1);
    if (view !== 'exploded' && view !== 'assembled') {
      rotation = [.55, -.22]; scale = 1; pan = [0, 0];
    }
    view = desired > 0 ? 'exploded' : 'assembled';
    if (animateValue && !motion.matches) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(animate);
    } else settle();
    draw();
  }
  function setView(next: StructureView) {
    if (isolated) return;
    cancel();
    view = next;
    if (view === 'longitudinal' && selected === 'wood-lower') selected = 'wood-upper';
    if (view === 'longitudinal' && selected === 'paint-lower') selected = 'paint-upper';
    desired = view === 'exploded' ? 1 : 0;
    settle();
    reset();
  }
  function focusPart(id: PencilPartId | null) {
    if (id && !(id in pencilParts)) return;
    cancel(); selected = id; draw();
  }
  function inspect(id: PencilPartId) {
    if (id === 'all' || !(id in pencilParts)) return;
    cancel(); settle();
    saved = { rotation: [...rotation], scale, pan: [...pan] };
    isolated = id;
    reset();
  }
  function returnParts() {
    cancel();
    if (saved) {
      rotation = saved.rotation; scale = saved.scale; pan = saved.pan; saved = null;
    }
    isolated = null; draw();
  }
  function zoom(factor: number) { scale = THREE.MathUtils.clamp(scale * factor, .6, 8); draw(); }
  function turn(x: number, y: number) { rotation[0] += y; rotation[1] += x; draw(); }
  function moveByPixels(dx: number, dy: number) {
    pan[0] += dx * (camera.right - camera.left) / canvas.clientWidth;
    pan[1] -= dy * (camera.top - camera.bottom) / canvas.clientHeight;
    draw();
  }
  function hit(x: number, y: number) {
    if (isolated) return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
    const group = view === 'cross' ? cross : view === 'longitudinal' ? longitudinal : root;
    const hits = ray.intersectObject(group, true).filter(h => {
      let node: THREE.Object3D | null = h.object;
      while (node) { if (!node.visible) return false; node = node.parent; }
      return !!h.object.userData.partId;
    });
    const hit = view === 'xray' ? hits.find(h => h.object.userData.partId === 'core') ?? hits[0] : hits[0];
    if (hit) picked(hit.object.userData.partId);
  }
  canvas.addEventListener('pointerdown', e => {
    if (!active || contextLost || e.button !== 0) return;
    host.closest<HTMLElement>('#stage')?.focus({ preventScroll: true });
    settle(); if (!pointers.size) { initial = { rotation: [...rotation], scale, pan: [...pan] }; down = { x: e.clientX, y: e.clientY }; moved = false; multi = false; dragAction = e.shiftKey ? 'pan' : dragMode; }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); multi ||= pointers.size > 1;
    canvas.setPointerCapture(e.pointerId); draw();
  });
  canvas.addEventListener('pointermove', e => {
    const previous = pointers.get(e.pointerId); if (!previous) return;
    const before = [...pointers.values()]; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) moved = true;
    if (pointers.size === 1 && moved) {
      if (dragAction === 'pan') moveByPixels(e.clientX - previous.x, e.clientY - previous.y);
      else turn((e.clientX - previous.x) * .012, (e.clientY - previous.y) * .012);
    }
    else if (pointers.size === 2) {
      const after = [...pointers.values()]; const distance = (ps: { x: number; y: number }[]) => Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const old = distance(before); if (old > 2) zoom(distance(after) / old);
      const dx = (after[0].x + after[1].x - before[0].x - before[1].x) / 2, dy = (after[0].y + after[1].y - before[0].y - before[1].y) / 2;
      moveByPixels(dx, dy);
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (!pointers.has(e.pointerId)) return;
    const click = !moved && !multi; pointers.delete(e.pointerId);
    if (!pointers.size) initial = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    draw(); if (click) hit(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointercancel', () => cancel());
  canvas.addEventListener('lostpointercapture', e => { if (pointers.has(e.pointerId)) cancel(); });
  canvas.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey || !active) return; e.preventDefault(); cancel(); zoom(Math.exp(-e.deltaY * .002)); }, { passive: false });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancel(); settle(); contextLost = true; publish(); });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; resize(); });
  const stop = () => { settle(); cancel(); };
  window.addEventListener('blur', stop);
  const hidden = () => { if (document.hidden) stop(); }; document.addEventListener('visibilitychange', hidden);
  const scroll = () => { if (pointers.size) cancel(); }; window.addEventListener('scroll', scroll, { passive: true });
  const hidePage = (event: PageTransitionEvent) => { if (event.persisted) stop(); else destroy(); };
  const showPage = (event: PageTransitionEvent) => { if (event.persisted && !disposed) resize(); };
  window.addEventListener('pagehide', hidePage); window.addEventListener('pageshow', showPage);
  function destroy() {
    if (disposed) return; stop(); disposed = true; observer.disconnect();
    window.removeEventListener('blur', stop); window.removeEventListener('scroll', scroll); window.removeEventListener('pagehide', hidePage); window.removeEventListener('pageshow', showPage); document.removeEventListener('visibilitychange', hidden);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map); } } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); canvas.remove();
  }
  resize();
  return { state, refresh: draw, setView, setExplodeAmount, focusPart, inspect, returnParts, reset, zoom, turn, setDragMode(next: 'rotate' | 'pan') { cancel(); dragMode = next; draw(); }, pan(x: number, y: number) { pan[0] += x; pan[1] += y; draw(); }, cancel, suspend: stop, setActive(value: boolean) { stop(); active = value; if (active) resize(); }, destroy };
}

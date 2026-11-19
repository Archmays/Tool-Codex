import "./styles.css";
import type { MountedGame } from "../../packages/game-core";
import { ACTIVE_CHILD_PRODUCTS } from "../../packages/data/gamePortfolio";
import { mountWorldSettings, type WorldSettingsHandle } from "./ui/WorldSettings";
import { WORLD_COPY } from "./world-copy";
import {
  BEAD_GENERATOR_ROUTE,
  CLASSIC_HUB_FROM_WORLD_ROUTE,
  MY_GAME_WORLD_ROUTE,
} from "./world-routes";
import {
  readWorldHomeState,
  updateWorldSettings,
  type WorldHomeStorageLike,
  type WorldHomeState,
} from "./world-state";

export interface MyGameWorldOptions {
  readonly storage?: WorldHomeStorageLike;
}

export interface MyGameWorldHandle extends MountedGame {
  getState(): WorldHomeState;
}

function browserStorage(): WorldHomeStorageLike {
  // Access to localStorage itself can be denied, before getItem is called.
  try { return window.localStorage; }
  catch { return { getItem() { throw new Error("Storage unavailable"); }, setItem() { throw new Error("Storage unavailable"); } }; }
}

function addPageClass(name: string): void {
  document.documentElement.classList.add(name);
  document.body.classList.add(name);
}

function removePageClass(name: string): void {
  document.documentElement.classList.remove(name);
  document.body.classList.remove(name);
}

export function mountMyGameWorld(root: HTMLElement, options: MyGameWorldOptions = {}): MyGameWorldHandle {
  const storage = options.storage ?? browserStorage();
  let state = readWorldHomeState(storage);
  let settings: WorldSettingsHandle | null = null;
  let destroyed = false;

  addPageClass("my-game-world-page");
  root.className = "my-game-world-mount";
  const activeProductIds = ACTIVE_CHILD_PRODUCTS.map((record) => record.id).join(" ");
  root.innerHTML = `<main class="my-game-world" data-testid="my-game-world" data-recovered="${String(state.recoveredCalmly)}" data-active-child-products="${activeProductIds}">
    ${new URLSearchParams(window.location.search).get("notice")?.startsWith("retired-") ? '<p class="world-retired-notice" role="status">这个旧游戏已移除。原有存档仍保留在本机。</p>' : ""}
    <header class="world-header">
      <h1>${WORLD_COPY.title}</h1>
      <button class="world-icon-button" type="button" data-world-settings-open>${WORLD_COPY.settingsAction}</button>
    </header>
    <section class="world-hanzi-tool" aria-label="中文工具"><a tabindex="0" href="?play=hanzi-stroke-lab" data-world-stroke-link><span class="world-hanzi-tool__glyph" aria-hidden="true">永</span><span><strong>汉字书房</strong><span>查字与笔顺 · 不会读也能手写找字</span></span><span aria-hidden="true">↗</span></a></section>
    <section class="world-hanzi-tool world-english-tool" aria-label="英语工具"><a tabindex="0" href="?play=english-study" data-world-english-link><span class="world-hanzi-tool__glyph" aria-hidden="true">Aa</span><span><strong>英语书房</strong><span>查词与字母笔顺 · 大写小写都能逐笔看</span></span><span aria-hidden="true">↗</span></a></section>
    <section class="world-hanzi-tool" aria-label="结构与工作原理"><a tabindex="0" href="?play=structure-explorer" data-world-structure-link><span class="world-hanzi-tool__glyph" aria-hidden="true">探</span><span><strong>结构探索馆</strong><span>看看里面有什么 · 动手试试怎样工作</span></span><span aria-hidden="true">↗</span></a></section>
    <section class="world-hanzi-tool" aria-label="拼豆工具"><a href="${BEAD_GENERATOR_ROUTE}" data-world-bead-link><span class="world-hanzi-tool__glyph" aria-hidden="true">豆</span><span><strong>MARD 拼豆图纸生成器</strong><span>用图片生成带色号的拼豆图纸</span></span><span aria-hidden="true">↗</span></a></section>
    <nav class="world-more" aria-label="游戏列表" data-testid="world-treasure-box"><a tabindex="0" href="${CLASSIC_HUB_FROM_WORLD_ROUTE}" data-world-treasure-link>${WORLD_COPY.treasureTitle}<span aria-hidden="true">→</span></a></nav>
    <div class="world-modal-layer" data-world-modal-layer></div>
  </main>`;

  const modalHost = root.querySelector<HTMLElement>("[data-world-modal-layer]");
  if (!modalHost) throw new Error("My Game World mount surface is incomplete");
  const applySettings = (): void => {
    root.dataset.reducedMotion = String(state.settings.reducedMotion);
  };
  applySettings();

  // Navigation-only state belongs to this history entry, never to a save key.
  const entries = ["stroke", "english", "structure", "bead", "treasure"] as const;
  for (const entry of entries) {
    root.querySelector(`[data-world-${entry}-link]`)?.addEventListener("click", () => {
      window.history.replaceState({ ...window.history.state, worldHomeReturn: { entry, scrollY: window.scrollY } }, "");
    });
  }
  const restoreEntry = (): void => {
    if (destroyed || settings) return;
    const saved = window.history.state?.worldHomeReturn;
    let entry = entries.includes(saved?.entry) ? saved.entry as typeof entries[number] : null;
    if (!entry && document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin && referrer.pathname === new URL(BEAD_GENERATOR_ROUTE, window.location.href).pathname) entry = "bead";
      else if (referrer.origin === window.location.origin && referrer.pathname === window.location.pathname) {
        const query = referrer.searchParams;
        if (query.get("hub") === "classic") entry = "treasure";
        else if (query.get("play") === "hanzi-stroke-lab") entry = "stroke";
        else if (query.get("play") === "english-study") entry = "english";
        else if (query.get("play") === "structure-explorer") entry = "structure";
      }
    }
    if (!entry) return;
    const link = root.querySelector<HTMLElement>(`[data-world-${entry}-link]`);
    link?.focus({ preventScroll: true });
    if (Number.isFinite(saved?.scrollY) && saved.scrollY >= 0) window.scrollTo(0, saved.scrollY);
    else link?.scrollIntoView({ block: "nearest" });
  };
  const restoreAfterLayout = (): void => { requestAnimationFrame(restoreEntry); };
  window.addEventListener("pageshow", restoreAfterLayout);
  restoreAfterLayout();

  const closeModal = (): void => {
    settings?.destroy();
    settings = null;
    modalHost.replaceChildren();
    root.querySelector<HTMLElement>("[data-world-settings-open]")?.focus();
  };

  root.querySelector<HTMLElement>("[data-world-settings-open]")?.addEventListener("click", () => {
    closeModal();
    settings = mountWorldSettings(modalHost, state.settings, (patch) => {
      const update = updateWorldSettings(storage, state, patch);
      state = update.state;
      applySettings();
      return update.ok;
    }, closeModal);
  });

  if (new URLSearchParams(window.location.search).get("parent") === "observation") {
    closeModal();
    settings = mountWorldSettings(modalHost, state.settings, (patch) => {
      const update = updateWorldSettings(storage, state, patch);
      state = update.state;
      applySettings();
      return update.ok;
    }, closeModal, { openObservation: true });
  }

  return {
    getState: () => state,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      settings?.destroy();
      window.removeEventListener("pageshow", restoreAfterLayout);
      removePageClass("my-game-world-page");
      root.replaceChildren();
    },
  };
}

export { CLASSIC_HUB_FROM_WORLD_ROUTE, MY_GAME_WORLD_ROUTE } from "./world-routes";
export { MY_GAME_WORLD_SETTINGS_KEY, readWorldHomeState, updateWorldSettings } from "./world-state";

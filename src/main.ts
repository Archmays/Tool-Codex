import "./styles.css";
import "./page-mode.css";
import { normalizeRetiredLanguageRoute, normalizeRemovedToolboxRoute, pageModeForSearch, resolveAppRoute, type AppRouteKind } from "./app-route";
import { activatePageMode } from "./page-mode";
import { bindInputLifecycle } from "../packages/ui/input";
import { CLASSIC_HUB_FROM_WORLD_ROUTE, MY_GAME_WORLD_ROUTE } from "../apps/my-game-world/world-routes";

const WORLD_THEME_COLOR = "#071c2a";
const CLASSIC_THEME_COLOR = "#f6f3e7";
const BUILD_COMMIT = (import.meta.env.VITE_BUILD_COMMIT || "local-source").trim() || "local-source";

document.documentElement.dataset.buildCommit = BUILD_COMMIT;

function setBrowserIdentity(title: string, themeColor: string): void {
  document.title = title;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeColor;
}

function renderRouteLoading(root: HTMLElement, returnHref?: string): void {
  root.innerHTML = `<main class="route-state" aria-labelledby="route-loading-title">
    <span class="route-state__glow" aria-hidden="true"></span>
    <h1 id="route-loading-title">正在打开……</h1>
    <p role="status">请稍等一下，已经保存的进度不会改变。</p>
    <div>${returnHref ? returnLink(returnHref) : '<button type="button" data-route-retry>刷新</button>'}</div>
  </main>`;
  root.querySelector<HTMLButtonElement>("[data-route-retry]")?.addEventListener("click", () => window.location.reload());
}

function returnLink(href: string): string {
  const label = href === CLASSIC_HUB_FROM_WORLD_ROUTE ? "回游戏百宝箱" : "回工具箱";
  return `<a tabindex="0" href="${href}">${label}</a>`;
}

function renderRouteError(root: HTMLElement, returnHref: string): void {
  root.innerHTML = `<main class="route-state route-state--error" aria-labelledby="route-error-title">
    <h1 id="route-error-title" tabindex="-1">这个地方暂时没有打开</h1>
    <p>可以再试一次，或回去选别的游戏。已保存的进度还在。</p>
    <div><button type="button" data-route-retry>再试一次</button>${returnLink(returnHref)}</div>
  </main>`;
  root.querySelector<HTMLButtonElement>("[data-route-retry]")?.addEventListener("click", () => window.location.reload());
  root.querySelector<HTMLElement>("#route-error-title")?.focus();
}

async function mountApp(root: HTMLElement, search: URLSearchParams, kind: AppRouteKind): Promise<void> {
  const play = search.get("play");
  activatePageMode(pageModeForSearch(search));

  if (kind === "play" && play === "hanzi-stroke-lab") {
    setBrowserIdentity("汉字书房 · 查字与笔顺", "#f6f3eb");
    const { mountHanziStrokeLab } = await import("../games/hanzi-stroke-lab/workbench");
    mountHanziStrokeLab(root);
    return;
  }

  if (kind === "play" && play === "english-study") {
    setBrowserIdentity("英语书房 · 查词与字母笔顺", "#f3f0e8");
    const { mountEnglishStudy } = await import("../games/english-study/workbench");
    mountEnglishStudy(root);
    return;
  }

  if (kind === "play" && play === "structure-explorer") {
    setBrowserIdentity("结构探索馆 · 结构与工作原理", "#ffffff");
    const { mountStructureExplorer } = await import("../games/structure-explorer/workbench");
    mountStructureExplorer(root);
    return;
  }

  if (kind === "classic-hub") {
    setBrowserIdentity("游戏百宝箱", CLASSIC_THEME_COLOR);
    const { mountClassicHubFromWorld } = await import("../apps/hub/world-entry");
    mountClassicHubFromWorld(root);
    return;
  }

  if (kind === 'play' && play === 'memory-card') {
    setBrowserIdentity('记忆配对', '#f0ead2');
    const { mountMemoryMatch } = await import('../packages/activity-engines/memory-match');
    mountMemoryMatch(root, { context: 'classic', packId: 'same-glyph' });
    return;
  }

  setBrowserIdentity("工具箱", WORLD_THEME_COLOR);
  const { mountMyGameWorld } = await import("../apps/my-game-world");
  mountMyGameWorld(root);
}

function startApp(): void {
  const root = document.getElementById("app");
  if (!root) return;
  const url = new URL(window.location.href);
  if (normalizeRetiredLanguageRoute(url) || normalizeRemovedToolboxRoute(url)) window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  const search = url.searchParams;
  const { kind } = resolveAppRoute(search);
  const isDestination = kind !== "world";
  const fromClassic = search.get("from") === "hub" && kind === "play";
  const returnHref = fromClassic ? CLASSIC_HUB_FROM_WORLD_ROUTE : MY_GAME_WORLD_ROUTE;
  bindInputLifecycle(root, () => {});
  renderRouteLoading(root, isDestination ? returnHref : undefined);
  void mountApp(root, search, kind).catch(() => renderRouteError(root, returnHref));
}

startApp();

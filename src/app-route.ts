import type { PageMode } from "./page-mode";
import {
  APP_ROUTE_QUERY_MANIFEST,
  PLAY_SURFACE_MANIFEST,
  type AppRouteKind,
  type PlaySurfaceRecord,
  type ScrollPolicy,
} from "../packages/data/playSurfaceManifest";

export type { AppRouteKind } from "../packages/data/playSurfaceManifest";

export interface ResolvedAppRoute {
  readonly kind: AppRouteKind;
  readonly explicit: boolean;
}

/** Current public route inventory, ordered by dispatch precedence. */
export const APP_ROUTE_QUERY_REGISTRY = APP_ROUTE_QUERY_MANIFEST.map((route) => ({
  ...route,
  pageMode: pageModeForScrollPolicy(route.defaultScrollPolicy),
}));

export const RETIRED_LANGUAGE_PLAY_IDS = [
  "hanzi-magic-complete", "hanzi-v2-chapter-one", "hanzi-v2-v1", "hanzi-radical-battle",
  "hanzi-magic-battle", "hanzi-magic-v2", "pinyin-magic-battle", "english-spell-battle-legacy", "english-spell-battle",
] as const;
export const RETIRED_LANGUAGE_WORLD_IDS = ["english-world", "chinese-world", "ink-forest", "wordlight-island"] as const;

/** Retired links have no runtime/save side effects. Clear conflicting query/hash state while keeping the Pages subpath. */
export function normalizeRetiredLanguageRoute(url: URL): boolean {
  const isRetired = ["play", "game"].some(key => url.searchParams.getAll(key).some(value => RETIRED_LANGUAGE_PLAY_IDS.some(id => id === value)))
    || url.searchParams.getAll("world").some(value => RETIRED_LANGUAGE_WORLD_IDS.some(id => id === value));
  if (!isRetired) return false;
  url.search = "?world=my-game-world&notice=retired-language";
  url.hash = "";
  return true;
}

export function normalizeRemovedToolboxRoute(url: URL): boolean {
  const retiredPlay = ["hanzi-tower-defense", "hanzi-word-adventure"];
  if (!["play", "game"].some(key => url.searchParams.getAll(key).some(id => retiredPlay.includes(id)))
    && !url.searchParams.getAll("world").includes("math-world")
    && !url.searchParams.getAll("playtest").includes("step4")) return false;
  url.search = "?world=my-game-world&notice=retired-game";
  url.hash = "";
  return true;
}

function pageModeForScrollPolicy(policy: ScrollPolicy): PageMode {
  return policy === "document" ? "game-scrollable" : "game-fullscreen";
}

function routeSpecificity(route: string): number {
  return [...new URLSearchParams(route.startsWith("?") ? route.slice(1) : route)].length;
}

function surfaceMatches(search: URLSearchParams, surface: PlaySurfaceRecord): boolean {
  const expected = new URLSearchParams(surface.route.startsWith("?") ? surface.route.slice(1) : surface.route);
  return [...expected].every(([key, value]) => search.get(key) === value);
}

export function playSurfaceForSearch(search: URLSearchParams): PlaySurfaceRecord | null {
  return [...PLAY_SURFACE_MANIFEST]
    .sort((left, right) => routeSpecificity(right.route) - routeSpecificity(left.route))
    .find((surface) => surfaceMatches(search, surface)) ?? null;
}

/** Route precedence: complete edition > current/legacy play > classic hub > family world. */
export function resolveAppRoute(search: URLSearchParams): ResolvedAppRoute {
  for (const route of APP_ROUTE_QUERY_REGISTRY) {
    if (search.get(route.queryKey) === route.queryValue) return { kind: route.kind, explicit: true };
  }
  return { kind: "world", explicit: false };
}

export function pageModeForAppRoute(kind: AppRouteKind): PageMode {
  const registration = APP_ROUTE_QUERY_REGISTRY.find((route) => route.kind === kind);
  if (!registration) throw new Error(`Missing page mode registration for ${kind}`);
  return registration.pageMode;
}

export function pageModeForSearch(search: URLSearchParams): PageMode {
  const surface = playSurfaceForSearch(search);
  if (surface) return pageModeForScrollPolicy(surface.scrollPolicy);
  const registration = APP_ROUTE_QUERY_REGISTRY.find((route) => search.get(route.queryKey) === route.queryValue);
  if (registration) return registration.pageMode;

  // Unknown or absent query parameters render My Game World in mountApp, so
  // they must use that surface's scroll contract as well, including a bare first
  // open, a bookmarked query and a return from a child world.
  const defaultSurface = PLAY_SURFACE_MANIFEST.find((record) => record.id === "my-game-world");
  return pageModeForScrollPolicy(defaultSurface?.scrollPolicy ?? "document");
}

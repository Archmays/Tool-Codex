import type { TestProfileId } from "./gamePortfolio";

export type PlaySurfaceKind =
  | "portfolio-world"
  | "classic-hub"
  | "classic-entry"
  | "product-world"
  | "chapter"
  | "support-activity"
  | "postgame"
  | "station"
  | "region"
  | "journal";

export type PlayInput = "pointer" | "touch" | "keyboard";
export type PlaySurfaceQualityProfile = TestProfileId | "portfolio-play-ready";
export type ScrollPolicy = "document" | "internal" | "locked";

export interface PlaySurfaceRecord {
  readonly id: string;
  readonly title: string;
  readonly route: string;
  readonly productId: string;
  readonly kind: PlaySurfaceKind;
  readonly parentSurfaceId?: string;
  readonly returnRoute: string;
  readonly primaryActionSelector: string;
  readonly settingsAvailable: boolean;
  readonly destructiveActionAvailable: boolean;
  readonly saveNamespaces: readonly string[];
  readonly hostSaveNamespaces: readonly string[];
  readonly runtimeSaveNamespaces: readonly string[];
  readonly mountDefinitionId?: string;
  readonly topLevelProductId?: string;
  readonly worldModuleId?: string;
  readonly runtimeOwnerDefinitionId?: string;
  readonly hostWorldId?: "chinese" | "math" | "english";
  readonly compatibilitySurfaceId?: string;
  readonly expectedInputs: readonly PlayInput[];
  readonly qualityProfile: PlaySurfaceQualityProfile;
  readonly scrollPolicy: ScrollPolicy;
  readonly scrollContainerSelector?: string;
  readonly lockedReason?: string;
  readonly primaryEntry?: boolean;
}

export type AppRouteKind = "play" | "classic-hub" | "world";
export interface AppRouteQueryRegistration {
  readonly kind: AppRouteKind;
  readonly queryKey: "play" | "hub" | "world" | "playtest";
  readonly queryValue: string;
  readonly query: string;
  readonly defaultScrollPolicy: "document" | "locked";
}

export const APP_ROUTE_QUERY_MANIFEST = [
  { kind: "play", queryKey: "play", queryValue: "structure-explorer", query: "?play=structure-explorer", defaultScrollPolicy: "document" },
  { kind: "play", queryKey: "play", queryValue: "hanzi-stroke-lab", query: "?play=hanzi-stroke-lab", defaultScrollPolicy: "document" },
  { kind: "play", queryKey: "play", queryValue: "english-study", query: "?play=english-study", defaultScrollPolicy: "document" },
  { kind: "play", queryKey: "play", queryValue: "memory-card", query: "?play=memory-card", defaultScrollPolicy: "document" },
  { kind: "classic-hub", queryKey: "hub", queryValue: "classic", query: "?hub=classic", defaultScrollPolicy: "document" },
  { kind: "world", queryKey: "world", queryValue: "my-game-world", query: "?world=my-game-world", defaultScrollPolicy: "document" },
] as const satisfies readonly AppRouteQueryRegistration[];

const ALL_INPUTS = ["pointer", "touch", "keyboard"] as const;

type SurfaceInput = Omit<PlaySurfaceRecord, "scrollPolicy" | "hostSaveNamespaces" | "runtimeSaveNamespaces"> & {
  readonly scrollPolicy?: ScrollPolicy;
  readonly hostSaveNamespaces?: readonly string[];
  readonly runtimeSaveNamespaces?: readonly string[];
};

function surface(record: SurfaceInput): PlaySurfaceRecord {
  const { hostSaveNamespaces = [], runtimeSaveNamespaces = record.saveNamespaces, ...rest } = record;
  return { scrollPolicy: "document", ...rest, hostSaveNamespaces, runtimeSaveNamespaces };
}

export const PLAY_SURFACE_MANIFEST: readonly PlaySurfaceRecord[] = [
  surface({ id: "structure-explorer", title: "结构探索馆", route: "?play=structure-explorer", productId: "structure-explorer", kind: "support-activity", parentSurfaceId: "my-game-world", returnRoute: "?world=my-game-world", primaryActionSelector: "[data-structure-pencil]", settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: [], expectedInputs: ALL_INPUTS, qualityProfile: "a-core-world", mountDefinitionId: "structure-explorer", runtimeOwnerDefinitionId: "structure-explorer" }),
  surface({ id: "structure-pencil", title: "铅笔为什么能写字？", route: "?play=structure-explorer&exhibit=pencil", productId: "structure-explorer", kind: "support-activity", parentSurfaceId: "structure-explorer", returnRoute: "?play=structure-explorer", primaryActionSelector: "[data-structure-directory]", settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: [], expectedInputs: ALL_INPUTS, qualityProfile: "a-core-world", mountDefinitionId: "structure-explorer", runtimeOwnerDefinitionId: "structure-explorer" }),
  surface({ id: "hanzi-stroke-lab", title: "汉字书房", route: "?play=hanzi-stroke-lab", productId: "hanzi-stroke-lab", kind: "support-activity", parentSurfaceId: "my-game-world", returnRoute: "?world=my-game-world", primaryActionSelector: "[data-search] button", settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: ["family-games/hanzi-stroke-lab/v1"], expectedInputs: ALL_INPUTS, qualityProfile: "a-core-world", mountDefinitionId: "hanzi-stroke-lab", runtimeOwnerDefinitionId: "hanzi-stroke-lab", hostWorldId: "chinese" }),
  surface({ id: "english-study", title: "英语书房", route: "?play=english-study", productId: "english-study", kind: "support-activity", parentSurfaceId: "my-game-world", returnRoute: "?world=my-game-world", primaryActionSelector: "[data-es-search] button", settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: ["family-games/english-study/v1"], expectedInputs: ALL_INPUTS, qualityProfile: "a-core-world", mountDefinitionId: "english-study", runtimeOwnerDefinitionId: "english-study", hostWorldId: "english" }),
  surface({ id: 'memory-independent', title: '独立记忆配对', route: '?play=memory-card', productId: 'memory-card', kind: 'support-activity', parentSurfaceId: 'classic-hub', returnRoute: '?hub=classic&from=world', primaryActionSelector: '[data-card-id]:not(:disabled)', settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: ['family-games/memory-match/v1'], expectedInputs: ALL_INPUTS, qualityProfile: 'c-module', mountDefinitionId: 'memory-card', runtimeOwnerDefinitionId: 'memory-card', compatibilitySurfaceId: 'memory-definition-adapter', topLevelProductId: 'memory-card', primaryEntry: true }),
  surface({ id: "my-game-world", title: "工具箱", route: "?world=my-game-world", productId: "portfolio", kind: "portfolio-world", returnRoute: "?world=my-game-world", primaryActionSelector: "[data-world-bead-link]", settingsAvailable: true, destructiveActionAvailable: false, saveNamespaces: ["family-games/my-game-world/v1"], expectedInputs: ALL_INPUTS, qualityProfile: "portfolio-play-ready", scrollPolicy: "document", primaryEntry: true }),
  surface({ id: "classic-hub", title: "游戏百宝箱", route: "?hub=classic&from=world", productId: "portfolio", kind: "classic-hub", parentSurfaceId: "my-game-world", returnRoute: "?world=my-game-world", primaryActionSelector: ".game-card__button", settingsAvailable: false, destructiveActionAvailable: false, saveNamespaces: [], expectedInputs: ALL_INPUTS, qualityProfile: "portfolio-play-ready", compatibilitySurfaceId: "classic-hub", primaryEntry: true }),


] as const;

export const PRIMARY_PLAY_SURFACES = PLAY_SURFACE_MANIFEST.filter((record) => record.primaryEntry);
export const PLAY_SURFACE_BY_ID: ReadonlyMap<string, PlaySurfaceRecord> = new Map(PLAY_SURFACE_MANIFEST.map((record) => [record.id, record]));

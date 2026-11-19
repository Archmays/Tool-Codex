export type WorldId = "chinese" | "math" | "english" | "shared";
export type ProductRole = "utility" | "flagship" | "flagship-module" | "core-world" | "independent-puzzle" | "module";
export type DefinitionRole = "independent-tool" | "active-child-product" | "world-module-mount" | "compatibility-adapter";
export type QualityTier = "S" | "A" | "B" | "C";
export type LifecycleStatus = "active" | "active-module" | "active-maintenance" | "compatibility-only";
export type LoadingPolicy = "current-eager" | "route-lazy" | "mixed";
export type TestProfileId = "s-hanzi-release" | "s-equation-release" | "a-core-world" | "b-independent-puzzle" | "c-module";

export interface PortfolioTestProfile {
  readonly id: TestProfileId;
  readonly qualityTier: QualityTier;
  readonly requiredGates: readonly string[];
}

/**
 * One record per mountable GameDefinition. This is deliberately not the child
 * product count: module mounts and compatibility adapters remain registered so
 * old saves and routes can stay readable after child-facing convergence.
 */
export interface GamePortfolioRecord {
  readonly id: string;
  readonly targetWorld: WorldId;
  readonly productRole: ProductRole;
  readonly definitionRole: DefinitionRole;
  readonly activeChildProduct: boolean;
  readonly classicCardVisible: boolean;
  readonly childProductOrder?: number;
  readonly qualityTier: QualityTier;
  readonly lifecycleStatus: LifecycleStatus;
  readonly mergeTarget?: string;
  readonly canonicalRoute?: string;
  readonly worldModuleIds: readonly string[];
  readonly compatibilitySurfaceIds: readonly string[];
  readonly sharedEngineIds: readonly string[];
  readonly saveNamespaces: readonly string[];
  readonly testProfile: TestProfileId;
  readonly loadingPolicy: LoadingPolicy;
  readonly contentStatus: "frozen" | "playable";
  readonly canonicalDocs: readonly string[];
}

export interface WorldModuleRecord {
  readonly id: string;
  readonly world: Exclude<WorldId, "shared">;
  readonly title: string;
  readonly mountDefinitionId: string;
  readonly runtimeOwnerDefinitionId: string;
  readonly hostProductId: string;
  readonly qualityProfile: TestProfileId;
  readonly runtimeSaveNamespaces: readonly string[];
  readonly route: string;
  readonly engineId?: string;
  readonly status: "active-module";
}

export interface ClassicCardExceptionRecord {
  readonly definitionId: string;
  readonly worldModuleIds: readonly string[];
  readonly rationale: string;
  readonly evidenceRef: string;
}

export interface CompatibilitySurfaceRecord {
  readonly id: string;
  readonly title: string;
  readonly route?: string;
  readonly purpose: "alternate-launcher" | "legacy-route" | "definition-adapter";
}

export interface SharedEngineRecord {
  readonly id: string;
  readonly path: string;
  readonly consumers: readonly string[];
}

export const PORTFOLIO_FOUNDATION_BASELINE = "12c86dc22b7219a23baeb26efbe7eab9fb0a2da2";
export const PORTFOLIO_FOUNDATION_INITIAL_TRACKED_BYTES = 708_232_522;

export const PORTFOLIO_TEST_PROFILES: readonly PortfolioTestProfile[] = [
  { id: "s-hanzi-release", qualityTier: "S", requiredGates: ["pure simulation", "full E2E", "pointer/keyboard/touch", "visual/ARIA/geometry", "save recovery", "asset/performance", "Pages exact commit"] },
  { id: "s-equation-release", qualityTier: "S", requiredGates: ["solver and catalog", "full E2E", "pointer/keyboard/touch", "visual/ARIA/geometry", "save migration", "Pages exact commit"] },
  { id: "a-core-world", qualityTier: "A", requiredGates: ["state/content", "targeted E2E", "responsive", "local save", "keyboard/touch", "console/network", "returning flow"] },
  { id: "b-independent-puzzle", qualityTier: "B", requiredGates: ["solvability", "deterministic content", "hint/recovery", "keyboard/touch", "route smoke", "save"] },
  { id: "c-module", qualityTier: "C", requiredGates: ["unit/content", "route mount", "primary interaction", "exit", "mobile/desktop", "keyboard focus", "console/asset/network"] },
] as const;

export const GAME_PORTFOLIO: readonly GamePortfolioRecord[] = [
  {
    id: "structure-explorer", targetWorld: "shared", productRole: "utility", definitionRole: "independent-tool", activeChildProduct: false, classicCardVisible: false, qualityTier: "A", lifecycleStatus: "active",
    canonicalRoute: "?play=structure-explorer", worldModuleIds: [], compatibilitySurfaceIds: [], sharedEngineIds: [], saveNamespaces: [],
    testProfile: "a-core-world", loadingPolicy: "route-lazy", contentStatus: "playable", canonicalDocs: ["games/structure-explorer/README.md"],
  },
  {
    id: "hanzi-stroke-lab", targetWorld: "chinese", productRole: "utility", definitionRole: "independent-tool", activeChildProduct: false, classicCardVisible: false, qualityTier: "A", lifecycleStatus: "active",
    canonicalRoute: "?play=hanzi-stroke-lab", worldModuleIds: [], compatibilitySurfaceIds: [], sharedEngineIds: [], saveNamespaces: ["family-games/hanzi-stroke-lab/v1"],
    testProfile: "a-core-world", loadingPolicy: "route-lazy", contentStatus: "playable", canonicalDocs: ["games/hanzi-stroke-lab/README.md"],
  },
  {
    id: "english-study", targetWorld: "english", productRole: "utility", definitionRole: "independent-tool", activeChildProduct: false, classicCardVisible: false, qualityTier: "A", lifecycleStatus: "active",
    canonicalRoute: "?play=english-study", worldModuleIds: [], compatibilitySurfaceIds: [], sharedEngineIds: [], saveNamespaces: ["family-games/english-study/v1"],
    testProfile: "a-core-world", loadingPolicy: "route-lazy", contentStatus: "playable", canonicalDocs: ["games/english-study/README.md"],
  },
  {
    id: "memory-card", targetWorld: "shared", productRole: "independent-puzzle", definitionRole: "active-child-product", activeChildProduct: true, classicCardVisible: true, childProductOrder: 1, qualityTier: "C", lifecycleStatus: "compatibility-only",
    mergeTarget: "shared/memory-match", worldModuleIds: [], compatibilitySurfaceIds: ["memory-definition-adapter"], sharedEngineIds: ["memory-match", "game-core-local-storage"], saveNamespaces: ["family-games/memory-card", "family-games/memory-match/v1"],
    testProfile: "c-module", loadingPolicy: "current-eager", contentStatus: "frozen", canonicalDocs: ["games/memory-card/README.md"],
  },
] as const;

export const WORLD_MODULES: readonly WorldModuleRecord[] = [];

/**
 * Nested world modules are not Classic products by default. Any future
 * exception must be explicit, source-bound, and reviewed by the checker.
 */
export const CLASSIC_CARD_EXCEPTIONS: readonly ClassicCardExceptionRecord[] = [];

export function isClassicCardExposureAllowed(
  record: GamePortfolioRecord,
  exceptions: readonly ClassicCardExceptionRecord[] = CLASSIC_CARD_EXCEPTIONS,
): boolean {
  if (!record.classicCardVisible) return true;
  if (record.definitionRole !== "world-module-mount") return record.activeChildProduct;
  const exception = exceptions.find((candidate) => candidate.definitionId === record.id);
  return Boolean(
    exception
    && exception.rationale.trim()
    && exception.evidenceRef.trim()
    && JSON.stringify([...exception.worldModuleIds].sort()) === JSON.stringify([...record.worldModuleIds].sort()),
  );
}

export const COMPATIBILITY_SURFACES: readonly CompatibilitySurfaceRecord[] = [
  { id: "classic-hub", title: "游戏百宝箱", route: "?hub=classic", purpose: "alternate-launcher" },
  { id: "memory-definition-adapter", title: "记忆配对旧定义", purpose: "definition-adapter" },
] as const;

export const SHARED_ENGINES: readonly SharedEngineRecord[] = [
  { id: "memory-match", path: "packages/activity-engines/memory-match", consumers: ["memory-card"] },
  { id: "game-core-local-storage", path: "packages/game-core", consumers: GAME_PORTFOLIO.filter(record => record.sharedEngineIds.includes("game-core-local-storage")).map((record) => record.id) },
] as const;

export const GAME_PORTFOLIO_BY_ID: ReadonlyMap<string, GamePortfolioRecord> = new Map(GAME_PORTFOLIO.map((record) => [record.id, record]));
export const ACTIVE_CHILD_PRODUCTS = GAME_PORTFOLIO
  .filter((record) => record.activeChildProduct)
  .sort((left, right) => (left.childProductOrder ?? Number.MAX_SAFE_INTEGER) - (right.childProductOrder ?? Number.MAX_SAFE_INTEGER));
export const CLASSIC_CARD_PRODUCTS = GAME_PORTFOLIO
  .filter((record) => record.classicCardVisible)
  .sort((left, right) => (left.childProductOrder ?? Number.MAX_SAFE_INTEGER) - (right.childProductOrder ?? Number.MAX_SAFE_INTEGER));

export const WORLD_LABELS: Readonly<Record<WorldId, string>> = { chinese: "中文世界", math: "数学世界", english: "英语世界", shared: "共享模块" };
export const PRODUCT_ROLE_LABELS: Readonly<Record<ProductRole, string>> = { utility: "独立工具", flagship: "旗舰", "flagship-module": "旗舰模块", "core-world": "核心世界", "independent-puzzle": "独立谜题", module: "模块" };
export const DEFINITION_ROLE_LABELS: Readonly<Record<DefinitionRole, string>> = { "independent-tool": "独立查阅工具", "active-child-product": "活跃儿童产品", "world-module-mount": "世界模块挂载", "compatibility-adapter": "兼容适配定义" };

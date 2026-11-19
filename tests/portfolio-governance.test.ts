import { existsSync, readFileSync } from "node:fs";
import {
  ACTIVE_CHILD_PRODUCTS,
  CLASSIC_CARD_PRODUCTS,
  COMPATIBILITY_SURFACES,
  GAME_PORTFOLIO,
  isClassicCardExposureAllowed,
  PORTFOLIO_TEST_PROFILES,
  SHARED_ENGINES,
  WORLD_MODULES
} from "../packages/data/gamePortfolio";
import { PLAY_SURFACE_MANIFEST, PRIMARY_PLAY_SURFACES } from "../packages/data/playSurfaceManifest";
import { classicGameCatalog } from "../packages/data/classicGameCatalog";
import { ACTIVE_PROJECT_PHASE, NEXT_PROJECT_PHASE, PROJECT_LIFECYCLE_TERMINAL_TRUTH, PROJECT_PHASES } from "../packages/data/projectLifecycle";
import { KNOWN_SAVE_KEYS, portfolioNamespacesWithoutKnownKey } from "../packages/data/saveKeyInventory";
import { affectedGateCommands } from "../tools/portfolio/affected-gates";
import { checkGeneratedDocs, validatePortfolio } from "../tools/portfolio/check-portfolio";
import { loadGameCatalogMetadata } from "../tools/portfolio/load-game-catalog-metadata";

describe("game portfolio governance", () => {
  const gameCatalog = loadGameCatalogMetadata();
  const currentClassicGameCatalog = gameCatalog.filter((game) => GAME_PORTFOLIO.find((record) => record.id === game.id)?.classicCardVisible);

  it("represents the live catalog one-to-one with valid governance identities", () => {
    expect(validatePortfolio(gameCatalog, currentClassicGameCatalog)).toEqual([]);
    expect(GAME_PORTFOLIO.map(record => record.id)).toEqual(["structure-explorer", "hanzi-stroke-lab", "english-study", "memory-card"]);
    expect(new Set(GAME_PORTFOLIO.map((record) => record.id)).size).toBe(GAME_PORTFOLIO.length);
    expect(new Set(GAME_PORTFOLIO.flatMap((record) => record.saveNamespaces)).size).toBe(
      GAME_PORTFOLIO.flatMap((record) => record.saveNamespaces).length,
    );
    expect(new Set(GAME_PORTFOLIO.map((record) => record.qualityTier))).toEqual(new Set(["A", "C"]));
    expect(ACTIVE_CHILD_PRODUCTS.map((record) => record.id)).toEqual([
      "memory-card"
    ]);
    expect(CLASSIC_CARD_PRODUCTS.map((record) => record.id)).toEqual([
      "memory-card"
    ]);
    expect(WORLD_MODULES.filter(module => module.world === "math").map(module => module.id)).toEqual([]);
    expect(COMPATIBILITY_SURFACES).toHaveLength(2);
    expect(SHARED_ENGINES).toHaveLength(2);
    expect(currentClassicGameCatalog).toHaveLength(1);
    expect(classicGameCatalog.map(game => game.id)).toEqual(CLASSIC_CARD_PRODUCTS.map(record => record.id));
    expect(GAME_PORTFOLIO.filter((record) => !record.classicCardVisible).map((record) => record.id).sort()).toEqual([
      "english-study",
      "hanzi-stroke-lab",
      "structure-explorer",
    ]);
  });

  it("binds every game to a same-tier test profile and existing canonical docs", () => {
    const profiles = new Map(PORTFOLIO_TEST_PROFILES.map((profile) => [profile.id, profile]));
    for (const record of GAME_PORTFOLIO) {
      expect(profiles.get(record.testProfile)?.qualityTier).toBe(record.qualityTier);
      expect(record.canonicalDocs.every((path) => existsSync(path))).toBe(true);
    }
  });

  it("rejects a nested world module Classic card unless its exception is explicit and identity-bound", () => {
    const equation = { ...GAME_PORTFOLIO[0], id: "equation-slider", definitionRole: "world-module-mount" as const, worldModuleIds: ["math-equation-slider"] };
    const exposed = { ...equation, classicCardVisible: true };
    expect(isClassicCardExposureAllowed(exposed, [])).toBe(false);
    expect(isClassicCardExposureAllowed(exposed, [{
      definitionId: "equation-slider",
      worldModuleIds: ["math-equation-slider"],
      rationale: "Bounded exception example",
      evidenceRef: "docs/gameplay-coherence/README.md",
    }])).toBe(true);
  });

  it("keeps generated portfolio documents byte-deterministic and drift-free", () => {
    expect(checkGeneratedDocs()).toEqual([]);
    const status = readFileSync("docs/project-status/portfolio-status.md", "utf8");
    expect(status).toContain(`Mount definitions：\`${GAME_PORTFOLIO.length}\``);
    expect(status).toContain("Active child products：`1`");
    expect(status).toContain("NO_BY_USER_DIRECTION_AND_NOT_A_DEVELOPMENT_GATE");
  });

  it("binds the terminal lifecycle, first-use surfaces, and exact save inventory", () => {
    expect(PROJECT_PHASES.filter((phase) => phase.status === "complete")).toHaveLength(5);
    expect(PROJECT_PHASES.find((phase) => phase.id === ACTIVE_PROJECT_PHASE)?.status).toBe("active");
    expect(NEXT_PROJECT_PHASE).toBeNull();
    expect(PROJECT_LIFECYCLE_TERMINAL_TRUTH.familyStableBaselineTag).toBe("game-codex-family-stable-v1.0.0");
    expect(PROJECT_LIFECYCLE_TERMINAL_TRUTH.automaticLargeTask).toBe("NONE");
    expect(new Set(PLAY_SURFACE_MANIFEST.map((surface) => surface.id)).size).toBe(PLAY_SURFACE_MANIFEST.length);
    expect(PRIMARY_PLAY_SURFACES.map((surface) => surface.id)).toEqual([
      "memory-independent", "my-game-world", "classic-hub",
    ]);
    expect(new Set(KNOWN_SAVE_KEYS.map((record) => record.key)).size).toBe(KNOWN_SAVE_KEYS.length);
    expect(portfolioNamespacesWithoutKnownKey()).toEqual([]);
  });

  it("maps shared and unknown changes to fail-safe gates", () => {
    const docs = affectedGateCommands(["docs/project-status/portfolio-status.md"]);
    expect(docs.map((command) => command.label)).toEqual([
      "portfolio consistency",
      "Portfolio Evolution evidence and generated audit",
    ]);

    const shared = affectedGateCommands(["packages/game-core/index.ts"]);
    expect(shared.map((command) => command.label)).toEqual([
      "portfolio consistency",
      "Portfolio Evolution evidence and generated audit",
      "UI occlusion inventory and interaction-integrity contracts",
      "play-surface scroll ownership contracts",
      "unit and content tests",
      "Bead generator tests",
      "Independent memory-match content and save contracts",
      "typecheck",
      "production build",
      "English Study Chromium/WebKit device matrix",
      "Hanzi Study Chromium/WebKit device matrix",
      "Structure Explorer input and lifecycle device matrix",
      "Memory protected bytes and public Vault recovery",
      "representative play-surface browser hit-test matrix",
      "representative scroll and bottom reachability matrix",
      "all-game portfolio smoke",
    ]);

    expect(affectedGateCommands(["<unknown>"]).at(-1)?.label).toBe("all-game portfolio smoke");
  });

  it("keeps retained Classic return routes aligned with runtime context", () => {
    expect(PLAY_SURFACE_MANIFEST.find((surface) => surface.id === "memory-independent")?.returnRoute).toBe("?hub=classic&from=world");
  });
});

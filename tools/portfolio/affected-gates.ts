import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

export interface GateCommand { readonly program: string; readonly args: readonly string[]; readonly label: string }

const PORTFOLIO_CHECK: GateCommand = { program: "pnpm", args: ["run", "portfolio:check"], label: "portfolio consistency" };
const PORTFOLIO_EVOLUTION_CHECK: GateCommand = { program: "pnpm", args: ["run", "portfolio:evolution:check"], label: "Portfolio Evolution evidence and generated audit" };
const UNIT: GateCommand = { program: "pnpm", args: ["test"], label: "unit and content tests" };
const TYPECHECK: GateCommand = { program: "pnpm", args: ["run", "typecheck"], label: "typecheck" };
const BUILD: GateCommand = { program: "pnpm", args: ["build"], label: "production build" };
const SMOKE: GateCommand = { program: "pnpm", args: ["run", "test:portfolio:smoke"], label: "all-game portfolio smoke" };
const INTERACTION_STATIC: GateCommand = { program: "pnpm", args: ["run", "validate:interaction-integrity"], label: "UI occlusion inventory and interaction-integrity contracts" };
const INTERACTION_HITTEST: GateCommand = { program: "pnpm", args: ["run", "test:e2e:hittest:representative"], label: "representative play-surface browser hit-test matrix" };
const SCROLL_STATIC: GateCommand = { program: "pnpm", args: ["run", "validate:scroll-integrity"], label: "play-surface scroll ownership contracts" };
const SCROLL_REACHABILITY: GateCommand = { program: "pnpm", args: ["run", "test:e2e:scroll-reachability:representative"], label: "representative scroll and bottom reachability matrix" };

const BEAD: GateCommand = { program: "pnpm", args: ["--filter", "mard-bead-generator", "test"], label: "Bead generator tests" };
const MEMORY: GateCommand = { program: "pnpm", args: ["run", "test:memory-match"], label: "Independent memory-match content and save contracts" };
const ENGLISH_E2E: GateCommand = { program: 'pnpm', args: ['run', 'test:e2e:english-study'], label: 'English Study Chromium/WebKit device matrix' };
const HANZI_STUDY_E2E: GateCommand = { program: 'pnpm', args: ['run', 'test:e2e:hanzi-stroke-lab'], label: 'Hanzi Study Chromium/WebKit device matrix' };
const STRUCTURE_E2E: GateCommand = { program: 'pnpm', args: ['run', 'test:e2e:structure-explorer'], label: 'Structure Explorer input and lifecycle device matrix' };
const MEMORY_E2E: GateCommand = { program: 'pnpm', args: ['run', 'test:e2e:storage'], label: 'Memory protected bytes and public Vault recovery' };
function gameSmoke(id: string): GateCommand {
  return { program: "pnpm", args: ["run", "test:portfolio:smoke", "--", "--grep", `@game:${id}`], label: `${id} entry/interaction/return smoke` };
}

function unique(commands: readonly GateCommand[]): GateCommand[] {
  const seen = new Set<string>();
  return commands.filter((command) => { const key = `${command.program}\0${command.args.join("\0")}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

export function affectedGateCommands(changedFiles: readonly string[]): GateCommand[] {
  const files = changedFiles.map((file) => file.replaceAll("\\", "/").replace(/^\.\//, ""));
  if (!files.length) return [PORTFOLIO_CHECK];
  const full = files.some((file) => /^(src\/main\.ts|src\/app-route\.ts|package\.json|pnpm-lock\.yaml|tsconfig(?:\.[\w-]+)?\.json|vite\.config\.ts|vitest\.config\.ts|playwright.*\.config\.ts)$/.test(file)
    || file.startsWith("packages/game-core/") || file.startsWith("packages/preferences/") || file.startsWith("apps/my-game-world/") || file === "<unknown>");
  if (full) return unique([PORTFOLIO_CHECK, PORTFOLIO_EVOLUTION_CHECK, INTERACTION_STATIC, SCROLL_STATIC, UNIT, BEAD, MEMORY, TYPECHECK, BUILD, ENGLISH_E2E, HANZI_STUDY_E2E, STRUCTURE_E2E, MEMORY_E2E, INTERACTION_HITTEST, SCROLL_REACHABILITY, SMOKE]);
  const commands: GateCommand[] = [PORTFOLIO_CHECK, PORTFOLIO_EVOLUTION_CHECK];
  for (const file of files) {
    const game = /^games\/([^/]+)\//.exec(file)?.[1];
    if (file.startsWith("apps/bead-generator/")) commands.push(BEAD, BUILD, SMOKE);
    if (/^(?:apps|games|packages|src)\/.+\.css$/.test(file)) commands.push(INTERACTION_STATIC, SCROLL_STATIC, INTERACTION_HITTEST, SCROLL_REACHABILITY);
    if (file.startsWith("packages/activity-engines/memory-match/")) commands.push(MEMORY, MEMORY_E2E, SMOKE);
    else if (game === "memory-card") commands.push(MEMORY, MEMORY_E2E);
    else if (game === 'english-study') commands.push(UNIT, ENGLISH_E2E);
    else if (game === 'hanzi-stroke-lab') commands.push(UNIT, HANZI_STUDY_E2E);
    else if (game === 'structure-explorer' || file.startsWith('public/structure-explorer/')) commands.push(UNIT, STRUCTURE_E2E);
    else if (game && !["equation-slider", "make-target", "math-lab", "hanzi-tower-defense", "hanzi-word-adventure"].includes(game)) commands.push(UNIT, gameSmoke(game));
    else if (file.startsWith("apps/hub/") || file.startsWith("packages/ui/") || file.startsWith("packages/data/") || file.startsWith("public/assets/")) commands.push(INTERACTION_STATIC, SCROLL_STATIC, UNIT, INTERACTION_HITTEST, SCROLL_REACHABILITY, SMOKE);
    else if (!file.startsWith("docs/") && file !== "README.md" && file !== "AGENTS.md") commands.push(UNIT, TYPECHECK, BUILD, SMOKE);
  }
  return unique(commands);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function discoverChangedFiles(): string[] {
  const explicit = option("--changed-files");
  if (explicit) return explicit.split(",").map((file) => file.trim()).filter(Boolean);
  const base = option("--base") ?? "origin/main";
  const head = option("--head") ?? "HEAD";
  try {
    const committed = execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
    if (head !== "HEAD") return committed;
    const working = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
    return [...new Set([...committed, ...working, ...untracked])];
  } catch {
    return ["<unknown>"];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const changedFiles = discoverChangedFiles();
  const commands = affectedGateCommands(changedFiles);
  process.stdout.write(`${JSON.stringify({ changedFiles, commands }, null, 2)}\n`);
  if (process.argv.includes("--run")) {
    for (const command of commands) {
      const result = spawnSync(command.program, command.args, { cwd: resolve(import.meta.dirname, "../.."), shell: process.platform === "win32", stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  }
}

import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

interface RuntimeObservation {
  readonly pageErrors: string[];
  readonly consoleErrors: string[];
  readonly failedResponses: string[];
  readonly failedRequests: string[];
  readonly externalRequests: string[];
}

interface SmokeGame {
  readonly id: string;
  readonly title: string;
  readonly surface: string;
  readonly canonicalRoute?: string;
  interact(page: Page): Promise<Locator | null>;
}

function observeRuntime(page: Page): RuntimeObservation {
  const result: RuntimeObservation = { pageErrors: [], consoleErrors: [], failedResponses: [], failedRequests: [], externalRequests: [] };
  page.on("pageerror", (error) => result.pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) result.failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "failed";
    // Route changes intentionally cancel Vite module requests that are no longer
    // needed. They are not runtime/network failures of the destination screen.
    if (errorText !== "net::ERR_ABORTED") result.failedRequests.push(`${request.url()} ${errorText}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== "http://127.0.0.1:5291") result.externalRequests.push(request.url());
  });
  return result;
}

async function expectRuntimeClean(runtime: RuntimeObservation): Promise<void> {
  expect(runtime.pageErrors, "page errors").toEqual([]);
  expect(runtime.consoleErrors, "console errors").toEqual([]);
  expect(runtime.failedResponses, "HTTP responses >= 400").toEqual([]);
  expect(runtime.failedRequests, "failed runtime requests").toEqual([]);
  expect(runtime.externalRequests, "unexpected external requests").toEqual([]);
}

async function expectNoFatalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll - dimensions.client).toBeLessThanOrEqual(1);
}

async function expectUsableTarget(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, "primary interaction has a layout box").not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(24);
  expect(box!.height).toBeGreaterThanOrEqual(24);
}

const GAMES: readonly SmokeGame[] = [
  {
    id: "structure-explorer", title: "结构探索馆", surface: ".structure-explorer",
    canonicalRoute: "/?play=structure-explorer",
    async interact(page) {
      await page.locator('[data-structure-pencil]').click();
      const demo = page.frameLocator('[data-pencil-frame]');
      await expect(demo.locator('canvas#pencil-3d')).toBeVisible();
      await demo.locator('#boom').click();
      await expect(demo.locator('#three-host')).toHaveAttribute('data-exploded', 'true');
      await expect(demo.locator('#readout')).toContainText('五个观察对象');
      await page.locator('[data-structure-directory]').click();
      await expect(page.locator('[data-structure-pencil]')).toBeVisible();
      await page.locator('[data-structure-home]').click();
      await expect(page.locator('[data-world-structure-link]')).toBeFocused();
      return null;
    },
  },
  {
    id: "memory-card", title: "记忆配对", surface: ".memory-match",
    async interact(page) {
      const card = page.locator("[data-card-id]:not(:disabled)").first();
      await expectUsableTarget(card);
      await card.press("Enter");
      await page.getByRole("link", { name: /回到游戏百宝箱/ }).click();
      await expect(page.locator('[data-game-id="memory-card"] button')).toBeFocused();
      return null;
    },
  },
];

for (const game of GAMES) {
  test(`@game:${game.id} enters, completes one primary interaction, and returns`, async ({ page }) => {
    const runtime = observeRuntime(page);
    await page.goto(game.canonicalRoute ?? "/?hub=classic&from=world");
    if (!game.canonicalRoute) await page.locator(`[data-game-id="${game.id}"] button`).press("Enter");
    await expect(page.locator(game.surface)).toBeVisible();
    await game.interact(page);
    await expectNoFatalOverflow(page);
    await expectRuntimeClean(runtime);
  });
}

test("@portfolio opens the bead generator, generates and exports locally, then restores toolbox focus", async ({ page }, testInfo) => {
  const runtime = observeRuntime(page);
  await page.goto("/");
  await expect(page).toHaveTitle("工具箱");
  await expect(page.getByRole("heading", { name: "工具箱" })).toBeVisible();
  const entry = page.getByRole("link", { name: /MARD 拼豆图纸生成器/ });
  if (testInfo.project.name === "mobile-390") await entry.tap();
  else await entry.press("Enter");
  await expect(page).toHaveTitle("MARD 拼豆图纸生成器");
  await page.getByLabel("上传 JPG、PNG 或 WebP 图片").setInputFiles("apps/bead-generator/tests/fixtures/transparent-shapes.png");
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 30000 });
  for (const id of ["download-preview", "download-chart", "download-csv", "download-pdf"]) {
    const download = page.waitForEvent("download");
    await page.getByTestId(id).click();
    expect(await (await download).failure()).toBeNull();
  }
  await expectNoFatalOverflow(page);
  await page.getByRole("link", { name: /返回工具箱/ }).click();
  await expect(entry).toBeFocused();
  await expectRuntimeClean(runtime);
});

test("@portfolio public route registry preserves current routes and falls back for removed games", async ({ page }) => {
  const runtime = observeRuntime(page);
  const routes = [
    ["/", '[data-testid="my-game-world"]'],
    ["/?world=my-game-world", '[data-testid="my-game-world"]'],
    ["/?hub=classic", ".hub-grid"],
    ["/?play=oddity-puzzles", '[data-testid="my-game-world"]'],
    ["/?play=world-in-a-box&scene=window-breeze", '[data-testid="my-game-world"]'],
    ["/?play=world-in-a-box&scene=dresden-river-campus", '[data-testid="my-game-world"]'],
    ["/?play=world-in-a-box&scene=frozen-elsa-playground&from=hub", '[data-testid="my-game-world"]'],
    ["/?world=english-world", '[data-testid="my-game-world"]'],
    ["/?play=english-spell-battle-legacy&from=hub", '[data-testid="my-game-world"]'],
    ["/?play=hanzi-tower-defense", '[data-testid=\"my-game-world\"]'],
    ["/?play=hanzi-word-adventure", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world&station=lab", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world&station=clock", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world&station=array", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world&station=target", '[data-testid=\"my-game-world\"]'],
    ["/?world=math-world&station=slider", '[data-testid=\"my-game-world\"]'],
    ["/?play=hanzi-magic-complete&from=hub", '[data-testid="my-game-world"]'],
    ["/?play=hanzi-magic-complete&view=pinyin", '[data-testid="my-game-world"]'],
    ["/?play=hanzi-magic-complete&view=memory", '[data-testid="my-game-world"]'],
    ["/?play=pinyin-magic-battle", '[data-testid="my-game-world"]'],
    ["/?play=hanzi-v2-chapter-one&from=hub", '[data-testid="my-game-world"]'],
    ["/?play=hanzi-v2-v1&from=hub", '[data-testid="my-game-world"]'],
  ] as const;
  for (const [route, selector] of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(selector)).toBeVisible({ timeout: 30_000 });
    await expectNoFatalOverflow(page);
  }
  await expectRuntimeClean(runtime);
});

test("@portfolio bare public URL has the same document-scroll geometry as the explicit world route", async ({ page }, testInfo) => {
  const runtime = observeRuntime(page);
  if (testInfo.project.name === "desktop-1440") await page.setViewportSize({ width: 2560, height: 1440 });

  const readWorldGeometry = async () => page.evaluate(() => {
    const app = document.querySelector<HTMLElement>("#app");
    const world = document.querySelector<HTMLElement>("[data-testid=my-game-world]");
    if (!app || !world) throw new Error("My Game World geometry is unavailable");
    return {
      pageMode: [...document.body.classList].find((name) => name.endsWith("-page") && name.startsWith("game-")) ?? "none",
      viewportHeight: window.innerHeight,
      appHeight: app.getBoundingClientRect().height,
      worldHeight: world.getBoundingClientRect().height,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      overflowY: getComputedStyle(document.body).overflowY,
    };
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("my-game-world")).toBeVisible();
  const firstLoad = await readWorldGeometry();

  await page.goto("/?world=my-game-world", { waitUntil: "networkidle" });
  await expect(page.getByTestId("my-game-world")).toBeVisible();
  const explicitRoute = await readWorldGeometry();

  expect(firstLoad.pageMode).toBe("game-scrollable-page");
  expect(firstLoad.overflowY).toBe("auto");
  expect(firstLoad.worldHeight).toBeGreaterThanOrEqual(firstLoad.viewportHeight);
  expect(firstLoad.documentScrollWidth).toBe(firstLoad.viewportWidth);
  expect(firstLoad.documentScrollHeight).toBe(explicitRoute.documentScrollHeight);
  expect(firstLoad.appHeight).toBeCloseTo(explicitRoute.appHeight, 0);
  expect(firstLoad.worldHeight).toBeCloseTo(explicitRoute.worldHeight, 0);
  await expectRuntimeClean(runtime);
});

async function holdRequest(page: Page, matcher: Parameters<Page["route"]>[0]) {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started!: (url: string) => void;
  const requested = new Promise<string>(resolve => { started = resolve; });
  const handle = async (route: Route) => {
    started(route.request().url());
    await gate;
    await route.continue().catch(() => { /* Leaving can cancel the held browser request. */ });
  };
  await page.route(matcher, handle);
  return { requested, release, unroute: () => page.unroute(matcher, handle) };
}

test("@recovery a pending home entry can be refreshed", async ({ page }) => {
  const shell = await page.request.get("/");
  const entry = (await shell.text()).match(/<script type="module"[^>]+src="([^"]+)"/)?.[1];
  expect(entry).toBeTruthy();
  const bootstrap = new URL(entry!, shell.url()).pathname;
  let holdHome = true;
  const held = await holdRequest(page, url => holdHome && (url.pathname === "/apps/my-game-world/index.ts"
    || (url.pathname !== bootstrap && /^\/assets\/index-.*\.js$/.test(url.pathname))));
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await held.requested;
    const refresh = page.getByRole("button", { name: "刷新" });
    await expect(refresh).toBeVisible();
    // Keep the original request held while allowing the new document's request.
    holdHome = false;
    await Promise.all([page.waitForEvent("framenavigated"), refresh.click()]);
    await expect(page.getByTestId("my-game-world")).toBeVisible();
  } finally {
    held.release();
    await held.unroute();
  }
});

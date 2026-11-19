import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const KEY = "family-games/my-game-world/v1";
const entrySelector = (id: string) => `[data-world-${id}-link]`;
const raw = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);

export function homeDiscoveryTests(): void {
  test("@play-ready @home-discovery unified entries preserve history, explicit return and focus", async ({ page }, info) => {
    const activate = async (selector: string) => info.project.use.hasTouch ? page.locator(selector).tap() : page.locator(selector).click();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page).toHaveTitle("工具箱");
    await expect(page.locator(".world-hanzi-tool a")).toHaveCount(4);
    await expect(page.locator(".world-more a")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);

    for (const [id, surface] of [["stroke", "[data-search]"], ["english", "[data-es-search]"], ["treasure", "[data-testid=classic-hub-from-world]"], ["bead", "[data-testid=generate-button]"]]) {
      const entry = page.locator(entrySelector(id));
      await entry.scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => scrollY);
      const box = await entry.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48);
      const hit = await entry.evaluate(element => {
        const r = element.getBoundingClientRect();
        return [[.2,.2],[.8,.2],[.5,.5],[.2,.8],[.8,.8]].every(([x,y]) => element.contains(document.elementFromPoint(r.left+r.width*x,r.top+r.height*y)));
      });
      expect(hit).toBe(true);
      await activate(entrySelector(id));
      await expect(page.locator(surface)).toBeVisible();
      await page.reload(); await expect(page.locator(surface)).toBeVisible();
      await page.goBack(); await expect(page.locator(entrySelector(id))).toBeFocused();
      await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
      await page.goForward(); await expect(page.locator(surface)).toBeVisible();
      await activate(id === "bead" ? ".toolbox-return" : 'a[href="?world=my-game-world"]');
      await expect(page.locator(entrySelector(id))).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test("@play-ready @home-discovery keyboard, settings focus and reduced motion", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-world-settings-open]').focus();
    await page.keyboard.press("Tab"); await expect(page.locator(entrySelector("stroke"))).toBeFocused();
    await page.keyboard.press("Tab"); await expect(page.locator(entrySelector("english"))).toBeFocused();
    await page.keyboard.press("Enter"); await expect(page.locator("[data-es-search]")).toBeVisible();
    await page.goBack(); await expect(page.locator(entrySelector("english"))).toBeFocused();
    await page.locator('[data-world-settings-open]').click();
    await page.locator('[data-world-reduced-motion]').check();
    await expect(page.locator('.my-game-world-mount')).toHaveAttribute("data-reduced-motion", "true");
    await page.keyboard.press("Escape"); await expect(page.locator('[data-world-settings-open]')).toBeFocused();
    expect(JSON.parse((await raw(page))!).settings.reducedMotion).toBe(true);
  });

  for (const original of ['{"version":99,"future":[7]}', '{broken', '{"version":1,"settings":{"muted":false,"reducedMotion":false,"extra":"kept"},"extension":{"kept":7}}']) {
    test(`@play-ready @home-discovery protects home settings: ${original.slice(0,24)}`, async ({ page }) => {
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: original });
      await page.goto("/"); await page.locator('[data-world-settings-open]').click();
      await page.locator('[data-world-muted]').click();
      if (original.includes('"version":1,')) {
        expect(JSON.parse((await raw(page))!)).toEqual({ version:1, settings:{muted:true,reducedMotion:false,extra:"kept"},extension:{kept:7} });
      } else {
        expect(await raw(page)).toBe(original);
        await expect(page.locator('[data-world-settings-status]')).toContainText("为保护本机记录");
      }
      await page.keyboard.press("Escape"); await page.locator(entrySelector("stroke")).click();
      await expect(page.locator("[data-search]")).toBeVisible();
    });
  }

  for (const deny of ["read", "write", "access"] as const) test(`@play-ready @home-discovery storage ${deny} denied stays navigable`, async ({ page }) => {
    await page.addInitScript(({ key, denied }) => {
      if (denied === "access") { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Synthetic denied", "SecurityError"); } }); return; }
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function(k) { if (k === key && denied === "read") throw new DOMException("Synthetic denied", "SecurityError"); return get.call(this,k); };
      Storage.prototype.setItem = function(k,v) { if (k === key && denied === "write") throw new DOMException("Synthetic denied", "QuotaExceededError"); set.call(this,k,v); };
    }, { key: KEY, denied: deny });
    await page.goto("/"); await page.locator('[data-world-settings-open]').click();
    await page.locator('[data-world-muted]').click();
    await expect(page.locator('[data-world-muted]')).not.toBeChecked();
    await expect(page.locator('[data-world-settings-status]')).toContainText("这次没有保存设置");
    await page.keyboard.press("Escape"); await page.locator(entrySelector("treasure")).click();
    await expect(page.locator('.game-card')).toHaveCount(1);
  });

  test("@play-ready @home-discovery cross-page and same-page Vault replacement stop stale writes", async ({ page, context }) => {
    const first = '{"version":1,"settings":{"muted":false,"reducedMotion":false},"extension":"first"}';
    const restored = '{"version":1,"settings":{"muted":false,"reducedMotion":false},"extension":"restored"}';
    await page.goto("/");
    await page.evaluate(({key,value}) => localStorage.setItem(key,value), {key:KEY,value:first});
    await page.reload();
    await expect(page.getByTestId("my-game-world")).toBeVisible();
    const other = await context.newPage(); await other.goto("/");
    await expect(other.getByTestId("my-game-world")).toBeVisible();
    await other.evaluate(({key,value}) => localStorage.setItem(key,value), {key:KEY,value:restored});
    await page.locator('[data-world-settings-open]').click(); await page.locator('[data-world-muted]').click();
    await expect(page.locator('[data-world-muted]')).not.toBeChecked(); expect(await raw(page)).toBe(restored);
    await other.close();

    await page.reload(); await page.locator('[data-world-settings-open]').click();
    await page.getByRole("button", {name:"打开游戏进度保险箱"}).click();
    const downloading = page.waitForEvent("download"); await page.getByRole("button", {name:"备份游戏进度"}).click();
    const exported = readFileSync((await (await downloading).path())!, "utf8");
    await page.evaluate(({key,value}) => localStorage.setItem(key,value), {key:KEY,value:first});
    // Reload the home mount on the first generation, then restore the exported one.
    await page.reload(); await page.locator('[data-world-settings-open]').click();
    await page.getByRole("button", {name:"打开游戏进度保险箱"}).click();
    await page.locator('[data-vault-file]').setInputFiles({name:"synthetic-home.json",mimeType:"application/json",buffer:Buffer.from(exported)});
    await expect(page.locator('[data-vault-preview-checksum]')).toHaveText("PASS");
    page.once("dialog", dialog => void dialog.accept()); await page.locator('[data-vault-restore]').click();
    await expect(page.locator('[data-vault-status]')).toContainText("已恢复");
    expect(await raw(page)).toBe(restored);
    await page.locator('[data-world-muted]').click(); await expect(page.locator('[data-world-muted]')).not.toBeChecked();
    expect(await raw(page)).toBe(restored);
  });
}

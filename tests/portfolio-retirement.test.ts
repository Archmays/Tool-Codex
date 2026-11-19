import { normalizeRemovedToolboxRoute, resolveAppRoute } from "../src/app-route";

describe("removed toolbox routes", () => {
  it.each(["?play=hanzi-tower-defense", "?game=hanzi-word-adventure", "?world=math-world", "?world=math-world&station=slider", "?playtest=step4"])("returns %s to the toolbox under a nested site path", (query) => {
    const url = new URL(`https://example.com/project/${query}#old`);
    expect(normalizeRemovedToolboxRoute(url)).toBe(true);
    expect(url.pathname + url.search + url.hash).toBe("/project/?world=my-game-world&notice=retired-game");
    expect(resolveAppRoute(url.searchParams).kind).toBe("world");
  });

  it("leaves current routes intact", () => {
    const url = new URL("https://example.com/project/?play=hanzi-stroke-lab");
    expect(normalizeRemovedToolboxRoute(url)).toBe(false);
    expect(resolveAppRoute(url.searchParams).kind).toBe("play");
  });
});

import type { GameDefinition, MountedGame } from "../../packages/game-core";
import { createLocalStorageStore } from "../../packages/game-core";
import { classicGameCatalog } from "../../packages/data/classicGameCatalog";
import { clearElement, createButton, createPanel } from "../../packages/ui";
import { rovingGroup } from '../../packages/ui/input';
import { ALL_SUBJECTS_FILTER, getSubjectFilters } from "./filters";

export function mountHub(root: HTMLElement): MountedGame {
  let mountedGame: MountedGame | null = null;
  let selectedSubject = ALL_SUBJECTS_FILTER;
  const filtersNavigation = rovingGroup(root, { items: '[data-subject-filter]' });

  const renderHub = (): void => {
    mountedGame?.destroy();
    mountedGame = null;
    root.className = "app-shell";
    clearElement(root);

    const header = document.createElement("header");
    header.className = "hub-header";

    const titleGroup = document.createElement("div");
    const title = document.createElement("h1");
    title.textContent = "游戏百宝箱";
    const subtitle = document.createElement("p");
    subtitle.textContent = "选一款游戏开始玩。";
    titleGroup.append(title, subtitle);
    header.append(titleGroup);

    const filters = document.createElement("nav");
    filters.className = "hub-filters";
    filters.setAttribute("aria-label", "按学科筛选游戏");
    for (const subject of getSubjectFilters(classicGameCatalog)) {
      const isActive = subject === selectedSubject;
      const button = createButton(subject, () => {
        selectedSubject = subject;
        renderHub();
        [...root.querySelectorAll<HTMLButtonElement>('[data-subject-filter]')].find(control => control.dataset.subjectFilter === subject)?.focus();
      }, {
        className: isActive ? "ui-button learning-game__pill is-active" : "ui-button learning-game__pill"
      });
      button.setAttribute("aria-pressed", String(isActive));
      button.dataset.subjectFilter = subject;
      filters.append(button);
    }

    const grid = document.createElement("main");
    grid.className = "hub-grid";

    const visibleGames = selectedSubject === ALL_SUBJECTS_FILTER
      ? classicGameCatalog
      : classicGameCatalog.filter((game) => game.subject === selectedSubject);

    for (const game of visibleGames) {
      grid.append(createGameCard(game, () => openGame(game)));
    }

    root.append(header, filters, grid);
    filtersNavigation.refresh();
  };

  const openGame = (game: GameDefinition): void => {
    if (game.route) {
      window.location.assign(game.route);
      return;
    }
    mountedGame?.destroy();
    mountedGame = null;
    root.className = "game-runner";
    clearElement(root);

    const topbar = document.createElement("div");
    topbar.className = "game-topbar";
    const backButton = createButton("返回大厅", renderHub, {
      className: "ui-button ui-button--secondary"
    });
    const title = document.createElement("h1");
    title.textContent = game.title;
    topbar.append(backButton, title);

    const stage = document.createElement("main");
    stage.className = "game-stage";
    root.append(topbar, stage);

    mountedGame = game.mount({
      container: stage,
      onExit: renderHub,
      storage: createLocalStorageStore(game.id)
    });
  };

  renderHub();
  if (document.referrer) {
    const referrer = new URL(document.referrer);
    if (referrer.origin === location.origin && referrer.pathname === location.pathname && referrer.searchParams.get("from") === "hub") {
      const id = referrer.searchParams.get("play");
      const card = classicGameCatalog.find(game => game.id === id);
      if (card) root.querySelector<HTMLElement>(`[data-game-id="${card.id}"] :is(a, button)`)?.focus();
    }
  }

  return {
    destroy(): void {
      mountedGame?.destroy();
      mountedGame = null;
      filtersNavigation.destroy();
      clearElement(root);
    }
  };
}

function createGameCard(game: GameDefinition, onPlay: () => void): HTMLElement {
  const card = createPanel("game-card");
  card.dataset.gameId = game.id;

  const title = document.createElement("h2");
  title.textContent = game.title;

  const description = document.createElement("p");
  description.textContent = game.description;

  const button = createButton(game.playLabel ?? "开始游戏", onPlay, {
    className: "ui-button game-card__button"
  });

  card.append(title, description, button);
  return card;
}

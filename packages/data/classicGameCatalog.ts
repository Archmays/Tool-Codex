import type { GameDefinition } from "../game-core";
import { hanziTowerDefenseGame } from "../../games/hanzi-tower-defense/definition";
import { hanziWordAdventureGame } from "../../games/hanzi-word-adventure/definition";
import { mathLabGame } from "../../games/math-lab";
import { GAME_PORTFOLIO_BY_ID } from "./gamePortfolio";

// Only import the routed definitions used by this screen. The complete catalogue
// also imports standalone modules with eager runtimes and styles.
export const classicGameCatalog: GameDefinition[] = [
  hanziTowerDefenseGame, hanziWordAdventureGame, mathLabGame,
].sort((left, right) =>
  (GAME_PORTFOLIO_BY_ID.get(left.id)?.childProductOrder ?? Number.MAX_SAFE_INTEGER)
  - (GAME_PORTFOLIO_BY_ID.get(right.id)?.childProductOrder ?? Number.MAX_SAFE_INTEGER));

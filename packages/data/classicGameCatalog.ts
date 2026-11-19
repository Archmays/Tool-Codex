import type { GameDefinition } from "../game-core";
import { memoryCardGame } from "../../games/memory-card";

export const classicGameCatalog: GameDefinition[] = [
  { ...memoryCardGame, route: "?play=memory-card&from=hub" },
];

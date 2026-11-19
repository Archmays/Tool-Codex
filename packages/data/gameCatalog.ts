import { hanziStrokeLab } from "../../games/hanzi-stroke-lab";
import { englishStudy } from "../../games/english-study";
import { structureExplorer } from "../../games/structure-explorer";
import type { GameDefinition } from "../game-core";
import { memoryCardGame } from "../../games/memory-card";

export const allGameDefinitions: GameDefinition[] = [
  hanziStrokeLab,
  englishStudy,
  structureExplorer,
  memoryCardGame,
];

/** Compatibility aliases for existing consumers; use the explicit names above in new code. */
export const gameCatalog = allGameDefinitions;
export { classicGameCatalog, classicGameCatalog as currentClassicGameCatalog } from "./classicGameCatalog";

import type { GameDefinition, GameMeta } from './sdk.js';
import { oxono } from './games/oxono/index.js';
import { collect } from './games/collect/index.js';

/** All games available on the platform, keyed by their meta id. */
export const games: Record<string, GameDefinition<any, any, any>> = {
  [oxono.meta.id]: oxono,
  [collect.meta.id]: collect,
};

export function getGame(id: string): GameDefinition<any, any, any> | undefined {
  return games[id];
}

export function listGameMeta(): GameMeta[] {
  return Object.values(games).map((game) => game.meta);
}

export function hasGame(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(games, id);
}

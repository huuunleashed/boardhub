/**
 * BoardHub engine public surface. Pure, isomorphic, dependency light. Safe to
 * import from both the server (authoritative host) and the web client (rendering,
 * local hotseat, optimistic hints).
 */

export * from './sdk.js';
export * from './rng.js';
export * from './registry.js';

// Oxono
export * from './games/oxono/index.js';
export type { OxSymbol, OxColor, OxToken, OxonoMove } from './games/oxono/state.js';
export { neighbors } from './games/oxono/logic.js';

// Collect
export * from './games/collect/index.js';
export type {
  CollectCard,
  LockedSet,
  Species,
  SpeciesInfo,
  CollectPlayerView,
} from './games/collect/state.js';
export { setMultiplier, speciesBase, countSpecies } from './games/collect/state.js';

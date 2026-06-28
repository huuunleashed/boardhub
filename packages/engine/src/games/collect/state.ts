/** Collect domain types, card data, and scoring helpers. */

export type Species =
  | 'rabbit'
  | 'otter'
  | 'fox'
  | 'owl'
  | 'deer'
  | 'hedgehog'
  | 'wolf'
  | 'bear';

export interface SpeciesInfo {
  id: Species;
  name: string;
  base: number;
  count: number;
}

/** Eight animal species. Common animals are plentiful but cheap, rare ones the opposite. */
export const SPECIES: SpeciesInfo[] = [
  { id: 'rabbit', name: 'Thỏ', base: 1, count: 9 },
  { id: 'otter', name: 'Rái cá', base: 1, count: 8 },
  { id: 'fox', name: 'Cáo', base: 2, count: 7 },
  { id: 'owl', name: 'Cú', base: 2, count: 7 },
  { id: 'deer', name: 'Hươu', base: 2, count: 6 },
  { id: 'hedgehog', name: 'Nhím', base: 3, count: 6 },
  { id: 'wolf', name: 'Sói', base: 3, count: 5 },
  { id: 'bear', name: 'Gấu', base: 4, count: 4 },
];

export const SPECIES_BY_ID: Record<Species, SpeciesInfo> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<Species, SpeciesInfo>;

export const MEADOW_SIZE = 4;
export const START_HAND = 4;
export const HAND_LIMIT = 12;

export interface CollectCard {
  id: string;
  species: Species;
}

export interface LockedSet {
  species: Species;
  size: number;
  points: number;
  cardIds: string[];
}

export interface CollectPlayerState {
  hand: CollectCard[];
  locked: LockedSet[];
}

export interface CollectState {
  numPlayers: number;
  deck: CollectCard[];
  meadow: (CollectCard | null)[];
  players: CollectPlayerState[];
  toMove: number;
  /** Number of remaining final turns once the table runs dry, or null beforehand. */
  finalTurnsRemaining: number | null;
  over: boolean;
}

export type CollectAction =
  | { type: 'draw' }
  | { type: 'take'; meadowIndex: number }
  | { type: 'lock'; species: Species; count?: number }
  | { type: 'pass' };

export interface CollectPlayerView {
  seatIndex: number;
  handCount: number;
  locked: LockedSet[];
  score: number;
}

export interface CollectView {
  numPlayers: number;
  deckCount: number;
  meadow: (CollectCard | null)[];
  players: CollectPlayerView[];
  toMove: number;
  over: boolean;
  finalRound: boolean;
  yourSeat: number | null;
  yourHand: CollectCard[];
  species: SpeciesInfo[];
}

export function speciesBase(species: Species): number {
  return SPECIES_BY_ID[species].base;
}

export function speciesName(species: Species): string {
  return SPECIES_BY_ID[species].name;
}

/** Larger locked sets are worth disproportionately more, rewarding commitment. */
export function setMultiplier(size: number): number {
  if (size < 3) return 0;
  if (size === 3) return 3;
  if (size === 4) return 5;
  if (size === 5) return 8;
  if (size === 6) return 12;
  return 12 + 4 * (size - 6);
}

export function setPoints(species: Species, size: number): number {
  return speciesBase(species) * setMultiplier(size);
}

export function scoreOf(player: CollectPlayerState): number {
  return player.locked.reduce((sum, set) => sum + set.points, 0);
}

export function countSpecies(hand: CollectCard[], species: Species): number {
  let n = 0;
  for (const card of hand) {
    if (card.species === species) n += 1;
  }
  return n;
}

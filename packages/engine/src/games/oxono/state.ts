/** Oxono domain types and constants. */

export type OxSymbol = 'X' | 'O';
export type OxColor = 'pink' | 'black';

export interface OxToken {
  symbol: OxSymbol;
  color: OxColor;
}

/** A single atomic Oxono turn: move a totem, then place a matching token. */
export interface OxonoAction {
  totem: OxSymbol;
  /** Destination cell index for the totem. */
  to: number;
  /** Cell index where the matching token is placed. */
  place: number;
}

export interface OxonoMove extends OxonoAction {
  seatIndex: number;
  from: number;
  jumped: boolean;
  color: OxColor;
}

export interface OxonoState {
  /** 36 cells, row major. A cell holds a token or null. Totems are tracked apart. */
  board: (OxToken | null)[];
  /** Cell index of each totem. */
  totem: Record<OxSymbol, number>;
  /** Seat index to move, 0 or 1. */
  toMove: number;
  /** Remaining tokens per seat, by symbol. */
  reserves: [Record<OxSymbol, number>, Record<OxSymbol, number>];
  winner: number | null;
  draw: boolean;
  moveCount: number;
  last: OxonoMove | null;
}

/** The Oxono view is identical to the state, the game has no hidden information. */
export type OxonoView = OxonoState;

export const OXONO_SIZE = 9;
export const OXONO_CELLS = OXONO_SIZE * OXONO_SIZE;
export const OXONO_START_RESERVE = 12;

/** Seat 0 plays pink, seat 1 plays black. */
export const SEAT_COLOR: OxColor[] = ['pink', 'black'];

/** Starting totem cells, placed at the center of the 9x9 board. */
export const TOTEM_START: Record<OxSymbol, number> = {
  // X at row 4 col 3 (index 39), O at row 4 col 5 (index 41), flanking the center.
  X: 39,
  O: 41,
};

export const COLOR_LABEL: Record<OxColor, string> = {
  pink: 'Hồng',
  black: 'Đen',
};

export function otherSymbol(s: OxSymbol): OxSymbol {
  return s === 'X' ? 'O' : 'X';
}

export function rowOf(index: number): number {
  return Math.floor(index / OXONO_SIZE);
}

export function colOf(index: number): number {
  return index % OXONO_SIZE;
}

export function cellIndex(row: number, col: number): number {
  return row * OXONO_SIZE + col;
}

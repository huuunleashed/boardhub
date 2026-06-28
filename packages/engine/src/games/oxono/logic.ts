/** Pure Oxono rules. No engine plumbing here, only board math and move legality. */

import {
  cellIndex,
  colOf,
  OXONO_CELLS,
  OXONO_SIZE,
  otherSymbol,
  rowOf,
  type OxColor,
  type OxonoState,
  type OxSymbol,
  type OxToken,
} from './state.js';

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < OXONO_SIZE && col >= 0 && col < OXONO_SIZE;
}

/** Whether a cell is blocked by a token or by either totem position. */
function occupied(state: OxonoState, index: number): boolean {
  return state.board[index] !== null || state.totem.X === index || state.totem.O === index;
}

/** Orthogonal neighbors of a cell. */
export function neighbors(index: number): number[] {
  const row = rowOf(index);
  const col = colOf(index);
  const out: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc)) out.push(cellIndex(nr, nc));
  }
  return out;
}

/** Cells a totem can slide to: outward along rows and columns over empty cells. */
function slideDestinations(state: OxonoState, totem: OxSymbol): number[] {
  const from = state.totem[totem];
  const otherPos = state.totem[otherSymbol(totem)];
  const row = rowOf(from);
  const col = colOf(from);
  const out: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc)) {
      const i = cellIndex(nr, nc);
      if (state.board[i] !== null || i === otherPos) break;
      out.push(i);
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

/**
 * Cells a totem can jump to when it is fully surrounded: leap over the
 * contiguous run of occupied cells in each direction and land on the first free
 * cell beyond it.
 */
function jumpDestinations(state: OxonoState, totem: OxSymbol): number[] {
  const from = state.totem[totem];
  const otherPos = state.totem[otherSymbol(totem)];
  const row = rowOf(from);
  const col = colOf(from);
  const out: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let nr = row + dr;
    let nc = col + dc;
    // Walk across occupied cells.
    while (inBounds(nr, nc)) {
      const i = cellIndex(nr, nc);
      const isOccupied = state.board[i] !== null || i === otherPos;
      if (!isOccupied) break;
      nr += dr;
      nc += dc;
    }
    if (inBounds(nr, nc)) {
      out.push(cellIndex(nr, nc));
    }
  }
  return out;
}

/**
 * Legal destinations for a totem. Normal slides take priority; only when a totem
 * has no slide available does it jump.
 */
export function totemDestinations(
  state: OxonoState,
  totem: OxSymbol,
): { dests: number[]; jumped: boolean } {
  const slides = slideDestinations(state, totem);
  if (slides.length > 0) {
    return { dests: slides, jumped: false };
  }
  return { dests: jumpDestinations(state, totem), jumped: true };
}

/**
 * Where the matching token can be placed after a totem has moved to `totemPos`.
 * Free orthogonal neighbors are preferred; if there are none the token may go on
 * any free cell.
 */
export function placementCells(state: OxonoState, totem: OxSymbol, totemPos: number): number[] {
  const otherPos = state.totem[otherSymbol(totem)];
  const isFree = (i: number): boolean => state.board[i] === null && i !== totemPos && i !== otherPos;
  const adjacent = neighbors(totemPos).filter(isFree);
  if (adjacent.length > 0) {
    return adjacent;
  }
  const anywhere: number[] = [];
  for (let i = 0; i < OXONO_CELLS; i += 1) {
    if (isFree(i)) anywhere.push(i);
  }
  return anywhere;
}

function tokenAt(state: OxonoState, index: number): OxToken | null {
  return state.board[index];
}

/** Does the four cell window share a symbol or a color? Totem cells fail the test. */
function windowWins(state: OxonoState, a: number, b: number, c: number, d: number): boolean {
  const ta = tokenAt(state, a);
  const tb = tokenAt(state, b);
  const tc = tokenAt(state, c);
  const td = tokenAt(state, d);
  if (!ta || !tb || !tc || !td) return false;
  const sameSymbol = ta.symbol === tb.symbol && tb.symbol === tc.symbol && tc.symbol === td.symbol;
  const sameColor = ta.color === tb.color && tb.color === tc.color && tc.color === td.color;
  return sameSymbol || sameColor;
}

/**
 * Check whether placing the last token at `index` completes a line of four of a
 * kind (same symbol or same color) horizontally or vertically. Diagonals never win.
 */
export function isWinningPlacement(state: OxonoState, index: number): boolean {
  const row = rowOf(index);
  const col = colOf(index);

  // Horizontal windows that contain this column.
  for (let start = Math.max(0, col - 3); start <= Math.min(OXONO_SIZE - 4, col); start += 1) {
    const base = cellIndex(row, start);
    if (windowWins(state, base, base + 1, base + 2, base + 3)) return true;
  }
  // Vertical windows that contain this row.
  for (let start = Math.max(0, row - 3); start <= Math.min(OXONO_SIZE - 4, row); start += 1) {
    const base = cellIndex(start, col);
    if (windowWins(state, base, base + OXONO_SIZE, base + 2 * OXONO_SIZE, base + 3 * OXONO_SIZE)) {
      return true;
    }
  }
  return false;
}

/** Return the four cell indices of the winning line through `index`, if any. */
export function winningLine(state: OxonoState, index: number): number[] | null {
  const row = rowOf(index);
  const col = colOf(index);
  for (let start = Math.max(0, col - 3); start <= Math.min(OXONO_SIZE - 4, col); start += 1) {
    const base = cellIndex(row, start);
    if (windowWins(state, base, base + 1, base + 2, base + 3)) {
      return [base, base + 1, base + 2, base + 3];
    }
  }
  for (let start = Math.max(0, row - 3); start <= Math.min(OXONO_SIZE - 4, row); start += 1) {
    const base = cellIndex(start, col);
    if (windowWins(state, base, base + OXONO_SIZE, base + 2 * OXONO_SIZE, base + 3 * OXONO_SIZE)) {
      return [base, base + OXONO_SIZE, base + 2 * OXONO_SIZE, base + 3 * OXONO_SIZE];
    }
  }
  return null;
}

export function colorForSeat(seatIndex: number): OxColor {
  return seatIndex === 0 ? 'pink' : 'black';
}

/** True when a seat has no legal action at all (used to detect a stalemate draw). */
export function hasNoMoves(state: OxonoState, seatIndex: number): boolean {
  const reserve = state.reserves[seatIndex];
  const symbols: OxSymbol[] = ['X', 'O'];
  for (const totem of symbols) {
    if (reserve[totem] <= 0) continue;
    const { dests } = totemDestinations(state, totem);
    if (dests.length > 0) {
      // Any destination yields at least one placement, so a move exists.
      return false;
    }
  }
  return true;
}

export { occupied };

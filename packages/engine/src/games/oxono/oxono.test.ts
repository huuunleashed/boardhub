import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng.js';
import type { EnginePlayer } from '../../sdk.js';
import { oxono } from './index.js';
import {
  isWinningPlacement,
  placementCells,
  totemDestinations,
} from './logic.js';
import type { OxonoState } from './state.js';

const players: EnginePlayer[] = [
  { seatIndex: 0, userId: 'a', displayName: 'Hồng', isBot: false },
  { seatIndex: 1, userId: 'b', displayName: 'Đen', isBot: false },
];

function fresh(): OxonoState {
  return oxono.setup({ players, options: {}, rng: createRng(1) });
}

const ctx0 = { seatIndex: 0, rng: createRng(7) };
const ctx1 = { seatIndex: 1, rng: createRng(9) };

describe('Oxono setup', () => {
  it('starts with an empty board and centered totems', () => {
    const s = fresh();
    expect(s.board.filter(Boolean)).toHaveLength(0);
    expect(s.totem.X).toBe(14);
    expect(s.totem.O).toBe(21);
    expect(s.toMove).toBe(0);
    expect(s.reserves[0]).toEqual({ X: 8, O: 8 });
    expect(s.reserves[1]).toEqual({ X: 8, O: 8 });
    expect(oxono.currentPlayer(s)).toBe(0);
    expect(oxono.isTerminal(s)).toBe(false);
  });
});

describe('Oxono totem movement', () => {
  it('slides along the row and column over empty cells', () => {
    const s = fresh();
    const { dests, jumped } = totemDestinations(s, 'X');
    expect(jumped).toBe(false);
    // Row 2: 12,13,15,16,17. Column 2: 2,8,20,26,32.
    expect([...dests].sort((a, b) => a - b)).toEqual([2, 8, 12, 13, 15, 16, 17, 20, 26, 32]);
  });

  it('stops before the other totem', () => {
    const s = fresh();
    s.totem.O = 16; // place O on row 2 to the right of X at 14
    const { dests } = totemDestinations(s, 'X');
    // Rightward now blocked at 15 (16 occupied by O), so 16 and 17 are gone.
    expect(dests).toContain(15);
    expect(dests).not.toContain(16);
    expect(dests).not.toContain(17);
  });

  it('jumps over neighbors only when fully surrounded', () => {
    const s = fresh();
    // Surround totem X at 14 with tokens on all four sides.
    s.board[8] = { symbol: 'O', color: 'pink' };
    s.board[20] = { symbol: 'O', color: 'black' };
    s.board[13] = { symbol: 'O', color: 'pink' };
    s.board[15] = { symbol: 'O', color: 'black' };
    const { dests, jumped } = totemDestinations(s, 'X');
    expect(jumped).toBe(true);
    expect([...dests].sort((a, b) => a - b)).toEqual([2, 12, 16, 26]);
  });
});

describe('Oxono placement', () => {
  it('limits placement to free orthogonal neighbors', () => {
    const s = fresh();
    // Totem X virtually at 15, neighbor 21 is totem O.
    const moved = oxono.view(s, 0);
    moved.totem.X = 15;
    const cells = placementCells(moved, 'X', 15);
    expect([...cells].sort((a, b) => a - b)).toEqual([9, 14, 16]);
  });

  it('allows placing anywhere when there is no free neighbor', () => {
    const s = fresh();
    s.totem.X = 0; // corner, neighbors 1 and 6
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[6] = { symbol: 'X', color: 'black' };
    const cells = placementCells(s, 'X', 0);
    // Many free cells, but not occupied ones or totem cells.
    expect(cells).not.toContain(0);
    expect(cells).not.toContain(1);
    expect(cells).not.toContain(6);
    expect(cells).not.toContain(21); // totem O
    expect(cells.length).toBeGreaterThan(20);
  });
});

describe('Oxono win detection', () => {
  it('wins with four of the same symbol regardless of color', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[1] = { symbol: 'X', color: 'black' };
    s.board[2] = { symbol: 'X', color: 'pink' };
    s.board[3] = { symbol: 'X', color: 'black' };
    expect(isWinningPlacement(s, 3)).toBe(true);
  });

  it('wins with four of the same color regardless of symbol', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[6] = { symbol: 'O', color: 'pink' };
    s.board[12] = { symbol: 'X', color: 'pink' };
    s.board[18] = { symbol: 'O', color: 'pink' };
    expect(isWinningPlacement(s, 18)).toBe(true);
  });

  it('does not count diagonals', () => {
    const s = fresh();
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[8] = { symbol: 'X', color: 'pink' };
    s.board[15] = { symbol: 'X', color: 'pink' };
    s.board[22] = { symbol: 'X', color: 'pink' };
    expect(isWinningPlacement(s, 22)).toBe(false);
  });

  it('does not win across a totem gap', () => {
    const s = fresh();
    // Row 2 cells 12,13 then totem at 14 then 15: totem breaks the line.
    s.board[12] = { symbol: 'X', color: 'pink' };
    s.board[13] = { symbol: 'X', color: 'pink' };
    s.board[15] = { symbol: 'X', color: 'pink' };
    s.board[16] = { symbol: 'X', color: 'pink' };
    // Window 13,14,15,16 includes totem cell 14 (board null), so no win.
    expect(isWinningPlacement(s, 15)).toBe(false);
  });
});

describe('Oxono turn flow', () => {
  it('validates and applies a legal move', () => {
    const s = fresh();
    const action = { totem: 'X' as const, to: 15, place: 14 };
    expect(oxono.validate(s, action, ctx0).ok).toBe(true);
    const { state } = oxono.reduce(s, action, ctx0);
    expect(state.totem.X).toBe(15);
    expect(state.board[14]).toEqual({ symbol: 'X', color: 'pink' });
    expect(state.reserves[0].X).toBe(7);
    expect(state.toMove).toBe(1);
  });

  it('rejects acting out of turn', () => {
    const s = fresh();
    const action = { totem: 'X' as const, to: 15, place: 14 };
    expect(oxono.validate(s, action, ctx1).ok).toBe(false);
  });

  it('declares a winner when a placement completes a line', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[2] = { symbol: 'X', color: 'pink' };
    s.totem.X = 5; // row 0, can slide left to 4
    const action = { totem: 'X' as const, to: 4, place: 3 };
    expect(oxono.validate(s, action, ctx0).ok).toBe(true);
    const { state } = oxono.reduce(s, action, ctx0);
    expect(state.winner).toBe(0);
    expect(oxono.isTerminal(state)).toBe(true);
    expect(oxono.getResult(state)).toEqual({ kind: 'win', winners: [0] });
  });
});

describe('Oxono bot', () => {
  it('takes an immediate winning move', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[2] = { symbol: 'X', color: 'pink' };
    s.totem.X = 5;
    const action = oxono.bot(s, 0, createRng(3));
    expect(action).not.toBeNull();
    const { state } = oxono.reduce(s, action!, ctx0);
    expect(state.winner).toBe(0);
  });

  it('always returns a legal action from the legal set', () => {
    const s = fresh();
    const action = oxono.bot(s, 0, createRng(11));
    expect(action).not.toBeNull();
    expect(oxono.validate(s, action!, ctx0).ok).toBe(true);
  });
});

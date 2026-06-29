import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng.js';
import type { EnginePlayer } from '../../sdk.js';
import { oxono } from './index.js';
import { isWinningPlacement, placementCells, totemDestinations } from './logic.js';
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

describe('Oxono setup (9x9)', () => {
  it('starts with an empty board and centered totems', () => {
    const s = fresh();
    expect(s.board).toHaveLength(81);
    expect(s.board.filter(Boolean)).toHaveLength(0);
    expect(s.totem.X).toBe(39);
    expect(s.totem.O).toBe(41);
    expect(s.toMove).toBe(0);
    expect(s.reserves[0]).toEqual({ X: 12, O: 12 });
    expect(oxono.currentPlayer(s)).toBe(0);
  });
});

describe('Oxono totem movement', () => {
  it('slides along the row and column over empty cells', () => {
    const s = fresh();
    const { dests, jumped } = totemDestinations(s, 'X');
    expect(jumped).toBe(false);
    expect([...dests].sort((a, b) => a - b)).toEqual([3, 12, 21, 30, 36, 37, 38, 40, 48, 57, 66, 75]);
  });

  it('stops before the other totem', () => {
    const s = fresh();
    const { dests } = totemDestinations(s, 'X');
    expect(dests).toContain(40);
    expect(dests).not.toContain(41);
    expect(dests).not.toContain(42);
  });

  it('jumps over neighbors only when fully surrounded', () => {
    const s = fresh();
    s.board[30] = { symbol: 'O', color: 'pink' };
    s.board[48] = { symbol: 'O', color: 'black' };
    s.board[38] = { symbol: 'O', color: 'pink' };
    s.board[40] = { symbol: 'O', color: 'black' };
    const { dests, jumped } = totemDestinations(s, 'X');
    expect(jumped).toBe(true);
    expect([...dests].sort((a, b) => a - b)).toEqual([21, 37, 42, 57]);
  });
});

describe('Oxono placement', () => {
  it('limits placement to free orthogonal neighbors', () => {
    const s = fresh();
    const cells = placementCells(s, 'X', 39);
    expect([...cells].sort((a, b) => a - b)).toEqual([30, 38, 40, 48]);
  });

  it('allows placing anywhere when there is no free neighbor', () => {
    const s = fresh();
    s.totem.X = 0;
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[9] = { symbol: 'X', color: 'black' };
    const cells = placementCells(s, 'X', 0);
    expect(cells).not.toContain(0);
    expect(cells).not.toContain(1);
    expect(cells).not.toContain(9);
    expect(cells.length).toBeGreaterThan(40);
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

  it('wins with four of the same color down a column', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[9] = { symbol: 'O', color: 'pink' };
    s.board[18] = { symbol: 'X', color: 'pink' };
    s.board[27] = { symbol: 'O', color: 'pink' };
    expect(isWinningPlacement(s, 27)).toBe(true);
  });

  it('does not count diagonals', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[10] = { symbol: 'X', color: 'pink' };
    s.board[20] = { symbol: 'X', color: 'pink' };
    s.board[30] = { symbol: 'X', color: 'pink' };
    expect(isWinningPlacement(s, 30)).toBe(false);
  });
});

describe('Oxono turn flow', () => {
  it('validates and applies a legal move', () => {
    const s = fresh();
    const action = { totem: 'X' as const, to: 40, place: 39 };
    expect(oxono.validate(s, action, ctx0).ok).toBe(true);
    const { state } = oxono.reduce(s, action, ctx0);
    expect(state.totem.X).toBe(40);
    expect(state.board[39]).toEqual({ symbol: 'X', color: 'pink' });
    expect(state.reserves[0].X).toBe(11);
    expect(state.toMove).toBe(1);
  });

  it('rejects acting out of turn', () => {
    const s = fresh();
    expect(oxono.validate(s, { totem: 'X', to: 40, place: 39 }, ctx1).ok).toBe(false);
  });

  it('declares a winner when a placement completes a line', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[2] = { symbol: 'X', color: 'pink' };
    s.totem.X = 8;
    const action = { totem: 'X' as const, to: 4, place: 3 };
    expect(oxono.validate(s, action, ctx0).ok).toBe(true);
    const { state } = oxono.reduce(s, action, ctx0);
    expect(state.winner).toBe(0);
    expect(oxono.getResult(state)).toEqual({ kind: 'win', winners: [0] });
  });
});

describe('Oxono bot', () => {
  it('takes an immediate winning move', () => {
    const s = fresh();
    s.board[0] = { symbol: 'X', color: 'pink' };
    s.board[1] = { symbol: 'X', color: 'pink' };
    s.board[2] = { symbol: 'X', color: 'pink' };
    s.totem.X = 8;
    const action = oxono.bot(s, 0, createRng(3));
    expect(action).not.toBeNull();
    const { state } = oxono.reduce(s, action!, ctx0);
    expect(state.winner).toBe(0);
  });

  it('always returns a legal action', () => {
    const s = fresh();
    const action = oxono.bot(s, 0, createRng(11));
    expect(action).not.toBeNull();
    expect(oxono.validate(s, action!, ctx0).ok).toBe(true);
  });
});

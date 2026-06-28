import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng.js';
import type { EnginePlayer } from '../../sdk.js';
import { collect } from './index.js';
import { scoreOf, setPoints, type CollectState } from './state.js';

function players(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    seatIndex: i,
    userId: `u${i}`,
    displayName: `P${i}`,
    isBot: false,
  }));
}

function fresh(n = 2): CollectState {
  return collect.setup({ players: players(n), options: {}, rng: createRng(42) });
}

describe('Collect setup', () => {
  it('deals hands and a four card meadow from a 52 card deck', () => {
    const s = fresh(2);
    expect(s.players).toHaveLength(2);
    expect(s.players[0].hand).toHaveLength(4);
    expect(s.players[1].hand).toHaveLength(4);
    expect(s.meadow.filter(Boolean)).toHaveLength(4);
    // 52 total minus 8 dealt minus 4 in meadow.
    expect(s.deck).toHaveLength(40);
    expect(collect.currentPlayer(s)).toBe(0);
  });

  it('rejects player counts outside 2 to 6', () => {
    expect(() => collect.setup({ players: players(1), options: {}, rng: createRng(1) })).toThrow();
    expect(() => collect.setup({ players: players(7), options: {}, rng: createRng(1) })).toThrow();
  });
});

describe('Collect actions', () => {
  it('offers draw and take actions at the start', () => {
    const s = fresh(2);
    const actions = collect.legalActions(s, 0);
    expect(actions.some((a) => a.type === 'draw')).toBe(true);
    expect(actions.filter((a) => a.type === 'take')).toHaveLength(4);
  });

  it('take pulls a meadow card and refills from the deck', () => {
    const s = fresh(2);
    const card = s.meadow[0]!;
    const { state } = collect.reduce(s, { type: 'take', meadowIndex: 0 }, { seatIndex: 0, rng: createRng(1) });
    expect(state.players[0].hand.some((c) => c.id === card.id)).toBe(true);
    expect(state.meadow[0]).not.toBeNull();
    expect(state.deck).toHaveLength(39);
    expect(state.toMove).toBe(1);
  });

  it('locks a set of three or more of the same species', () => {
    const s = fresh(2);
    s.players[0].hand = [
      { id: 'fox-1', species: 'fox' },
      { id: 'fox-2', species: 'fox' },
      { id: 'fox-3', species: 'fox' },
      { id: 'owl-1', species: 'owl' },
    ];
    expect(collect.validate(s, { type: 'lock', species: 'fox' }, { seatIndex: 0, rng: createRng(1) }).ok).toBe(true);
    expect(collect.validate(s, { type: 'lock', species: 'owl' }, { seatIndex: 0, rng: createRng(1) }).ok).toBe(false);
    const { state } = collect.reduce(s, { type: 'lock', species: 'fox' }, { seatIndex: 0, rng: createRng(1) });
    expect(state.players[0].locked).toHaveLength(1);
    expect(state.players[0].locked[0].size).toBe(3);
    expect(state.players[0].locked[0].points).toBe(setPoints('fox', 3));
    expect(state.players[0].hand).toHaveLength(1);
  });
});

describe('Collect scoring', () => {
  it('rewards larger sets disproportionately', () => {
    expect(setPoints('rabbit', 3)).toBe(3);
    expect(setPoints('bear', 3)).toBe(12);
    expect(setPoints('bear', 6)).toBeGreaterThan(setPoints('bear', 5) * 1.4);
  });

  it('sums locked set points into a player score', () => {
    const player = {
      hand: [],
      locked: [
        { species: 'fox' as const, size: 3, points: setPoints('fox', 3), cardIds: [] },
        { species: 'bear' as const, size: 4, points: setPoints('bear', 4), cardIds: [] },
      ],
    };
    expect(scoreOf(player)).toBe(setPoints('fox', 3) + setPoints('bear', 4));
  });
});

describe('Collect termination', () => {
  it('ends after a final round once the table is dry', () => {
    const s = fresh(2);
    s.deck = [];
    s.meadow = [null, null, null, null];
    s.players[0].hand = [{ id: 'rabbit-1', species: 'rabbit' }];
    s.players[1].hand = [{ id: 'otter-1', species: 'otter' }];

    const pass0 = collect.reduce(s, { type: 'pass' }, { seatIndex: 0, rng: createRng(1) });
    expect(pass0.state.over).toBe(false);
    expect(pass0.state.toMove).toBe(1);

    const pass1 = collect.reduce(pass0.state, { type: 'pass' }, { seatIndex: 1, rng: createRng(1) });
    expect(pass1.state.over).toBe(true);
    const result = collect.getResult(pass1.state);
    expect(result?.kind).toBe('win');
  });

  it('declares the highest score the winner', () => {
    const s = fresh(2);
    s.deck = [];
    s.meadow = [null, null, null, null];
    s.players[0].locked = [{ species: 'bear', size: 4, points: setPoints('bear', 4), cardIds: [] }];
    s.players[1].locked = [{ species: 'rabbit', size: 3, points: setPoints('rabbit', 3), cardIds: [] }];
    s.players[0].hand = [];
    s.players[1].hand = [];
    const r0 = collect.reduce(s, { type: 'pass' }, { seatIndex: 0, rng: createRng(1) });
    const r1 = collect.reduce(r0.state, { type: 'pass' }, { seatIndex: 1, rng: createRng(1) });
    expect(collect.getResult(r1.state)?.winners).toEqual([0]);
  });
});

describe('Collect view and bot', () => {
  it('hides other players hands but shows your own', () => {
    const s = fresh(3);
    const v = collect.view(s, 1);
    expect(v.yourHand).toHaveLength(4);
    expect(v.yourSeat).toBe(1);
    expect(v.players[0].handCount).toBe(4);
    // The view never leaks other hands, only counts.
    expect((v.players[0] as unknown as { hand?: unknown }).hand).toBeUndefined();
  });

  it('bot returns a legal action', () => {
    const s = fresh(4);
    const action = collect.bot(s, 0, createRng(5));
    expect(action).not.toBeNull();
    expect(collect.validate(s, action!, { seatIndex: 0, rng: createRng(5) }).ok).toBe(true);
  });
});

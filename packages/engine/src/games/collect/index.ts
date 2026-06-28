import type {
  ActionContext,
  GameDefinition,
  GameMeta,
  RNG,
  SetupContext,
  ValidationResult,
} from '../../sdk.js';
import type { GameResult } from '@boardhub/shared';
import {
  countSpecies,
  MEADOW_SIZE,
  scoreOf,
  setPoints,
  speciesBase,
  speciesName,
  SPECIES,
  START_HAND,
  type CollectAction,
  type CollectCard,
  type CollectPlayerState,
  type CollectPlayerView,
  type CollectState,
  type CollectView,
  type Species,
} from './state.js';

const META: GameMeta = {
  id: 'collect',
  name: 'Collect',
  tagline: 'Gom thẻ động vật, khóa bộ sưu tập để ghi điểm',
  description:
    'Collect là game thẻ bài gom bộ cho 2 tới 6 người. Thu thập các loài động vật, khóa thành bộ từ 3 lá trở lên. Bộ càng lớn điểm càng cao. Khi bộ bài cạn, ai nhiều điểm nhất sẽ thắng.',
  rules: [
    'Bộ bài gồm 8 loài động vật, loài hiếm thì ít lá nhưng giá trị cao hơn.',
    'Mỗi người được chia bài lên tay, giữa bàn có Đồng cỏ gồm bốn lá ngửa.',
    'Mỗi lượt chọn một việc: Rút một lá úp, Lấy một lá từ Đồng cỏ, hoặc Khóa một bộ.',
    'Khóa bộ cần ít nhất ba lá cùng loài. Bộ đã khóa được tính điểm ở cuối ván.',
    'Điểm mỗi bộ bằng giá trị loài nhân hệ số kích thước, bộ càng lớn càng lời.',
    'Khi bộ rút và Đồng cỏ cạn, mỗi người chơi thêm một lượt cuối rồi tính điểm.',
    'Lá còn trên tay không được tính điểm, hãy khóa bộ đúng lúc.',
  ],
  minPlayers: 2,
  maxPlayers: 6,
  estimatedMinutes: 20,
  hasHiddenInfo: true,
  supportsBots: true,
};

function buildDeck(): CollectCard[] {
  const deck: CollectCard[] = [];
  for (const sp of SPECIES) {
    for (let i = 1; i <= sp.count; i += 1) {
      deck.push({ id: `${sp.id}-${i}`, species: sp.id });
    }
  }
  return deck;
}

function cloneState(state: CollectState): CollectState {
  return {
    numPlayers: state.numPlayers,
    deck: state.deck.map((c) => ({ ...c })),
    meadow: state.meadow.map((c) => (c ? { ...c } : null)),
    players: state.players.map((p) => ({
      hand: p.hand.map((c) => ({ ...c })),
      locked: p.locked.map((s) => ({ ...s, cardIds: [...s.cardIds] })),
    })),
    toMove: state.toMove,
    finalTurnsRemaining: state.finalTurnsRemaining,
    over: state.over,
  };
}

function setup(ctx: SetupContext): CollectState {
  const n = ctx.players.length;
  if (n < META.minPlayers || n > META.maxPlayers) {
    throw new Error('Collect cần từ 2 tới 6 người chơi.');
  }
  const deck = ctx.rng.shuffle(buildDeck());
  const players: CollectPlayerState[] = [];
  for (let i = 0; i < n; i += 1) {
    players.push({ hand: deck.splice(0, START_HAND), locked: [] });
  }
  const meadow: (CollectCard | null)[] = [];
  for (let i = 0; i < MEADOW_SIZE; i += 1) {
    meadow.push(deck.length > 0 ? deck.shift()! : null);
  }
  return {
    numPlayers: n,
    deck,
    meadow,
    players,
    toMove: 0,
    finalTurnsRemaining: null,
    over: false,
  };
}

function currentPlayer(state: CollectState): number {
  return state.over ? -1 : state.toMove;
}

function isTerminal(state: CollectState): boolean {
  return state.over;
}

function tableIsDry(state: CollectState): boolean {
  return state.deck.length === 0 && state.meadow.every((c) => c === null);
}

function canLockAny(player: CollectPlayerState): boolean {
  return SPECIES.some((sp) => countSpecies(player.hand, sp.id) >= 3);
}

function validate(state: CollectState, action: CollectAction, ctx: ActionContext): ValidationResult {
  if (state.over) return { ok: false, error: 'Ván đấu đã kết thúc.' };
  if (ctx.seatIndex !== state.toMove) return { ok: false, error: 'Chưa tới lượt của bạn.' };
  const player = state.players[ctx.seatIndex];
  if (!action || typeof action.type !== 'string') {
    return { ok: false, error: 'Hành động không hợp lệ.' };
  }
  switch (action.type) {
    case 'draw':
      if (state.deck.length === 0) return { ok: false, error: 'Bộ rút đã hết.' };
      return { ok: true };
    case 'take': {
      const idx = action.meadowIndex;
      if (!Number.isInteger(idx) || idx < 0 || idx >= state.meadow.length) {
        return { ok: false, error: 'Vị trí Đồng cỏ không hợp lệ.' };
      }
      if (!state.meadow[idx]) return { ok: false, error: 'Ô Đồng cỏ đó trống.' };
      return { ok: true };
    }
    case 'lock': {
      const available = countSpecies(player.hand, action.species);
      if (available < 3) return { ok: false, error: 'Cần ít nhất ba lá cùng loài để khóa.' };
      const n = action.count ?? available;
      if (!Number.isInteger(n) || n < 3 || n > available) {
        return { ok: false, error: 'Số lá khóa không hợp lệ.' };
      }
      return { ok: true };
    }
    case 'pass': {
      const canDraw = state.deck.length > 0;
      const canTake = state.meadow.some((c) => c !== null);
      if (canDraw || canTake || canLockAny(player)) {
        return { ok: false, error: 'Bạn còn nước đi nên không thể bỏ lượt.' };
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: 'Hành động không hợp lệ.' };
  }
}

function advance(state: CollectState): void {
  if (state.finalTurnsRemaining === null && tableIsDry(state)) {
    state.finalTurnsRemaining = state.numPlayers - 1;
  }
  if (state.finalTurnsRemaining !== null) {
    if (state.finalTurnsRemaining <= 0) {
      state.over = true;
      return;
    }
    state.finalTurnsRemaining -= 1;
  }
  state.toMove = (state.toMove + 1) % state.numPlayers;
}

function reduce(state: CollectState, action: CollectAction, ctx: ActionContext) {
  const seat = ctx.seatIndex;
  const next = cloneState(state);
  const player = next.players[seat];
  const log: { text: string; seatIndex?: number }[] = [];

  switch (action.type) {
    case 'draw': {
      const card = next.deck.shift()!;
      player.hand.push(card);
      log.push({ seatIndex: seat, text: 'rút một lá từ bộ rút.' });
      break;
    }
    case 'take': {
      const card = next.meadow[action.meadowIndex]!;
      player.hand.push(card);
      next.meadow[action.meadowIndex] = next.deck.length > 0 ? next.deck.shift()! : null;
      log.push({ seatIndex: seat, text: `lấy lá ${speciesName(card.species)} từ Đồng cỏ.` });
      break;
    }
    case 'lock': {
      const available = countSpecies(player.hand, action.species);
      const n = action.count ?? available;
      const taken: CollectCard[] = [];
      player.hand = player.hand.filter((c) => {
        if (c.species === action.species && taken.length < n) {
          taken.push(c);
          return false;
        }
        return true;
      });
      const points = setPoints(action.species, taken.length);
      player.locked.push({
        species: action.species,
        size: taken.length,
        points,
        cardIds: taken.map((c) => c.id),
      });
      log.push({
        seatIndex: seat,
        text: `khóa bộ ${speciesName(action.species)} gồm ${taken.length} lá, được ${points} điểm.`,
      });
      break;
    }
    case 'pass': {
      log.push({ seatIndex: seat, text: 'bỏ lượt.' });
      break;
    }
    default:
      break;
  }

  advance(next);
  if (next.over) {
    log.push({ text: 'Ván đấu kết thúc, tính điểm các bộ đã khóa.' });
  }
  return { state: next, log };
}

function playerView(player: CollectPlayerState, seatIndex: number): CollectPlayerView {
  return {
    seatIndex,
    handCount: player.hand.length,
    locked: player.locked.map((s) => ({ ...s, cardIds: [...s.cardIds] })),
    score: scoreOf(player),
  };
}

function view(state: CollectState, seatIndex: number | null): CollectView {
  return {
    numPlayers: state.numPlayers,
    deckCount: state.deck.length,
    meadow: state.meadow.map((c) => (c ? { ...c } : null)),
    players: state.players.map((p, i) => playerView(p, i)),
    toMove: state.over ? -1 : state.toMove,
    over: state.over,
    finalRound: state.finalTurnsRemaining !== null,
    yourSeat: seatIndex,
    yourHand:
      seatIndex !== null && state.players[seatIndex]
        ? state.players[seatIndex].hand.map((c) => ({ ...c }))
        : [],
    species: SPECIES,
  };
}

function getResult(state: CollectState): GameResult | null {
  if (!state.over) return null;
  const scores = state.players.map((p) => scoreOf(p));
  const best = Math.max(...scores);
  const winners: number[] = [];
  for (let i = 0; i < scores.length; i += 1) {
    if (scores[i] === best) winners.push(i);
  }
  return { kind: 'win', winners, scores };
}

function legalActions(state: CollectState, seatIndex: number): CollectAction[] {
  if (state.over || state.toMove !== seatIndex) return [];
  const player = state.players[seatIndex];
  const actions: CollectAction[] = [];
  if (state.deck.length > 0) actions.push({ type: 'draw' });
  for (let i = 0; i < state.meadow.length; i += 1) {
    if (state.meadow[i]) actions.push({ type: 'take', meadowIndex: i });
  }
  for (const sp of SPECIES) {
    if (countSpecies(player.hand, sp.id) >= 3) actions.push({ type: 'lock', species: sp.id });
  }
  if (actions.length === 0) actions.push({ type: 'pass' });
  return actions;
}

function bot(state: CollectState, seatIndex: number, rng: RNG): CollectAction | null {
  const actions = legalActions(state, seatIndex);
  if (actions.length === 0) return null;
  const player = state.players[seatIndex];

  // Lock the most valuable available set, but hold small sets early when the deck is deep.
  const lockable = SPECIES.map((sp) => ({
    species: sp.id as Species,
    n: countSpecies(player.hand, sp.id),
  })).filter((x) => x.n >= 3);
  if (lockable.length > 0) {
    lockable.sort((a, b) => setPoints(b.species, b.n) - setPoints(a.species, a.n));
    const best = lockable[0];
    const deckDeep = state.deck.length > state.numPlayers * 3;
    if (best.n >= 4 || !deckDeep || state.finalTurnsRemaining !== null) {
      return { type: 'lock', species: best.species };
    }
  }

  // Otherwise build toward the species we already hold the most of.
  const counts = new Map<Species, number>();
  for (const card of player.hand) {
    counts.set(card.species, (counts.get(card.species) ?? 0) + 1);
  }
  let takeIndex = -1;
  let takeScore = -Infinity;
  for (let i = 0; i < state.meadow.length; i += 1) {
    const card = state.meadow[i];
    if (!card) continue;
    const held = counts.get(card.species) ?? 0;
    const score = held * 3 + speciesBase(card.species);
    if (score > takeScore) {
      takeScore = score;
      takeIndex = i;
    }
  }
  const held = takeIndex >= 0 ? counts.get(state.meadow[takeIndex]!.species) ?? 0 : 0;
  if (takeIndex >= 0 && (held >= 1 || state.deck.length === 0)) {
    return { type: 'take', meadowIndex: takeIndex };
  }
  if (state.deck.length > 0) return { type: 'draw' };
  if (takeIndex >= 0) return { type: 'take', meadowIndex: takeIndex };
  return actions[0];
}

export const collect: GameDefinition<CollectState, CollectAction, CollectView> = {
  meta: META,
  setup,
  currentPlayer,
  validate,
  reduce,
  isTerminal,
  getResult,
  view,
  legalActions,
  bot,
};

export type { CollectState, CollectAction, CollectView } from './state.js';
export { SPECIES, setPoints, scoreOf, speciesName } from './state.js';

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
  colorForSeat,
  hasNoMoves,
  isWinningPlacement,
  placementCells,
  totemDestinations,
} from './logic.js';
import {
  COLOR_LABEL,
  OXONO_CELLS,
  OXONO_SIZE,
  OXONO_START_RESERVE,
  TOTEM_START,
  colOf,
  rowOf,
  type OxonoAction,
  type OxonoState,
  type OxonoView,
  type OxSymbol,
} from './state.js';

const SYMBOLS: OxSymbol[] = ['X', 'O'];

const META: GameMeta = {
  id: 'oxono',
  name: 'Oxono',
  tagline: 'Cờ trừu tượng hai người, xếp bốn quân thẳng hàng',
  description:
    'Oxono là cờ trừu tượng cho hai người trên bàn 6x6. Mỗi lượt bạn di chuyển một totem rồi đặt một quân cùng ký hiệu. Thắng khi xếp được bốn quân thẳng hàng cùng màu hoặc cùng ký hiệu.',
  rules: [
    'Bàn cờ 6x6 với hai totem dùng chung là X và O.',
    'Mỗi lượt: chọn một totem, trượt nó theo hàng hoặc cột bao xa tùy ý qua các ô trống.',
    'Sau khi di chuyển, đặt một quân cùng ký hiệu totem vào ô trống kề bên totem.',
    'Nếu totem bị vây kín, nó có thể nhảy qua các quân để tới ô trống đầu tiên.',
    'Nếu quanh totem không còn ô trống, bạn được đặt quân vào bất kỳ ô trống nào.',
    'Thắng khi xếp bốn quân thẳng hàng ngang hoặc dọc, cùng màu hoặc cùng ký hiệu.',
    'Hàng chéo không tính. Bạn có thể mượn quân đối thủ để xếp đủ bốn cùng ký hiệu.',
  ],
  minPlayers: 2,
  maxPlayers: 2,
  estimatedMinutes: 15,
  hasHiddenInfo: false,
  supportsBots: true,
};

function cloneState(state: OxonoState): OxonoState {
  return {
    board: state.board.map((cell) => (cell ? { ...cell } : null)),
    totem: { ...state.totem },
    toMove: state.toMove,
    reserves: [{ ...state.reserves[0] }, { ...state.reserves[1] }],
    winner: state.winner,
    draw: state.draw,
    moveCount: state.moveCount,
    last: state.last ? { ...state.last } : null,
  };
}

function humanCell(index: number): string {
  return `hàng ${rowOf(index) + 1} cột ${colOf(index) + 1}`;
}

function setup(ctx: SetupContext): OxonoState {
  if (ctx.players.length !== 2) {
    throw new Error('Oxono yêu cầu đúng hai người chơi.');
  }
  const board: (null)[] = new Array(OXONO_CELLS).fill(null);
  return {
    board,
    totem: { X: TOTEM_START.X, O: TOTEM_START.O },
    toMove: 0,
    reserves: [
      { X: OXONO_START_RESERVE, O: OXONO_START_RESERVE },
      { X: OXONO_START_RESERVE, O: OXONO_START_RESERVE },
    ],
    winner: null,
    draw: false,
    moveCount: 0,
    last: null,
  };
}

function currentPlayer(state: OxonoState): number {
  if (state.winner !== null || state.draw) return -1;
  return state.toMove;
}

function isTerminal(state: OxonoState): boolean {
  return state.winner !== null || state.draw;
}

function getResult(state: OxonoState): GameResult | null {
  if (state.winner !== null) {
    return { kind: 'win', winners: [state.winner] };
  }
  if (state.draw) {
    return { kind: 'draw', winners: [], reason: 'Không còn nước đi hợp lệ.' };
  }
  return null;
}

function validate(state: OxonoState, action: OxonoAction, ctx: ActionContext): ValidationResult {
  if (isTerminal(state)) {
    return { ok: false, error: 'Ván đấu đã kết thúc.' };
  }
  if (ctx.seatIndex !== state.toMove) {
    return { ok: false, error: 'Chưa tới lượt của bạn.' };
  }
  if (!action || (action.totem !== 'X' && action.totem !== 'O')) {
    return { ok: false, error: 'Totem không hợp lệ.' };
  }
  if (!Number.isInteger(action.to) || action.to < 0 || action.to >= OXONO_CELLS) {
    return { ok: false, error: 'Ô đích của totem không hợp lệ.' };
  }
  if (!Number.isInteger(action.place) || action.place < 0 || action.place >= OXONO_CELLS) {
    return { ok: false, error: 'Ô đặt quân không hợp lệ.' };
  }
  const reserve = state.reserves[ctx.seatIndex][action.totem];
  if (reserve <= 0) {
    return { ok: false, error: `Bạn đã hết quân ${action.totem}.` };
  }
  const { dests } = totemDestinations(state, action.totem);
  if (!dests.includes(action.to)) {
    return { ok: false, error: 'Totem không thể đi tới ô đó.' };
  }
  // Compute placement on the post move board.
  const moved = cloneState(state);
  moved.totem[action.totem] = action.to;
  const cells = placementCells(moved, action.totem, action.to);
  if (!cells.includes(action.place)) {
    return { ok: false, error: 'Không thể đặt quân vào ô đó.' };
  }
  return { ok: true };
}

function reduce(state: OxonoState, action: OxonoAction, ctx: ActionContext) {
  const seat = ctx.seatIndex;
  const color = colorForSeat(seat);
  const next = cloneState(state);
  const from = next.totem[action.totem];
  const slideInfo = totemDestinations(state, action.totem);

  next.totem[action.totem] = action.to;
  next.board[action.place] = { symbol: action.totem, color };
  next.reserves[seat][action.totem] -= 1;
  next.moveCount += 1;
  next.last = {
    seatIndex: seat,
    totem: action.totem,
    from,
    to: action.to,
    place: action.place,
    jumped: slideInfo.jumped,
    color,
  };

  const log = [
    {
      seatIndex: seat,
      text: `${COLOR_LABEL[color]} ${slideInfo.jumped ? 'cho totem' : 'di chuyển totem'} ${
        action.totem
      } rồi đặt quân ${action.totem} tại ${humanCell(action.place)}.`,
    },
  ];

  if (isWinningPlacement(next, action.place)) {
    next.winner = seat;
    log.push({ seatIndex: seat, text: `${COLOR_LABEL[color]} xếp đủ bốn quân thẳng hàng và thắng.` });
    return { state: next, log };
  }

  const opponent = 1 - seat;
  next.toMove = opponent;
  if (hasNoMoves(next, opponent)) {
    next.draw = true;
    log.push({ text: 'Không còn nước đi hợp lệ, ván đấu hòa.' });
  }
  return { state: next, log };
}

function view(state: OxonoState): OxonoView {
  return cloneState(state);
}

function legalActions(state: OxonoState, seatIndex: number): OxonoAction[] {
  if (isTerminal(state) || state.toMove !== seatIndex) return [];
  const out: OxonoAction[] = [];
  for (const totem of SYMBOLS) {
    if (state.reserves[seatIndex][totem] <= 0) continue;
    const { dests } = totemDestinations(state, totem);
    for (const to of dests) {
      const moved = cloneState(state);
      moved.totem[totem] = to;
      const cells = placementCells(moved, totem, to);
      for (const place of cells) {
        out.push({ totem, to, place });
      }
    }
  }
  return out;
}

const CENTER = [14, 15, 20, 21];

function distanceToCenter(index: number): number {
  const r = rowOf(index);
  const c = colOf(index);
  return Math.abs(r - 2.5) + Math.abs(c - 2.5);
}

/**
 * A practical bot: take an immediate win, otherwise avoid handing the opponent a
 * win, and break ties toward the center and toward building threats.
 */
function bot(state: OxonoState, seatIndex: number, rng: RNG): OxonoAction | null {
  const actions = legalActions(state, seatIndex);
  if (actions.length === 0) return null;

  const ctx: ActionContext = { seatIndex, rng };
  const opponent = 1 - seatIndex;

  // 1. Win now if possible.
  for (const action of actions) {
    const { state: nextState } = reduce(state, action, ctx);
    if (nextState.winner === seatIndex) return action;
  }

  // 2. Score remaining actions, penalizing those that let the opponent win next.
  let best: OxonoAction | null = null;
  let bestScore = -Infinity;
  const shuffled = rng.shuffle([...actions]);
  const sampleLimit = Math.min(shuffled.length, 64);

  for (let i = 0; i < sampleLimit; i += 1) {
    const action = shuffled[i];
    const { state: nextState } = reduce(state, action, { seatIndex, rng });
    let score = 0;
    score -= distanceToCenter(action.place) * 0.5;
    if (CENTER.includes(action.place)) score += 1.5;

    const oppActions = legalActions(nextState, opponent);
    let oppCanWin = false;
    for (let j = 0; j < oppActions.length; j += 1) {
      const { state: oppState } = reduce(nextState, oppActions[j], { seatIndex: opponent, rng });
      if (oppState.winner === opponent) {
        oppCanWin = true;
        break;
      }
    }
    if (oppCanWin) score -= 100;

    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }

  return best ?? shuffled[0];
}

export const oxono: GameDefinition<OxonoState, OxonoAction, OxonoView> = {
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

export type { OxonoState, OxonoAction, OxonoView } from './state.js';
export {
  totemDestinations,
  placementCells,
  winningLine,
  isWinningPlacement,
} from './logic.js';
export {
  OXONO_SIZE,
  OXONO_CELLS,
  SEAT_COLOR,
  COLOR_LABEL,
  rowOf,
  colOf,
  cellIndex,
} from './state.js';

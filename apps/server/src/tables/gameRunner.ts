import {
  createRng,
  getGame,
  type GameDefinition,
  type RNG,
} from '@boardhub/engine';
import type { GameLogEntry, GamePlayerInfo, GameResult, GameSnapshot } from '@boardhub/shared';
import { newId } from '../util/ids.js';

export interface RunnerPlayer {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  avatarColor: string;
  isBot: boolean;
}

export interface ApplyResult {
  ok: boolean;
  error?: string;
}

/**
 * Wraps a pure GameDefinition with the authoritative full state. Clients never
 * see this state directly, only the visibility filtered snapshots it produces.
 */
export class GameRunner {
  private readonly def: GameDefinition;
  private state: unknown;
  private readonly rng: RNG;
  private readonly log: GameLogEntry[] = [];

  constructor(
    public readonly gameId: string,
    public readonly players: RunnerPlayer[],
    options: Record<string, unknown>,
    seed: string,
  ) {
    const def = getGame(gameId);
    if (!def) throw new Error(`Không tìm thấy game: ${gameId}`);
    this.def = def;
    this.rng = createRng(seed);
    this.state = this.def.setup({
      players: players.map((p) => ({
        seatIndex: p.seatIndex,
        userId: p.userId,
        displayName: p.displayName,
        isBot: p.isBot,
      })),
      options,
      rng: this.rng,
    });
  }

  currentSeat(): number {
    return this.def.currentPlayer(this.state);
  }

  isOver(): boolean {
    return this.def.isTerminal(this.state);
  }

  result(): GameResult | null {
    return this.def.getResult(this.state);
  }

  seatOf(userId: string | null): number | null {
    if (!userId) return null;
    const player = this.players.find((p) => p.userId === userId);
    return player ? player.seatIndex : null;
  }

  isCurrentBot(): boolean {
    const seat = this.currentSeat();
    if (seat < 0) return false;
    return this.players[seat]?.isBot ?? false;
  }

  private appendLog(lines: { text: string; seatIndex?: number }[]): void {
    const now = Date.now();
    for (const line of lines) {
      this.log.push({ id: newId(), ts: now, text: line.text, seatIndex: line.seatIndex });
    }
    // Keep the log bounded.
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
  }

  applyAction(seatIndex: number, action: unknown): ApplyResult {
    if (this.isOver()) return { ok: false, error: 'Ván đấu đã kết thúc.' };
    if (seatIndex !== this.currentSeat()) return { ok: false, error: 'Chưa tới lượt của bạn.' };
    const ctx = { seatIndex, rng: this.rng };
    const verdict = this.def.validate(this.state, action, ctx);
    if (!verdict.ok) return { ok: false, error: verdict.error ?? 'Nước đi không hợp lệ.' };
    const { state, log } = this.def.reduce(this.state, action, ctx);
    this.state = state;
    this.appendLog(log);
    return { ok: true };
  }

  /** Have the current bot seat take its move. Returns false when no bot acted. */
  stepBot(): boolean {
    const seat = this.currentSeat();
    if (seat < 0) return false;
    const player = this.players[seat];
    if (!player?.isBot) return false;
    return this.autoMove(seat);
  }

  /**
   * Force a move for a seat using the game bot. Used both for bot seats and to
   * auto play for a human who runs out of time on the turn clock.
   */
  autoMove(seatIndex: number): boolean {
    if (this.isOver() || this.currentSeat() !== seatIndex) return false;
    const action = this.def.bot(this.state, seatIndex, this.rng);
    if (action === null) return false;
    return this.applyAction(seatIndex, action).ok;
  }

  private playerInfos(connected: Set<string>): GamePlayerInfo[] {
    return this.players.map((p) => ({
      seatIndex: p.seatIndex,
      userId: p.userId,
      displayName: p.displayName,
      avatarColor: p.avatarColor,
      isBot: p.isBot,
      isConnected: p.isBot ? true : p.userId !== null && connected.has(p.userId),
    }));
  }

  snapshotFor(
    userId: string | null,
    connected: Set<string>,
    turnDeadline: number | null,
  ): GameSnapshot {
    const seat = this.seatOf(userId);
    const current = this.currentSeat();
    const over = this.isOver();
    const legalActions =
      seat !== null && seat === current && !over
        ? (this.def.legalActions(this.state, seat) as unknown[])
        : null;
    return {
      gameId: this.gameId,
      status: over ? 'finished' : 'active',
      turn: current,
      yourSeat: seat,
      state: this.def.view(this.state, seat),
      legalActions,
      result: this.result(),
      log: this.log,
      players: this.playerInfos(connected),
      turnDeadline: over ? null : turnDeadline,
    };
  }
}

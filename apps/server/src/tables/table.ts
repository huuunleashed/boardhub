import {
  CHAT_MAX_LENGTH,
  MAX_SEATS,
  type ChatMessage,
  type GameId,
  type SpectatorInfo,
  type TableOptions,
  type TableSeat,
  type TableState,
  type TableStatus,
  type TableSummary,
  normalizeText,
} from '@boardhub/shared';
import { getGame } from '@boardhub/engine';
import { newId } from '../util/ids.js';
import { GameRunner, type RunnerPlayer } from './gameRunner.js';

export interface SeatUser {
  userId: string;
  displayName: string;
  avatarColor: string;
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

const BOT_COLOR = '#6b7280';
const CHAT_HISTORY = 60;

function emptySeat(index: number): TableSeat {
  return {
    index,
    userId: null,
    displayName: null,
    avatarColor: null,
    isReady: false,
    isBot: false,
    isConnected: false,
  };
}

export interface TableInit {
  id: string;
  code: string;
  name: string;
  gameId: GameId;
  hostId: string;
  isPrivate: boolean;
  options: TableOptions;
}

export class Table {
  readonly id: string;
  readonly code: string;
  name: string;
  readonly gameId: GameId;
  readonly gameName: string;
  hostId: string;
  isPrivate: boolean;
  status: TableStatus = 'lobby';
  options: TableOptions;
  readonly capacity: number;
  readonly minPlayers: number;
  readonly seats: TableSeat[];
  readonly spectators = new Map<string, SpectatorInfo>();
  readonly chat: ChatMessage[] = [];
  readonly createdAt = Date.now();
  runner: GameRunner | null = null;
  turnDeadline: number | null = null;
  finishedRecorded = false;
  rematchCount = 0;
  private readonly connections = new Map<string, Set<string>>();
  private readonly rematchVotes = new Set<string>();
  private botCounter = 0;

  constructor(init: TableInit) {
    const def = getGame(init.gameId);
    if (!def) throw new Error(`Không tìm thấy game: ${init.gameId}`);
    this.id = init.id;
    this.code = init.code;
    this.name = init.name;
    this.gameId = init.gameId;
    this.gameName = def.meta.name;
    this.hostId = init.hostId;
    this.isPrivate = init.isPrivate;
    this.options = init.options;
    this.capacity = Math.min(def.meta.maxPlayers, MAX_SEATS);
    this.minPlayers = def.meta.minPlayers;
    this.seats = Array.from({ length: this.capacity }, (_, i) => emptySeat(i));
  }

  /* --------------------------- presence tracking --------------------------- */

  markConnected(user: SeatUser, socketId: string): void {
    const set = this.connections.get(user.userId) ?? new Set<string>();
    set.add(socketId);
    this.connections.set(user.userId, set);
    const seat = this.seats.find((s) => s.userId === user.userId);
    if (seat) {
      seat.isConnected = true;
      seat.displayName = user.displayName;
      seat.avatarColor = user.avatarColor;
    }
  }

  markDisconnected(userId: string, socketId: string): void {
    const set = this.connections.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.connections.delete(userId);
      const seat = this.seats.find((s) => s.userId === userId);
      if (seat) seat.isConnected = false;
    }
  }

  connectedUserIds(): Set<string> {
    return new Set(this.connections.keys());
  }

  isConnected(userId: string): boolean {
    return this.connections.has(userId);
  }

  /* ------------------------------- spectators ------------------------------ */

  addSpectator(user: SeatUser): void {
    if (this.seats.some((s) => s.userId === user.userId)) return;
    this.spectators.set(user.userId, {
      userId: user.userId,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
    });
  }

  removeSpectator(userId: string): void {
    this.spectators.delete(userId);
  }

  /* --------------------------------- seats --------------------------------- */

  seatOfUser(userId: string): TableSeat | undefined {
    return this.seats.find((s) => s.userId === userId);
  }

  occupiedSeats(): TableSeat[] {
    return this.seats.filter((s) => s.userId !== null || s.isBot);
  }

  sit(user: SeatUser, seatIndex?: number): MutationResult {
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu, không thể ngồi vào.' };
    let target: TableSeat | undefined;
    if (seatIndex !== undefined) {
      target = this.seats[seatIndex];
      if (!target) return { ok: false, error: 'Ghế không hợp lệ.' };
      if ((target.userId && target.userId !== user.userId) || target.isBot) {
        return { ok: false, error: 'Ghế đã có người.' };
      }
    } else {
      target = this.seats.find((s) => !s.userId && !s.isBot);
      if (!target) return { ok: false, error: 'Bàn đã đầy.' };
    }
    // Vacate any previous seat for this user.
    const previous = this.seatOfUser(user.userId);
    if (previous && previous.index !== target.index) {
      Object.assign(previous, emptySeat(previous.index));
    }
    target.userId = user.userId;
    target.displayName = user.displayName;
    target.avatarColor = user.avatarColor;
    target.isBot = false;
    target.isReady = false;
    target.isConnected = this.isConnected(user.userId);
    this.spectators.delete(user.userId);
    return { ok: true };
  }

  stand(userId: string): MutationResult {
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    const seat = this.seatOfUser(userId);
    if (!seat) return { ok: false, error: 'Bạn không ngồi ở ghế nào.' };
    Object.assign(seat, emptySeat(seat.index));
    return { ok: true };
  }

  addBot(actingUserId: string, seatIndex?: number): MutationResult {
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    if (actingUserId !== this.hostId) return { ok: false, error: 'Chỉ chủ bàn thêm được máy.' };
    const def = getGame(this.gameId);
    if (!def?.meta.supportsBots) return { ok: false, error: 'Game này không hỗ trợ máy.' };
    let target: TableSeat | undefined;
    if (seatIndex !== undefined) {
      target = this.seats[seatIndex];
      if (!target || target.userId || target.isBot) {
        return { ok: false, error: 'Ghế đã có người.' };
      }
    } else {
      target = this.seats.find((s) => !s.userId && !s.isBot);
      if (!target) return { ok: false, error: 'Bàn đã đầy.' };
    }
    this.botCounter += 1;
    target.isBot = true;
    target.userId = null;
    target.displayName = `Máy ${this.botCounter}`;
    target.avatarColor = BOT_COLOR;
    target.isReady = true;
    target.isConnected = true;
    return { ok: true };
  }

  removeBot(actingUserId: string, seatIndex: number): MutationResult {
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    if (actingUserId !== this.hostId) return { ok: false, error: 'Chỉ chủ bàn xóa được máy.' };
    const seat = this.seats[seatIndex];
    if (!seat || !seat.isBot) return { ok: false, error: 'Ghế đó không phải máy.' };
    Object.assign(seat, emptySeat(seat.index));
    return { ok: true };
  }

  kick(actingUserId: string, seatIndex: number): MutationResult {
    if (actingUserId !== this.hostId) return { ok: false, error: 'Chỉ chủ bàn mới đuổi được.' };
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    const seat = this.seats[seatIndex];
    if (!seat || (!seat.userId && !seat.isBot)) return { ok: false, error: 'Ghế trống.' };
    if (seat.userId === this.hostId) return { ok: false, error: 'Không thể đuổi chủ bàn.' };
    if (seat.userId) this.addSpectatorFromSeat(seat);
    Object.assign(seat, emptySeat(seat.index));
    return { ok: true };
  }

  private addSpectatorFromSeat(seat: TableSeat): void {
    if (seat.userId && seat.displayName && seat.avatarColor) {
      this.spectators.set(seat.userId, {
        userId: seat.userId,
        displayName: seat.displayName,
        avatarColor: seat.avatarColor,
      });
    }
  }

  setReady(userId: string, ready: boolean): MutationResult {
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    const seat = this.seatOfUser(userId);
    if (!seat) return { ok: false, error: 'Bạn chưa ngồi vào ghế.' };
    seat.isReady = ready;
    return { ok: true };
  }

  setOptions(actingUserId: string, patch: Partial<TableOptions>): MutationResult {
    if (actingUserId !== this.hostId) return { ok: false, error: 'Chỉ chủ bàn đổi được tùy chọn.' };
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    if (typeof patch.turnSeconds === 'number') {
      this.options.turnSeconds = Math.max(0, Math.min(600, Math.round(patch.turnSeconds)));
    }
    if (typeof patch.allowSpectators === 'boolean') {
      this.options.allowSpectators = patch.allowSpectators;
    }
    if (typeof patch.name === 'string') {
      this.name = normalizeText(patch.name).slice(0, 40) || this.name;
    }
    return { ok: true };
  }

  /* --------------------------------- play ---------------------------------- */

  canStart(actingUserId: string): MutationResult {
    if (actingUserId !== this.hostId) return { ok: false, error: 'Chỉ chủ bàn bắt đầu được.' };
    if (this.status !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu.' };
    const occupied = this.occupiedSeats();
    if (occupied.length < this.minPlayers) {
      return { ok: false, error: `Cần ít nhất ${this.minPlayers} người chơi.` };
    }
    const humansNotReady = occupied.filter((s) => s.userId && !s.isReady);
    if (humansNotReady.length > 0) {
      return { ok: false, error: 'Tất cả người chơi phải sẵn sàng.' };
    }
    return { ok: true };
  }

  start(actingUserId: string): MutationResult {
    const check = this.canStart(actingUserId);
    if (!check.ok) return check;
    const players: RunnerPlayer[] = this.occupiedSeats().map((seat, engineSeat) => ({
      seatIndex: engineSeat,
      userId: seat.userId,
      displayName: seat.displayName ?? (seat.isBot ? 'Máy' : 'Người chơi'),
      avatarColor: seat.avatarColor ?? BOT_COLOR,
      isBot: seat.isBot,
    }));
    const seed = `${this.id}:${this.rematchCount}:${Date.now()}`;
    this.runner = new GameRunner(this.gameId, players, this.options, seed);
    this.status = 'playing';
    this.finishedRecorded = false;
    this.rematchVotes.clear();
    return { ok: true };
  }

  handleAction(userId: string, action: unknown): MutationResult {
    if (this.status !== 'playing' || !this.runner) {
      return { ok: false, error: 'Chưa vào ván.' };
    }
    const seat = this.runner.seatOf(userId);
    if (seat === null) return { ok: false, error: 'Bạn không phải người chơi trong ván này.' };
    return this.runner.applyAction(seat, action);
  }

  refreshStatusFromRunner(): void {
    if (this.runner && this.runner.isOver()) {
      this.status = 'finished';
      this.turnDeadline = null;
    }
  }

  voteRematch(userId: string): { ok: boolean; restart: boolean; error?: string } {
    if (this.status !== 'finished') return { ok: false, restart: false, error: 'Ván chưa kết thúc.' };
    const isPlayer = this.runner?.players.some((p) => p.userId === userId);
    if (!isPlayer) return { ok: false, restart: false, error: 'Chỉ người chơi mới đấu lại được.' };
    this.rematchVotes.add(userId);
    const humanPlayers = this.runner?.players.filter((p) => !p.isBot && p.userId) ?? [];
    const everyone = humanPlayers.every((p) => p.userId && this.rematchVotes.has(p.userId));
    if (everyone && humanPlayers.length > 0) {
      this.rematchCount += 1;
      // Re seat the same players from the previous runner.
      const players: RunnerPlayer[] = (this.runner?.players ?? []).map((p, engineSeat) => ({
        ...p,
        seatIndex: engineSeat,
      }));
      const seed = `${this.id}:${this.rematchCount}:${Date.now()}`;
      this.runner = new GameRunner(this.gameId, players, this.options, seed);
      this.status = 'playing';
      this.finishedRecorded = false;
      this.rematchVotes.clear();
      return { ok: true, restart: true };
    }
    return { ok: true, restart: false };
  }

  /* -------------------------------- chat ----------------------------------- */

  addChat(user: SeatUser | null, text: string, kind: 'user' | 'system' = 'user'): ChatMessage | null {
    if (typeof text !== 'string' || text.length > CHAT_MAX_LENGTH * 5) return null;
    const clean = normalizeText(text).slice(0, CHAT_MAX_LENGTH);
    if (!clean) return null;
    const message: ChatMessage = {
      id: newId(),
      tableId: this.id,
      userId: user?.userId ?? null,
      displayName: user?.displayName ?? 'Hệ thống',
      avatarColor: user?.avatarColor ?? BOT_COLOR,
      text: clean,
      ts: Date.now(),
      kind,
    };
    this.chat.push(message);
    if (this.chat.length > CHAT_HISTORY) this.chat.splice(0, this.chat.length - CHAT_HISTORY);
    return message;
  }

  /* ------------------------------- snapshots ------------------------------- */

  toState(): TableState {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      gameId: this.gameId,
      gameName: this.gameName,
      hostId: this.hostId,
      status: this.status,
      isPrivate: this.isPrivate,
      capacity: this.capacity,
      minPlayers: this.minPlayers,
      options: this.options,
      seats: this.seats.map((s) => ({ ...s })),
      spectators: [...this.spectators.values()],
      createdAt: this.createdAt,
    };
  }

  toSummary(): TableSummary {
    const host = this.seatOfUser(this.hostId);
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      gameId: this.gameId,
      gameName: this.gameName,
      hostId: this.hostId,
      hostName: host?.displayName ?? this.spectators.get(this.hostId)?.displayName ?? 'Chủ bàn',
      status: this.status,
      capacity: this.capacity,
      occupied: this.occupiedSeats().length,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt,
    };
  }

  isEmpty(): boolean {
    return this.connections.size === 0;
  }
}

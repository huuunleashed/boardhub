import type { Server } from 'socket.io';
import {
  ServerEvent,
  type CreateTableRequest,
  type GameResult,
  type MatchRecord,
  type TableOptions,
  type TableSummary,
  normalizeText,
} from '@boardhub/shared';
import { getGame } from '@boardhub/engine';
import { newId, newTableCode } from '../util/ids.js';
import { getStore } from '../store/index.js';
import { emptyStats } from '../store/types.js';
import { Table, type SeatUser } from './table.js';

const BOT_DELAY_MS = 650;
const EMPTY_TABLE_TTL_MS = 2 * 60 * 1000;
const LOBBY_ROOM = 'lobby';

function room(tableId: string): string {
  return `t:${tableId}`;
}

function defaultOptions(patch?: Partial<TableOptions>): TableOptions {
  return {
    turnSeconds: Math.max(0, Math.min(600, Math.round(patch?.turnSeconds ?? 0))),
    allowSpectators: patch?.allowSpectators ?? true,
  };
}

/**
 * Owns every live table and drives all real time broadcasting. The socket layer
 * is a thin wrapper that authenticates and forwards intents to these methods.
 */
export class TableManager {
  private readonly tables = new Map<string, Table>();
  private readonly codes = new Map<string, string>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly io: Server) {}

  /* ------------------------------- lookups --------------------------------- */

  getTable(id: string): Table | undefined {
    return this.tables.get(id);
  }

  findByCode(code: string): Table | undefined {
    const id = this.codes.get(code.toUpperCase());
    return id ? this.tables.get(id) : undefined;
  }

  resolve(idOrCode: { tableId?: string; code?: string }): Table | undefined {
    if (idOrCode.tableId) {
      const byId = this.tables.get(idOrCode.tableId);
      if (byId) return byId;
    }
    if (idOrCode.code) return this.findByCode(idOrCode.code);
    return undefined;
  }

  listPublicSummaries(): TableSummary[] {
    const out: TableSummary[] = [];
    for (const table of this.tables.values()) {
      if (table.isPrivate) continue;
      out.push(table.toSummary());
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }

  /* ----------------------------- table lifecycle --------------------------- */

  createTable(host: SeatUser, req: CreateTableRequest): Table {
    const def = getGame(req.gameId);
    if (!def) throw new Error('Game không tồn tại.');
    let code = newTableCode();
    while (this.codes.has(code)) code = newTableCode();
    const name = normalizeText(req.name ?? '').slice(0, 40) || `Bàn ${def.meta.name}`;
    const table = new Table({
      id: newId(),
      code,
      name,
      gameId: req.gameId,
      hostId: host.userId,
      isPrivate: req.isPrivate ?? false,
      options: defaultOptions(req.options),
    });
    table.sit(host, 0);
    this.tables.set(table.id, table);
    this.codes.set(code, table.id);
    this.emitLobby();
    return table;
  }

  private removeTable(table: Table, reason: string): void {
    this.clearTimer(table.id);
    const cleanup = this.cleanupTimers.get(table.id);
    if (cleanup) {
      clearTimeout(cleanup);
      this.cleanupTimers.delete(table.id);
    }
    this.io.to(room(table.id)).emit(ServerEvent.TableClosed, { tableId: table.id, reason });
    this.tables.delete(table.id);
    this.codes.delete(table.code);
    this.emitLobby();
  }

  /* ------------------------------ broadcasting ----------------------------- */

  emitLobby(): void {
    this.io.to(LOBBY_ROOM).emit(ServerEvent.LobbyList, this.listPublicSummaries());
  }

  emitTableState(table: Table): void {
    this.io.to(room(table.id)).emit(ServerEvent.TableState, table.toState());
    this.emitLobby();
  }

  async emitSnapshots(table: Table): Promise<void> {
    if (!table.runner) return;
    const connected = table.connectedUserIds();
    const sockets = await this.io.in(room(table.id)).fetchSockets();
    for (const socket of sockets) {
      const user = socket.data.user as SeatUser | undefined;
      socket.emit(
        ServerEvent.GameSnapshot,
        table.runner.snapshotFor(user?.userId ?? null, connected, table.turnDeadline),
      );
    }
  }

  /* -------------------------------- joining -------------------------------- */

  join(socket: import('socket.io').Socket, user: SeatUser, table: Table): void {
    const cleanup = this.cleanupTimers.get(table.id);
    if (cleanup) {
      clearTimeout(cleanup);
      this.cleanupTimers.delete(table.id);
    }
    socket.join(room(table.id));
    socket.data.tableId = table.id;
    table.markConnected(user, socket.id);
    const seated = table.seatOfUser(user.userId);
    if (!seated && table.status === 'lobby' && table.options.allowSpectators) {
      table.addSpectator(user);
    } else if (!seated && !table.options.allowSpectators && table.status !== 'lobby') {
      // Spectators disabled mid game: still allow viewing but do not seat.
      table.addSpectator(user);
    } else if (!seated) {
      table.addSpectator(user);
    }
    socket.emit(ServerEvent.TableState, table.toState());
    socket.emit(ServerEvent.ChatHistory, table.chat);
    if (table.runner) {
      socket.emit(
        ServerEvent.GameSnapshot,
        table.runner.snapshotFor(user.userId, table.connectedUserIds(), table.turnDeadline),
      );
    }
    this.emitTableState(table);
  }

  hardLeave(socket: import('socket.io').Socket, user: SeatUser): void {
    const tableId = socket.data.tableId as string | undefined;
    if (!tableId) return;
    const table = this.tables.get(tableId);
    socket.leave(room(tableId));
    socket.data.tableId = undefined;
    if (!table) return;
    if (table.status === 'lobby') table.stand(user.userId);
    table.removeSpectator(user.userId);
    table.markDisconnected(user.userId, socket.id);
    this.handleHostDeparture(table, user.userId);
    if (this.tables.has(table.id)) this.emitTableState(table);
  }

  softLeave(socket: import('socket.io').Socket, user: SeatUser): void {
    const tableId = socket.data.tableId as string | undefined;
    if (!tableId) return;
    const table = this.tables.get(tableId);
    if (!table) return;
    table.markDisconnected(user.userId, socket.id);
    if (!table.seatOfUser(user.userId)) {
      table.removeSpectator(user.userId);
    }
    if (table.isEmpty()) {
      this.scheduleEmptyCleanup(table);
    }
    this.emitTableState(table);
  }

  private handleHostDeparture(table: Table, leavingUserId: string): void {
    if (table.hostId !== leavingUserId) {
      this.afterEmptyCheck(table);
      return;
    }
    // Promote a connected seated human, then any connected spectator.
    const candidate =
      table.seats.find((s) => s.userId && s.userId !== leavingUserId && table.isConnected(s.userId)) ??
      null;
    const spectator = [...table.spectators.values()].find((s) => table.isConnected(s.userId));
    if (candidate?.userId) {
      table.hostId = candidate.userId;
    } else if (spectator) {
      table.hostId = spectator.userId;
    } else {
      this.afterEmptyCheck(table);
      return;
    }
    table.addChat(null, 'Chủ bàn mới đã được chỉ định.', 'system');
  }

  private afterEmptyCheck(table: Table): void {
    if (table.isEmpty()) {
      this.scheduleEmptyCleanup(table);
    }
  }

  private scheduleEmptyCleanup(table: Table): void {
    if (this.cleanupTimers.has(table.id)) return;
    const timer = setTimeout(() => {
      this.cleanupTimers.delete(table.id);
      const current = this.tables.get(table.id);
      if (current && current.isEmpty()) {
        this.removeTable(current, 'Bàn trống đã được dọn.');
      }
    }, EMPTY_TABLE_TTL_MS);
    this.cleanupTimers.set(table.id, timer);
  }

  /* ------------------------------ game driving ----------------------------- */

  private clearTimer(tableId: string): void {
    const timer = this.timers.get(tableId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(tableId);
    }
  }

  /** Called after any state changing game event: refresh, record, broadcast, schedule. */
  async afterGameEvent(table: Table): Promise<void> {
    try {
      const wasPlaying = table.status === 'playing';
      table.refreshStatusFromRunner();
      if (wasPlaying && table.status === 'finished') {
        await this.recordMatch(table);
        table.addChat(null, 'Ván đấu kết thúc.', 'system');
        this.emitTableState(table);
      }
      await this.emitSnapshots(table);
      this.scheduleNext(table);
    } catch (err) {
      console.error('[afterGameEvent]', err);
    }
  }

  private scheduleNext(table: Table): void {
    this.clearTimer(table.id);
    if (table.status !== 'playing' || !table.runner) {
      table.turnDeadline = null;
      return;
    }
    if (table.runner.isCurrentBot()) {
      table.turnDeadline = null;
      const timer = setTimeout(() => {
        this.timers.delete(table.id);
        const current = this.tables.get(table.id);
        if (!current?.runner) return;
        if (current.runner.stepBot()) {
          void this.afterGameEvent(current);
        }
      }, BOT_DELAY_MS);
      this.timers.set(table.id, timer);
      return;
    }
    if (table.options.turnSeconds > 0) {
      const seat = table.runner.currentSeat();
      table.turnDeadline = Date.now() + table.options.turnSeconds * 1000;
      const timer = setTimeout(() => {
        this.timers.delete(table.id);
        const current = this.tables.get(table.id);
        if (!current?.runner) return;
        if (current.runner.autoMove(seat)) {
          current.addChat(null, 'Một người chơi hết giờ, hệ thống đi thay.', 'system');
          this.emitTableState(current);
          void this.afterGameEvent(current);
        }
      }, table.options.turnSeconds * 1000);
      this.timers.set(table.id, timer);
    } else {
      table.turnDeadline = null;
    }
  }

  private async recordMatch(table: Table): Promise<void> {
    if (table.finishedRecorded || !table.runner) return;
    table.finishedRecorded = true;
    const result = table.runner.result();
    if (!result) return;
    const store = getStore();
    const players = table.runner.players;
    const playedAt = Date.now();
    for (const player of players) {
      if (player.isBot || !player.userId) continue;
      const outcome = this.outcomeFor(result, player.seatIndex);
      const opponents = players.filter((p) => p.seatIndex !== player.seatIndex).map((p) => p.displayName);
      const record: MatchRecord = {
        id: newId(),
        gameId: table.gameId,
        gameName: table.gameName,
        playedAt,
        result: outcome,
        opponents,
        seatIndex: player.seatIndex,
        scores: result.scores,
      };
      await store.addMatch(player.userId, record);
      await this.bumpStats(player.userId, table.gameId, outcome);
    }
  }

  private outcomeFor(result: GameResult, seatIndex: number): 'win' | 'loss' | 'draw' {
    if (result.kind === 'draw') return 'draw';
    return result.winners.includes(seatIndex) ? 'win' : 'loss';
  }

  private async bumpStats(
    userId: string,
    gameId: string,
    outcome: 'win' | 'loss' | 'draw',
  ): Promise<void> {
    const store = getStore();
    const user = await store.getUserById(userId);
    if (!user) return;
    const stats = user.stats ?? emptyStats();
    stats.gamesPlayed += 1;
    if (outcome === 'win') stats.gamesWon += 1;
    const per = stats.byGame[gameId] ?? { played: 0, won: 0 };
    per.played += 1;
    if (outcome === 'win') per.won += 1;
    stats.byGame[gameId] = per;
    await store.updateUser(userId, { stats });
  }

  /* ----------------------------- intent handlers --------------------------- */

  private bump(table: Table): void {
    this.emitTableState(table);
  }

  sit(table: Table, user: SeatUser, seatIndex?: number): string | null {
    const res = table.sit(user, seatIndex);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? 'Không thể ngồi.';
  }

  stand(table: Table, user: SeatUser): string | null {
    const res = table.stand(user.userId);
    if (res.ok) {
      table.addSpectator(user);
      this.bump(table);
    }
    return res.ok ? null : res.error ?? null;
  }

  addBot(table: Table, user: SeatUser, seatIndex?: number): string | null {
    const res = table.addBot(user.userId, seatIndex);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? null;
  }

  removeBot(table: Table, user: SeatUser, seatIndex: number): string | null {
    const res = table.removeBot(user.userId, seatIndex);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? null;
  }

  ready(table: Table, user: SeatUser, ready: boolean): string | null {
    const res = table.setReady(user.userId, ready);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? null;
  }

  setOptions(table: Table, user: SeatUser, patch: Partial<TableOptions>): string | null {
    const res = table.setOptions(user.userId, patch);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? null;
  }

  kick(table: Table, user: SeatUser, seatIndex: number): string | null {
    const res = table.kick(user.userId, seatIndex);
    if (res.ok) this.bump(table);
    return res.ok ? null : res.error ?? null;
  }

  start(table: Table, user: SeatUser): string | null {
    const res = table.start(user.userId);
    if (!res.ok) return res.error ?? 'Không thể bắt đầu.';
    table.addChat(null, 'Ván đấu bắt đầu.', 'system');
    this.emitTableState(table);
    void this.afterGameEvent(table);
    return null;
  }

  action(table: Table, user: SeatUser, action: unknown): string | null {
    const res = table.handleAction(user.userId, action);
    if (!res.ok) return res.error ?? 'Nước đi không hợp lệ.';
    void this.afterGameEvent(table);
    return null;
  }

  rematch(table: Table, user: SeatUser): string | null {
    const res = table.voteRematch(user.userId);
    if (!res.ok) return res.error ?? null;
    if (res.restart) {
      table.addChat(null, 'Ván đấu mới bắt đầu.', 'system');
      this.emitTableState(table);
      void this.afterGameEvent(table);
    } else {
      table.addChat(user, 'muốn đấu lại.', 'system');
      this.emitTableState(table);
    }
    return null;
  }

  chat(table: Table, user: SeatUser, text: string): void {
    const message = table.addChat(user, text);
    if (message) this.io.to(room(table.id)).emit(ServerEvent.ChatMessage, message);
  }
}

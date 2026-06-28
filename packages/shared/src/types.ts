/**
 * Core domain types shared across the platform.
 */

export type UserId = string;
export type TableId = string;

/** Identifier of a game registered in the engine, for example "oxono". */
export type GameId = string;

export interface PerGameRecord {
  played: number;
  won: number;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  byGame: Record<GameId, PerGameRecord>;
}

export interface UserProfile {
  id: UserId;
  username: string;
  displayName: string;
  isGuest: boolean;
  avatarColor: string;
  bio: string;
  createdAt: number;
  stats: UserStats;
}

/** A finished game as stored in a player's history. */
export interface MatchRecord {
  id: string;
  gameId: GameId;
  gameName: string;
  playedAt: number;
  result: 'win' | 'loss' | 'draw';
  opponents: string[];
  seatIndex: number;
  scores?: number[];
}

export type TableStatus = 'lobby' | 'playing' | 'finished';

export interface TableSeat {
  index: number;
  userId: UserId | null;
  displayName: string | null;
  avatarColor: string | null;
  isReady: boolean;
  isBot: boolean;
  isConnected: boolean;
}

export interface TableOptions {
  /** Seconds allowed per turn. 0 means no clock. */
  turnSeconds: number;
  /** Whether spectators may watch the table. */
  allowSpectators: boolean;
  [key: string]: unknown;
}

export interface TableSummary {
  id: TableId;
  code: string;
  name: string;
  gameId: GameId;
  gameName: string;
  hostId: UserId;
  hostName: string;
  status: TableStatus;
  capacity: number;
  occupied: number;
  isPrivate: boolean;
  createdAt: number;
}

export interface SpectatorInfo {
  userId: UserId;
  displayName: string;
  avatarColor: string;
}

export interface TableState {
  id: TableId;
  code: string;
  name: string;
  gameId: GameId;
  gameName: string;
  hostId: UserId;
  status: TableStatus;
  isPrivate: boolean;
  capacity: number;
  minPlayers: number;
  options: TableOptions;
  seats: TableSeat[];
  spectators: SpectatorInfo[];
  createdAt: number;
}

export type ChatKind = 'user' | 'system';

export interface ChatMessage {
  id: string;
  tableId: TableId;
  userId: UserId | null;
  displayName: string;
  avatarColor: string;
  text: string;
  ts: number;
  kind: ChatKind;
}

export interface GameLogEntry {
  id: string;
  ts: number;
  text: string;
  seatIndex?: number;
}

export interface GameResult {
  kind: 'win' | 'draw';
  winners: number[];
  scores?: number[];
  reason?: string;
}

export interface GamePlayerInfo {
  seatIndex: number;
  userId: UserId | null;
  displayName: string;
  avatarColor: string;
  isBot: boolean;
  isConnected: boolean;
}

/**
 * The per player snapshot of a live game. `state` is the visibility filtered
 * view produced by the game definition, so hidden information stays hidden.
 */
export interface GameSnapshot {
  gameId: GameId;
  status: 'active' | 'finished';
  turn: number;
  yourSeat: number | null;
  state: unknown;
  legalActions: unknown[] | null;
  result: GameResult | null;
  log: GameLogEntry[];
  players: GamePlayerInfo[];
  turnDeadline: number | null;
}

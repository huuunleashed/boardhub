/**
 * Wire protocol shared by the server and the web client. Covers both the REST
 * surface (auth, profile, table listings) and the Socket.IO event contract.
 */

import type {
  ChatMessage,
  GameId,
  GameSnapshot,
  MatchRecord,
  TableOptions,
  TableState,
  TableSummary,
  UserProfile,
} from './types.js';

/* ------------------------------- REST: auth ------------------------------- */

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface GuestRequest {
  displayName?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarColor?: string;
}

export interface ProfileResponse {
  user: UserProfile;
  matches: MatchRecord[];
}

/* ------------------------------ REST: catalog ----------------------------- */

export interface GameCatalogEntry {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  hasHiddenInfo: boolean;
  supportsBots: boolean;
}

export interface CreateTableRequest {
  gameId: GameId;
  name?: string;
  isPrivate?: boolean;
  options?: Partial<TableOptions>;
}

export interface CreateTableResponse {
  table: TableState;
}

export interface TableListResponse {
  tables: TableSummary[];
}

export interface ApiError {
  error: string;
  code?: string;
}

/* ----------------------------- Socket.IO events --------------------------- */

/** Events emitted by the client to the server. */
export const ClientEvent = {
  TableJoin: 'table:join',
  TableLeave: 'table:leave',
  TableSit: 'table:sit',
  TableStand: 'table:stand',
  TableAddBot: 'table:addBot',
  TableRemoveBot: 'table:removeBot',
  TableReady: 'table:ready',
  TableSetOptions: 'table:setOptions',
  TableStart: 'table:start',
  TableKick: 'table:kick',
  GameAction: 'game:action',
  GameRematch: 'game:rematch',
  ChatSend: 'chat:send',
  LobbySubscribe: 'lobby:subscribe',
  LobbyUnsubscribe: 'lobby:unsubscribe',
} as const;

/** Events emitted by the server to clients. */
export const ServerEvent = {
  TableState: 'table:state',
  TableClosed: 'table:closed',
  GameSnapshot: 'game:snapshot',
  ChatMessage: 'chat:message',
  ChatHistory: 'chat:history',
  LobbyList: 'lobby:list',
  Toast: 'toast',
  ActionError: 'action:error',
} as const;

export interface JoinTablePayload {
  tableId?: TableId;
  code?: string;
}

export interface SitPayload {
  seatIndex: number;
}

export interface BotPayload {
  seatIndex: number;
}

export interface ReadyPayload {
  ready: boolean;
}

export interface SetOptionsPayload {
  options: Partial<TableOptions>;
}

export interface KickPayload {
  seatIndex: number;
}

export interface GameActionPayload {
  action: unknown;
}

export interface ChatSendPayload {
  text: string;
}

export interface ToastPayload {
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ActionErrorPayload {
  message: string;
  code?: string;
}

/** Map of server to client events to their payload type, for typed clients. */
export interface ServerToClientEvents {
  [ServerEvent.TableState]: (state: TableState) => void;
  [ServerEvent.TableClosed]: (payload: { tableId: TableId; reason: string }) => void;
  [ServerEvent.GameSnapshot]: (snapshot: GameSnapshot) => void;
  [ServerEvent.ChatMessage]: (message: ChatMessage) => void;
  [ServerEvent.ChatHistory]: (messages: ChatMessage[]) => void;
  [ServerEvent.LobbyList]: (tables: TableSummary[]) => void;
  [ServerEvent.Toast]: (payload: ToastPayload) => void;
  [ServerEvent.ActionError]: (payload: ActionErrorPayload) => void;
}

export interface ClientToServerEvents {
  [ClientEvent.TableJoin]: (payload: JoinTablePayload) => void;
  [ClientEvent.TableLeave]: () => void;
  [ClientEvent.TableSit]: (payload: SitPayload) => void;
  [ClientEvent.TableStand]: () => void;
  [ClientEvent.TableAddBot]: (payload: BotPayload) => void;
  [ClientEvent.TableRemoveBot]: (payload: BotPayload) => void;
  [ClientEvent.TableReady]: (payload: ReadyPayload) => void;
  [ClientEvent.TableSetOptions]: (payload: SetOptionsPayload) => void;
  [ClientEvent.TableStart]: () => void;
  [ClientEvent.TableKick]: (payload: KickPayload) => void;
  [ClientEvent.GameAction]: (payload: GameActionPayload) => void;
  [ClientEvent.GameRematch]: () => void;
  [ClientEvent.ChatSend]: (payload: ChatSendPayload) => void;
  [ClientEvent.LobbySubscribe]: () => void;
  [ClientEvent.LobbyUnsubscribe]: () => void;
}

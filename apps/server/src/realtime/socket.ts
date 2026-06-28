import type { Server, Socket } from 'socket.io';
import {
  ClientEvent,
  ServerEvent,
  type BotPayload,
  type ChatSendPayload,
  type GameActionPayload,
  type JoinTablePayload,
  type KickPayload,
  type ReadyPayload,
  type SetOptionsPayload,
  type SitPayload,
} from '@boardhub/shared';
import { getProfileById } from '../auth/service.js';
import { verifyToken } from '../auth/tokens.js';
import type { SeatUser, Table } from '../tables/table.js';
import type { TableManager } from '../tables/manager.js';

function currentUser(socket: Socket): SeatUser | undefined {
  return socket.data.user as SeatUser | undefined;
}

function fail(socket: Socket, message: string): void {
  socket.emit(ServerEvent.ActionError, { message });
}

export function setupSocket(io: Server, manager: TableManager): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const userId = token ? verifyToken(token) : null;
    if (!userId) {
      next(new Error('unauthorized'));
      return;
    }
    const profile = await getProfileById(userId);
    if (!profile) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.user = {
      userId: profile.id,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
    } satisfies SeatUser;
    next();
  });

  io.on('connection', (socket) => {
    const user = currentUser(socket);
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const withTable = (fn: (table: Table, u: SeatUser) => void): void => {
      const tableId = socket.data.tableId as string | undefined;
      const table = tableId ? manager.getTable(tableId) : undefined;
      if (!table) {
        fail(socket, 'Bạn chưa ở trong bàn nào.');
        return;
      }
      fn(table, user);
    };

    socket.on(ClientEvent.LobbySubscribe, () => {
      socket.join('lobby');
      socket.emit(ServerEvent.LobbyList, manager.listPublicSummaries());
    });

    socket.on(ClientEvent.LobbyUnsubscribe, () => {
      socket.leave('lobby');
    });

    socket.on(ClientEvent.TableJoin, (payload: JoinTablePayload) => {
      const table = manager.resolve(payload ?? {});
      if (!table) {
        fail(socket, 'Không tìm thấy bàn.');
        return;
      }
      // Leave any previous table first.
      if (socket.data.tableId && socket.data.tableId !== table.id) {
        manager.hardLeave(socket, user);
      }
      manager.join(socket, user, table);
    });

    socket.on(ClientEvent.TableLeave, () => {
      manager.hardLeave(socket, user);
    });

    socket.on(ClientEvent.TableSit, (payload: SitPayload) => {
      withTable((table) => {
        const err = manager.sit(table, user, payload?.seatIndex);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableStand, () => {
      withTable((table) => {
        const err = manager.stand(table, user);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableAddBot, (payload: BotPayload) => {
      withTable((table) => {
        const err = manager.addBot(table, user, payload?.seatIndex);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableRemoveBot, (payload: BotPayload) => {
      withTable((table) => {
        const err = manager.removeBot(table, user, payload.seatIndex);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableReady, (payload: ReadyPayload) => {
      withTable((table) => {
        const err = manager.ready(table, user, Boolean(payload?.ready));
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableSetOptions, (payload: SetOptionsPayload) => {
      withTable((table) => {
        const err = manager.setOptions(table, user, payload?.options ?? {});
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableKick, (payload: KickPayload) => {
      withTable((table) => {
        const err = manager.kick(table, user, payload.seatIndex);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.TableStart, () => {
      withTable((table) => {
        const err = manager.start(table, user);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.GameAction, (payload: GameActionPayload) => {
      withTable((table) => {
        const err = manager.action(table, user, payload?.action);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.GameRematch, () => {
      withTable((table) => {
        const err = manager.rematch(table, user);
        if (err) fail(socket, err);
      });
    });

    socket.on(ClientEvent.ChatSend, (payload: ChatSendPayload) => {
      withTable((table) => {
        manager.chat(table, user, payload?.text ?? '');
      });
    });

    socket.on('disconnect', () => {
      manager.softLeave(socket, user);
    });
  });
}

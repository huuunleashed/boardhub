import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientEvent,
  ServerEvent,
  type ChatMessage,
  type GameSnapshot,
  type TableOptions,
  type TableState,
} from '@boardhub/shared';
import { useSocket } from '../state/SocketContext';
import { useToast } from '../state/ToastContext';

export interface UseTableResult {
  table: TableState | null;
  snapshot: GameSnapshot | null;
  chat: ChatMessage[];
  connected: boolean;
  closedReason: string | null;
  sit: (seatIndex?: number) => void;
  stand: () => void;
  addBot: (seatIndex?: number) => void;
  removeBot: (seatIndex: number) => void;
  setReady: (ready: boolean) => void;
  setOptions: (options: Partial<TableOptions>) => void;
  kick: (seatIndex: number) => void;
  start: () => void;
  sendAction: (action: unknown) => void;
  rematch: () => void;
  sendChat: (text: string) => void;
  leave: () => void;
}

/** Joins a table over the socket and exposes its live state plus action senders. */
export function useTable(idOrCode: string): UseTableResult {
  const { socket, connected } = useSocket();
  const toast = useToast();
  const [table, setTable] = useState<TableState | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const idRef = useRef(idOrCode);
  idRef.current = idOrCode;

  useEffect(() => {
    if (!socket) return;
    const join = (): void => {
      socket.emit(ClientEvent.TableJoin, { tableId: idRef.current, code: idRef.current });
    };

    const onState = (state: TableState): void => setTable(state);
    const onSnapshot = (snap: GameSnapshot): void => setSnapshot(snap);
    const onChatHistory = (messages: ChatMessage[]): void => setChat(messages);
    const onChat = (message: ChatMessage): void => setChat((prev) => [...prev, message].slice(-80));
    const onClosed = (payload: { tableId: string; reason: string }): void => {
      setClosedReason(payload.reason || 'Bàn đã đóng.');
    };
    const onError = (payload: { message: string }): void => toast.error(payload.message);

    socket.on(ServerEvent.TableState, onState);
    socket.on(ServerEvent.GameSnapshot, onSnapshot);
    socket.on(ServerEvent.ChatHistory, onChatHistory);
    socket.on(ServerEvent.ChatMessage, onChat);
    socket.on(ServerEvent.TableClosed, onClosed);
    socket.on(ServerEvent.ActionError, onError);
    socket.on('connect', join);

    join();

    return () => {
      socket.off(ServerEvent.TableState, onState);
      socket.off(ServerEvent.GameSnapshot, onSnapshot);
      socket.off(ServerEvent.ChatHistory, onChatHistory);
      socket.off(ServerEvent.ChatMessage, onChat);
      socket.off(ServerEvent.TableClosed, onClosed);
      socket.off(ServerEvent.ActionError, onError);
      socket.off('connect', join);
      setSnapshot(null);
    };
  }, [socket, idOrCode, toast]);

  const emit = useCallback(
    (event: string, payload?: unknown) => {
      if (!socket) {
        toast.warning('Đang kết nối lại, vui lòng đợi.');
        return;
      }
      (socket as unknown as { emit: (e: string, p?: unknown) => void }).emit(event, payload);
    },
    [socket, toast],
  );

  return {
    table,
    snapshot,
    chat,
    connected,
    closedReason,
    sit: (seatIndex) => emit(ClientEvent.TableSit, { seatIndex }),
    stand: () => emit(ClientEvent.TableStand),
    addBot: (seatIndex) => emit(ClientEvent.TableAddBot, { seatIndex }),
    removeBot: (seatIndex) => emit(ClientEvent.TableRemoveBot, { seatIndex }),
    setReady: (ready) => emit(ClientEvent.TableReady, { ready }),
    setOptions: (options) => emit(ClientEvent.TableSetOptions, { options }),
    kick: (seatIndex) => emit(ClientEvent.TableKick, { seatIndex }),
    start: () => emit(ClientEvent.TableStart),
    sendAction: (action) => emit(ClientEvent.GameAction, { action }),
    rematch: () => emit(ClientEvent.GameRematch),
    sendChat: (text) => emit(ClientEvent.ChatSend, { text }),
    leave: () => emit(ClientEvent.TableLeave),
  };
}

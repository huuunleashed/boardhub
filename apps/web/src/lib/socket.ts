import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@boardhub/shared';

export type BoardHubSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Create a Socket.IO connection authenticated with the session token. */
export function createSocket(token: string): BoardHubSocket {
  const url = import.meta.env.VITE_SERVER_URL || '/';
  return io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 600,
    reconnectionDelayMax: 4000,
  });
}

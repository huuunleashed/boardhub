import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSocket, type BoardHubSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: BoardHubSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<BoardHubSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setConnected(false);
      return;
    }
    const s = createSocket(token);
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setSocket(s);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [token]);

  const value = useMemo<SocketContextValue>(() => ({ socket, connected }), [socket, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket phải nằm trong SocketProvider');
  return ctx;
}

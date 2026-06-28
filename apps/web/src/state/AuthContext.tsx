import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '@boardhub/shared';
import { api, ApiError, getToken, setToken } from '../lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthed: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  guestLogin: (displayName?: string) => Promise<void>;
  logout: () => void;
  applyUser: (user: UserProfile) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const existing = getToken();
    if (!existing) {
      setLoading(false);
      return;
    }
    api
      .getMe()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setToken(null);
          setTokenState(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback((tok: string, profile: UserProfile) => {
    setToken(tok);
    setTokenState(tok);
    setUser(profile);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login({ username, password });
      apply(res.token, res.user);
    },
    [apply],
  );

  const register = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const res = await api.register({ username, password, displayName });
      apply(res.token, res.user);
    },
    [apply],
  );

  const guestLogin = useCallback(
    async (displayName?: string) => {
      const res = await api.guest({ displayName });
      apply(res.token, res.user);
    },
    [apply],
  );

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthed: Boolean(user),
      login,
      register,
      guestLogin,
      logout,
      applyUser: setUser,
      refresh,
    }),
    [user, token, loading, login, register, guestLogin, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

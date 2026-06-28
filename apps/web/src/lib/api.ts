import {
  TOKEN_STORAGE_KEY,
  type AuthResponse,
  type CreateTableRequest,
  type CreateTableResponse,
  type GameCatalogEntry,
  type GuestRequest,
  type LoginRequest,
  type ProfileResponse,
  type RegisterRequest,
  type TableListResponse,
  type TableState,
  type UpdateProfileRequest,
  type UserProfile,
} from '@boardhub/shared';

const BASE = import.meta.env.VITE_SERVER_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Lỗi ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  async getMe(): Promise<UserProfile> {
    const r = await request<{ user: UserProfile }>('/api/auth/me');
    return r.user;
  },
  register(body: RegisterRequest): Promise<AuthResponse> {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
  },
  login(body: LoginRequest): Promise<AuthResponse> {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },
  guest(body: GuestRequest): Promise<AuthResponse> {
    return request('/api/auth/guest', { method: 'POST', body: JSON.stringify(body) });
  },
  async updateProfile(body: UpdateProfileRequest): Promise<UserProfile> {
    const r = await request<{ user: UserProfile }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return r.user;
  },
  getProfile(id: string): Promise<ProfileResponse> {
    return request(`/api/profile/${id}`);
  },
  games(): Promise<GameCatalogEntry[]> {
    return request('/api/games');
  },
  tables(): Promise<TableListResponse> {
    return request('/api/tables');
  },
  createTable(body: CreateTableRequest): Promise<CreateTableResponse> {
    return request('/api/tables', { method: 'POST', body: JSON.stringify(body) });
  },
  getTable(id: string): Promise<{ table: TableState }> {
    return request(`/api/tables/${id}`);
  },
};

import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  normalizeText,
  pickAvatarColor,
  type UserProfile,
} from '@boardhub/shared';
import { newId } from '../util/ids.js';
import { getStore } from '../store/index.js';
import { emptyStats, toProfile, type UserRecord } from '../store/types.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { signToken } from './tokens.js';

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

function assertUsername(username: string): void {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    throw new AuthError(`Tên đăng nhập cần từ ${USERNAME_MIN} tới ${USERNAME_MAX} ký tự.`);
  }
  if (!USERNAME_RE.test(username)) {
    throw new AuthError('Tên đăng nhập chỉ gồm chữ, số, dấu chấm và gạch dưới.');
  }
}

function assertPassword(password: string): void {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new AuthError(`Mật khẩu cần từ ${PASSWORD_MIN} tới ${PASSWORD_MAX} ký tự.`);
  }
}

function cleanDisplayName(value: string | undefined, fallback: string): string {
  const name = normalizeText(value ?? '') || fallback;
  return name.slice(0, DISPLAY_NAME_MAX);
}

export interface AuthResult {
  token: string;
  user: UserProfile;
}

export async function register(
  username: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  const store = getStore();
  assertUsername(username);
  assertPassword(password);
  const existing = await store.getUserByUsername(username);
  if (existing) {
    throw new AuthError('Tên đăng nhập đã tồn tại.', 409);
  }
  const id = newId();
  const record: UserRecord = {
    id,
    username,
    displayName: cleanDisplayName(displayName, username),
    isGuest: false,
    passwordHash: await hashPassword(password),
    avatarColor: pickAvatarColor(id),
    bio: '',
    createdAt: Date.now(),
    stats: emptyStats(),
  };
  await store.createUser(record);
  return { token: signToken(id), user: toProfile(record) };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const store = getStore();
  const record = await store.getUserByUsername(username);
  if (!record || !record.passwordHash) {
    throw new AuthError('Sai tên đăng nhập hoặc mật khẩu.', 401);
  }
  const ok = await verifyPassword(password, record.passwordHash);
  if (!ok) {
    throw new AuthError('Sai tên đăng nhập hoặc mật khẩu.', 401);
  }
  return { token: signToken(record.id), user: toProfile(record) };
}

export async function guest(displayName?: string): Promise<AuthResult> {
  const store = getStore();
  const id = newId();
  const handle = `khach_${id.slice(0, 6)}`;
  const record: UserRecord = {
    id,
    username: handle,
    displayName: cleanDisplayName(displayName, 'Khách'),
    isGuest: true,
    passwordHash: null,
    avatarColor: pickAvatarColor(id),
    bio: '',
    createdAt: Date.now(),
    stats: emptyStats(),
  };
  await store.createUser(record);
  return { token: signToken(id), user: toProfile(record) };
}

export async function updateProfile(
  userId: string,
  patch: { displayName?: string; bio?: string; avatarColor?: string },
): Promise<UserProfile> {
  const store = getStore();
  const current = await store.getUserById(userId);
  if (!current) throw new AuthError('Không tìm thấy người dùng.', 404);
  const next: Partial<UserRecord> = {};
  if (patch.displayName !== undefined) {
    const name = normalizeText(patch.displayName);
    if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
      throw new AuthError(`Tên hiển thị cần từ ${DISPLAY_NAME_MIN} tới ${DISPLAY_NAME_MAX} ký tự.`);
    }
    next.displayName = name;
  }
  if (patch.bio !== undefined) {
    next.bio = normalizeText(patch.bio).slice(0, 280);
  }
  if (patch.avatarColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(patch.avatarColor)) {
    next.avatarColor = patch.avatarColor;
  }
  const updated = await store.updateUser(userId, next);
  if (!updated) throw new AuthError('Không tìm thấy người dùng.', 404);
  return toProfile(updated);
}

export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const record = await getStore().getUserById(userId);
  return record ? toProfile(record) : null;
}

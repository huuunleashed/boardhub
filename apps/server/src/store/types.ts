import type { MatchRecord, UserProfile, UserStats } from '@boardhub/shared';

/** A persisted user, including the secrets that never leave the server. */
export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  isGuest: boolean;
  passwordHash: string | null;
  avatarColor: string;
  bio: string;
  createdAt: number;
  stats: UserStats;
}

export function emptyStats(): UserStats {
  return { gamesPlayed: 0, gamesWon: 0, byGame: {} };
}

/** Strip secrets, producing the public profile shape sent to clients. */
export function toProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isGuest: user.isGuest,
    avatarColor: user.avatarColor,
    bio: user.bio,
    createdAt: user.createdAt,
    stats: user.stats,
  };
}

export interface Store {
  init(): Promise<void>;
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByUsername(username: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<void>;
  updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null>;
  addMatch(userId: string, match: MatchRecord): Promise<void>;
  getMatches(userId: string, limit?: number): Promise<MatchRecord[]>;
}

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { MatchRecord } from '@boardhub/shared';
import { config } from '../config.js';
import type { Store, UserRecord } from './types.js';

interface DbShape {
  users: Record<string, UserRecord>;
  usernames: Record<string, string>;
  matches: Record<string, MatchRecord[]>;
}

const MATCH_LIMIT = 50;

/**
 * Zero dependency persistence: a single JSON file on disk. Writes are serialized
 * through a promise chain and committed atomically with a temp file rename so a
 * crash mid write cannot corrupt the database.
 */
export class FileStore implements Store {
  private db: DbShape = { users: {}, usernames: {}, matches: {} };
  private readonly file: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(dataDir = config.dataDir) {
    this.file = join(dataDir, 'db.json');
  }

  async init(): Promise<void> {
    await mkdir(config.dataDir, { recursive: true });
    if (existsSync(this.file)) {
      try {
        const raw = await readFile(this.file, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DbShape>;
        this.db = {
          users: parsed.users ?? {},
          usernames: parsed.usernames ?? {},
          matches: parsed.matches ?? {},
        };
      } catch {
        // Corrupt or empty file: start fresh rather than crash.
        this.db = { users: {}, usernames: {}, matches: {} };
      }
    } else {
      await this.persist();
    }
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.db);
    this.writeChain = this.writeChain.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, 'utf8');
      await rename(tmp, this.file);
    });
    return this.writeChain;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.db.users[id] ?? null;
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const id = this.db.usernames[username.toLowerCase()];
    return id ? this.db.users[id] ?? null : null;
  }

  async createUser(user: UserRecord): Promise<void> {
    this.db.users[user.id] = user;
    this.db.usernames[user.username.toLowerCase()] = user.id;
    await this.persist();
  }

  async updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    const current = this.db.users[id];
    if (!current) return null;
    const updated: UserRecord = { ...current, ...patch, id: current.id };
    this.db.users[id] = updated;
    await this.persist();
    return updated;
  }

  async addMatch(userId: string, match: MatchRecord): Promise<void> {
    const list = this.db.matches[userId] ?? [];
    list.unshift(match);
    this.db.matches[userId] = list.slice(0, MATCH_LIMIT);
    await this.persist();
  }

  async getMatches(userId: string, limit = MATCH_LIMIT): Promise<MatchRecord[]> {
    return (this.db.matches[userId] ?? []).slice(0, limit);
  }
}

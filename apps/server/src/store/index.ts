import { config } from '../config.js';
import { FileStore } from './fileStore.js';
import type { Store } from './types.js';

let instance: Store | null = null;

/**
 * Select the persistence backend. Today this is the zero config file store. A
 * Postgres or Supabase adapter can be slotted in here when DATABASE_URL is set,
 * without touching the rest of the server.
 */
export function getStore(): Store {
  if (instance) return instance;
  if (config.databaseUrl) {
    // Placeholder for a future Postgres adapter. Fall back to the file store so
    // the server always starts even when a database is configured but absent.
    console.warn('[store] DATABASE_URL set but the Postgres adapter is not bundled yet; using the file store.');
  }
  instance = new FileStore();
  return instance;
}

export type { Store, UserRecord } from './types.js';

import { AVATAR_COLORS, TABLE_CODE_LENGTH } from './constants.js';

/** Characters used for join codes. Ambiguous glyphs (0/O, 1/I) are excluded. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a short, human readable join code such as "K7QP".
 * Not cryptographically secure, only meant to be easy to read and type.
 */
export function generateCode(length: number = TABLE_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Small non secure unique id with an optional prefix. */
export function randomId(prefix = ''): string {
  const part = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}${part}` : `${time}${part}`;
}

/** Deterministically pick a flat avatar color from a seed string. */
export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/** Collapse whitespace and trim a free text field. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** True when a value is a finite number. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format a unix millisecond timestamp as HH:MM for chat and logs. */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

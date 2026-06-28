/**
 * Platform wide constants shared by the server and the web client.
 */

export const APP_NAME = 'BoardHub';
export const APP_TAGLINE = 'San choi board game mien phi cho nguoi Viet';

/** Hard ceiling on seats at any table. Individual games may allow fewer. */
export const MAX_SEATS = 10;

/** Length of the human friendly join code printed on a table. */
export const TABLE_CODE_LENGTH = 4;

/** Maximum length of a single chat message. */
export const CHAT_MAX_LENGTH = 500;

/** Username and display name bounds. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 24;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 100;

/** Session token lifetime in seconds (30 days). */
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Curated flat avatar palette. No gradients, just honest solid colors. */
export const AVATAR_COLORS = [
  '#3b6ea5',
  '#b5532a',
  '#3f7d52',
  '#8a4f9e',
  '#b58b2a',
  '#2f8a8a',
  '#9e3f5f',
  '#5a6270',
  '#4c6b3c',
  '#7a4b8a',
] as const;

/** Storage key the web app uses for the session token. */
export const TOKEN_STORAGE_KEY = 'boardhub.token';

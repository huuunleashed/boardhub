/**
 * BoardHub game SDK. Every game is a pure, deterministic GameDefinition. The
 * server holds the authoritative full state and only ever hands each client a
 * visibility filtered view, so hidden information stays on the server.
 */

import type { GameResult } from '@boardhub/shared';

export type { GameResult };

/** Seedable random source so games and bots are reproducible and testable. */
export interface RNG {
  /** Float in the range [0, 1). */
  next(): number;
  /** Integer in the range [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Pick a random element from a non empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Fisher Yates shuffle in place, returns the same array. */
  shuffle<T>(arr: T[]): T[];
}

export interface EnginePlayer {
  seatIndex: number;
  userId: string | null;
  displayName: string;
  isBot: boolean;
}

export interface SetupContext {
  players: EnginePlayer[];
  options: Record<string, unknown>;
  rng: RNG;
}

export interface ActionContext {
  seatIndex: number;
  rng: RNG;
}

export interface ValidationResult {
  ok: boolean;
  /** Vietnamese error message shown to the player when ok is false. */
  error?: string;
}

export interface LogLine {
  text: string;
  seatIndex?: number;
}

export interface ReduceResult<S> {
  state: S;
  log: LogLine[];
}

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Short Vietnamese rule bullets shown on the game page. */
  rules: string[];
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  hasHiddenInfo: boolean;
  supportsBots: boolean;
}

/**
 * The contract every game implements.
 *
 * S is the full server side state, A is an action, V is a per player view.
 */
export interface GameDefinition<S = unknown, A = unknown, V = unknown> {
  meta: GameMeta;

  /** Build the initial state for a set of seated players. */
  setup(ctx: SetupContext): S;

  /** Seat index whose turn it is, or -1 when the game is over. */
  currentPlayer(state: S): number;

  /** Check whether an action is legal for the acting seat. */
  validate(state: S, action: A, ctx: ActionContext): ValidationResult;

  /** Apply a validated action, returning the next state and log lines. */
  reduce(state: S, action: A, ctx: ActionContext): ReduceResult<S>;

  /** Whether the game has ended. */
  isTerminal(state: S): boolean;

  /** Final result, or null while the game is still running. */
  getResult(state: S): GameResult | null;

  /** Visibility filtered view for a seat, or for a spectator when seat is null. */
  view(state: S, seatIndex: number | null): V;

  /** Enumerate legal actions for a seat. Used by bots and the client. */
  legalActions(state: S, seatIndex: number): A[];

  /** Choose an action for a bot seat, or null when it cannot move. */
  bot(state: S, seatIndex: number, rng: RNG): A | null;
}

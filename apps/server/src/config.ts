import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

// Load the single .env at the repository root if present.
loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: num(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  /** Comma separated allowlist. Empty means reflect any origin (LAN and Tailscale dev). */
  corsOrigin: (process.env.CORS_ORIGIN ?? '').trim(),
  databaseUrl: (process.env.DATABASE_URL ?? '').trim(),
  dataDir: fileURLToPath(new URL('../data', import.meta.url)),
} as const;

export function corsOrigins(): string[] | true {
  if (!config.corsOrigin) return true;
  return config.corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

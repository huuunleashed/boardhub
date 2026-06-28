import jwt from 'jsonwebtoken';
import { TOKEN_TTL_SECONDS } from '@boardhub/shared';
import { config } from '../config.js';

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

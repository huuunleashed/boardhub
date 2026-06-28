import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DISPLAY_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  type GameCatalogEntry,
} from '@boardhub/shared';
import { listGameMeta } from '@boardhub/engine';
import {
  AuthError,
  getProfileById,
  guest,
  login,
  register,
  updateProfile,
} from '../auth/service.js';
import { verifyToken } from '../auth/tokens.js';
import { getStore } from '../store/index.js';
import type { TableManager } from '../tables/manager.js';

const registerSchema = z.object({
  username: z.string().min(USERNAME_MIN).max(USERNAME_MAX),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  displayName: z.string().max(DISPLAY_NAME_MAX).optional(),
});

const loginSchema = z.object({
  username: z.string().min(1).max(USERNAME_MAX),
  password: z.string().min(1).max(PASSWORD_MAX),
});

const guestSchema = z.object({
  displayName: z.string().max(DISPLAY_NAME_MAX).optional(),
});

const updateSchema = z.object({
  displayName: z.string().max(DISPLAY_NAME_MAX).optional(),
  bio: z.string().max(280).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const createTableSchema = z.object({
  gameId: z.string().min(1),
  name: z.string().max(40).optional(),
  isPrivate: z.boolean().optional(),
  options: z
    .object({
      turnSeconds: z.number().int().min(0).max(600).optional(),
      allowSpectators: z.boolean().optional(),
    })
    .optional(),
});

function bearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return verifyToken(token);
}

async function requireUserId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const userId = bearer(request);
  if (!userId) {
    await reply.code(401).send({ error: 'Bạn cần đăng nhập.' });
    return null;
  }
  return userId;
}

function sendAuthError(reply: FastifyReply, err: unknown): void {
  if (err instanceof AuthError) {
    void reply.code(err.status).send({ error: err.message });
    return;
  }
  request_error(reply, err);
}

function request_error(reply: FastifyReply, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Có lỗi xảy ra.';
  void reply.code(400).send({ error: message });
}

export async function registerRoutes(app: FastifyInstance, manager: TableManager): Promise<void> {
  app.get('/api/health', async () => ({ ok: true, ts: Date.now() }));

  app.get('/api/games', async (): Promise<GameCatalogEntry[]> => {
    return listGameMeta().map((meta) => ({
      id: meta.id,
      name: meta.name,
      tagline: meta.tagline,
      description: meta.description,
      rules: meta.rules,
      minPlayers: meta.minPlayers,
      maxPlayers: meta.maxPlayers,
      estimatedMinutes: meta.estimatedMinutes,
      hasHiddenInfo: meta.hasHiddenInfo,
      supportsBots: meta.supportsBots,
    }));
  });

  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ.' });
    try {
      const result = await register(parsed.data.username, parsed.data.password, parsed.data.displayName);
      return reply.send(result);
    } catch (err) {
      return sendAuthError(reply, err);
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ.' });
    try {
      const result = await login(parsed.data.username, parsed.data.password);
      return reply.send(result);
    } catch (err) {
      return sendAuthError(reply, err);
    }
  });

  app.post('/api/auth/guest', async (request, reply) => {
    const parsed = guestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ.' });
    try {
      const result = await guest(parsed.data.displayName);
      return reply.send(result);
    } catch (err) {
      return sendAuthError(reply, err);
    }
  });

  app.get('/api/auth/me', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const profile = await getProfileById(userId);
    if (!profile) return reply.code(404).send({ error: 'Không tìm thấy người dùng.' });
    return reply.send({ user: profile });
  });

  app.patch('/api/profile', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ.' });
    try {
      const user = await updateProfile(userId, parsed.data);
      return reply.send({ user });
    } catch (err) {
      return sendAuthError(reply, err);
    }
  });

  app.get('/api/profile/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await getProfileById(id);
    if (!profile) return reply.code(404).send({ error: 'Không tìm thấy người dùng.' });
    const matches = await getStore().getMatches(id, 30);
    return reply.send({ user: profile, matches });
  });

  app.get('/api/tables', async () => {
    return { tables: manager.listPublicSummaries() };
  });

  app.post('/api/tables', async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const parsed = createTableSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ.' });
    const profile = await getProfileById(userId);
    if (!profile) return reply.code(401).send({ error: 'Bạn cần đăng nhập.' });
    try {
      const table = manager.createTable(
        { userId, displayName: profile.displayName, avatarColor: profile.avatarColor },
        parsed.data,
      );
      return reply.send({ table: table.toState() });
    } catch (err) {
      return request_error(reply, err);
    }
  });

  app.get('/api/tables/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const table = manager.getTable(id) ?? manager.findByCode(id);
    if (!table) return reply.code(404).send({ error: 'Không tìm thấy bàn.' });
    return reply.send({ table: table.toState() });
  });
}

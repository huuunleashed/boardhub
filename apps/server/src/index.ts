import cors from '@fastify/cors';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { config, corsOrigins, validateConfig } from './config.js';
import { registerRoutes } from './http/routes.js';
import { setupSocket } from './realtime/socket.js';
import { getStore } from './store/index.js';
import { TableManager } from './tables/manager.js';

async function main(): Promise<void> {
  validateConfig();
  await getStore().init();

  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: corsOrigins(),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  });

  const io = new Server(app.server, {
    path: '/socket.io',
    maxHttpBufferSize: 1e5,
    cors: {
      origin: corsOrigins(),
      methods: ['GET', 'POST'],
    },
  });

  const manager = new TableManager(io);
  await registerRoutes(app, manager);
  setupSocket(io, manager);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`BoardHub server listening on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});

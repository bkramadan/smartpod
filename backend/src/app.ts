import helmet from '@fastify/helmet';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Config } from './config.ts';
import { healthRoutes } from './routes/health.ts';

/**
 * Build the API server with its security settings and routes, without starting it.
 * Kept separate from server.ts so tests can call the API without opening a port.
 */
export function buildApp(config: Pick<Config, 'LOG_LEVEL'>): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Login tokens and cookies must never end up in log files.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  });

  // Adds standard security headers to every response.
  app.register(helmet);

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error');
      // Generic message only: details stay in the server log, never reach the user.
      return reply
        .status(500)
        .send({ error: 'Something went wrong. Please try again.' });
    }
    return reply.status(statusCode).send({ error: error.message });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: 'Not found' }),
  );

  app.register(healthRoutes, { prefix: '/api' });

  return app;
}

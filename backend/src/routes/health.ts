import type { HealthResponse } from '@smartpod/shared';
import type { FastifyInstance } from 'fastify';

/** `GET /api/health`: lets apps and monitoring check that the server is running. */
export function healthRoutes(app: FastifyInstance): void {
  app.get('/health', (): HealthResponse => ({ status: 'ok' }));
}

import { HealthResponseSchema } from '@smartpod/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

const app = buildApp({ LOG_LEVEL: 'fatal' });
afterAll(() => app.close());

describe('GET /api/health', () => {
  it('answers with the shared health shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.parse(response.json())).toEqual({
      status: 'ok',
    });
  });

  it('sends security headers', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('unknown routes', () => {
  it('return a generic 404 message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Not found' });
  });
});

describe('loadConfig', () => {
  it('uses safe defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      HOST: '127.0.0.1',
      PORT: 4000,
      LOG_LEVEL: 'info',
    });
  });

  it('refuses an invalid port and names only the variable', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(
      'Invalid environment variables: PORT',
    );
  });
});

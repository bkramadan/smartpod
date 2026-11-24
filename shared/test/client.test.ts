import { describe, expect, it } from 'vitest';
import { ApiError, getHealth } from '../src/index.ts';

/** Builds a fake `fetch` that always answers with the given status and body. */
function fakeFetch(status: number, body: unknown): typeof fetch {
  return () => Promise.resolve(Response.json(body, { status }));
}

describe('getHealth', () => {
  it('returns the health status when the backend answers correctly', async () => {
    await expect(
      getHealth('', fakeFetch(200, { status: 'ok' })),
    ).resolves.toEqual({
      status: 'ok',
    });
  });

  it('rejects an answer with the wrong shape', async () => {
    await expect(
      getHealth('', fakeFetch(200, { status: 'broken' })),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects an error status code', async () => {
    await expect(getHealth('', fakeFetch(503, {}))).rejects.toMatchObject({
      status: 503,
    });
  });
});

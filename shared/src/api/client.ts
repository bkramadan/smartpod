import {
  HealthResponseSchema,
  type HealthResponse,
} from '../schemas/health.ts';

/** Thrown when the backend cannot be reached or answers with something unexpected. */
export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Ask the backend whether it is running.
 *
 * @param baseUrl Backend address, e.g. "http://127.0.0.1:4000". Use "" in the web
 *   app, where the dev server forwards "/api" to the backend.
 * @param fetchFn Injected so tests can pass a fake instead of calling the network.
 */
export async function getHealth(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<HealthResponse> {
  const response = await fetchFn(`${baseUrl}/api/health`);
  if (!response.ok) {
    throw new ApiError('Backend health check failed', response.status);
  }
  // Never trust data from the network: check it matches the expected shape.
  const parsed = HealthResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError('Backend sent an unexpected health response');
  }
  return parsed.data;
}

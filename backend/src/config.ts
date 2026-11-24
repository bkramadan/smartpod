import { parseEnv } from '@smartpod/shared';
import { z } from 'zod';

const ConfigSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

/** Settings the backend needs, read from environment variables. */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Read and check the settings. Stops the server at start-up if a value is invalid,
 * instead of failing later in a confusing way.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return parseEnv(ConfigSchema, env);
}

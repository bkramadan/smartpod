import { parseEnv } from '@smartpod/shared';
import { z } from 'zod';

const ConfigSchema = z.object({
  API_URL: z.url().default('http://127.0.0.1:4000'),
});

/** Settings the simulator needs, read from environment variables. */
export type Config = z.infer<typeof ConfigSchema>;

/** Read and check the settings; stops with a clear message if a value is invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return parseEnv(ConfigSchema, env);
}

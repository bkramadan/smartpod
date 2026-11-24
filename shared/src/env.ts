import type { z } from 'zod';

/**
 * Check environment variables against a schema and return the typed result.
 * Throws at start-up with the names (never the values, which may be secrets)
 * of any invalid variables.
 */
export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  env: Record<string, string | undefined>,
): z.infer<Schema> {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Invalid environment variables: ${names}`);
  }
  return parsed.data;
}

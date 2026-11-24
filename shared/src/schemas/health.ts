import { z } from 'zod';

/**
 * Shape of the backend's `GET /api/health` answer.
 *
 * Defined once here so the backend that sends it and the apps that read it
 * can never disagree about what it looks like.
 */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
});

/** TypeScript type generated from the schema above. */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

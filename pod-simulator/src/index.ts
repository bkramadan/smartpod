// Entry point: for now the simulated Pod only checks that it can reach the backend.
// Later steps add the real Device API (sign in as a Pod, report doses, receive schedules).
import { getHealth } from '@smartpod/shared';
import { loadConfig } from './config.ts';

const config = loadConfig();

try {
  await getHealth(config.API_URL);
  console.log(`Pod simulator: backend at ${config.API_URL} is online.`);
} catch {
  console.error(
    `Pod simulator: cannot reach the backend at ${config.API_URL}. Is it running?`,
  );
  process.exitCode = 1;
}

/**
 * Starts the Smart Pod backend:  npm run dev   (restarts when you save a file)
 *                                npm start     (plain start)
 */
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app.ts';
import { config } from './config.ts';

const app = createApp();
const server = createServer(app.handle);

server.listen(config.port, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === 'IPv4' && !n.internal)?.address;
  console.log('\n  Smart Pod backend is running (mock data)');
  console.log(`  On this computer:  http://localhost:${config.port}/api/health`);
  if (lan) console.log(`  For your phone:    http://${lan}:${config.port}   (use this in mobile/.env)`);
  console.log(`  AI explanations:   ${config.anthropicApiKey ? `Claude (${config.claudeModel})` : 'template text (no ANTHROPIC_API_KEY set)'}`);
  console.log(`  Saved data file:   ${config.dataFile || '(memory only)'}\n`);
});

// Background job: reminders, missed doses, offline Pods.
const timer = setInterval(() => {
  app.tick().catch((err) => console.error('Background job failed:', err));
}, config.tickSeconds * 1000);
app.tick().catch((err) => console.error('Background job failed:', err));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(timer);
    (app.deps.store as { saveNow?: () => void }).saveNow?.();
    server.close(() => process.exit(0));
  });
}

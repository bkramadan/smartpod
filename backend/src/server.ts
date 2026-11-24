// Entry point: read settings, build the app, start listening.
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = buildApp(config);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.fatal({ err: error }, 'Server failed to start');
  process.exit(1);
}

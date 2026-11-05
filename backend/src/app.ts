/**
 * Puts the backend together: data store + AI explainer + routes.
 * server.ts uses it to run for real; the tests use it with a fixed clock.
 */
import type { IncomingMessage } from 'node:http';
import { claudeExplainer, templateExplainer, type Explainer } from './ai/explainer.ts';
import { config as defaultConfig, type Config } from './config.ts';
import { Router } from './http/router.ts';
import { registerRoutes } from './routes.ts';
import type { Deps } from './services/deps.ts';
import { tick } from './services/schedule.ts';
import type { DataStore } from './store/DataStore.ts';
import { MemoryStore } from './store/MemoryStore.ts';

export interface AppOptions {
  store?: DataStore;
  explainer?: Explainer;
  config?: Config;
  now?: () => Date;
}

export function createApp(options: AppOptions = {}) {
  const config = options.config ?? defaultConfig;
  const now = options.now ?? (() => new Date());
  const deps: Deps = {
    config,
    now,
    store: options.store ?? new MemoryStore(config.dataFile || undefined, now),
    explainer:
      options.explainer ??
      (config.anthropicApiKey ? claudeExplainer(config.anthropicApiKey, config.claudeModel) : templateExplainer),
  };

  const bearer = (req: IncomingMessage) => {
    const header = req.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  };

  const router = new Router({
    async user(req) {
      const token = bearer(req);
      // Mock tokens look like "demo.<userId>". Supabase Auth will replace this.
      if (!token.startsWith('demo.')) return undefined;
      return deps.store.users.get(token.slice(5));
    },
    async device(req) {
      const id = String(req.headers['x-device-id'] ?? '');
      const key = String(req.headers['x-device-key'] ?? '');
      const device = id ? await deps.store.devices.get(id) : undefined;
      return device && device.type !== 'phone' && device.deviceKey === key ? device : undefined;
    },
  });
  registerRoutes(router, deps);

  return { deps, router, handle: router.handle, tick: () => tick(deps) };
}

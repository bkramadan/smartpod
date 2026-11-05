import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { templateExplainer } from '../src/ai/explainer.ts';
import { config } from '../src/config.ts';
import { MemoryStore } from '../src/store/MemoryStore.ts';

/** Starts a backend on a random port with fresh demo data and a clock you control. */
export async function startTestServer(start = new Date(2026, 10, 5, 10, 0, 0)) {
  let current = new Date(start);
  const now = () => new Date(current);
  const app = createApp({
    store: new MemoryStore(undefined, now),
    explainer: templateExplainer,
    config: { ...config, dataFile: '', anthropicApiKey: '' },
    now,
  });
  const server: Server = createServer(app.handle);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function call(method: string, path: string, opts: { as?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(opts.as ? { authorization: `Bearer demo.${opts.as}` } : {}),
        ...opts.headers,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }

  return {
    app,
    call,
    setTime: (d: Date) => { current = new Date(d); },
    addMinutes: (m: number) => { current = new Date(current.getTime() + m * 60000); },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

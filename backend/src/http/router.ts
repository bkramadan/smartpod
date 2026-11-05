/**
 * A very small web router built on Node's own http module.
 *
 * Why not Express? It keeps the backend free of outside libraries, and every line of
 * how a request is handled is visible here. Each route is:
 *
 *   router.get('/api/patients/:patientId', handler, { auth: 'user' })
 *
 * The handler receives a context (who is calling, URL params, body) and returns any
 * value, which is sent back as JSON. To fail, throw `new HttpError(403, 'message')`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Device, User } from '@smartpod/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Return this from a handler to choose the status code (default is 200). */
export class Reply {
  constructor(
    public status: number,
    public body: unknown,
  ) {}
}

export type AuthMode = 'none' | 'user' | 'device';

export interface Ctx {
  req: IncomingMessage;
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
  /** The signed-in person (auth: 'user'). */
  actor: User;
  /** The calling Pod (auth: 'device'). */
  device: Device;
}

type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route {
  method: string;
  parts: string[];
  handler: Handler;
  auth: AuthMode;
}

export interface Authenticator {
  user(req: IncomingMessage): Promise<User | undefined>;
  device(req: IncomingMessage): Promise<Device | undefined>;
}

export class Router {
  private routes: Route[] = [];

  constructor(private auth: Authenticator) {}

  private add(method: string, path: string, handler: Handler, opts: { auth?: AuthMode } = {}) {
    this.routes.push({ method, parts: path.split('/').filter(Boolean), handler, auth: opts.auth ?? 'user' });
  }
  get(path: string, h: Handler, o?: { auth?: AuthMode }) { this.add('GET', path, h, o); }
  post(path: string, h: Handler, o?: { auth?: AuthMode }) { this.add('POST', path, h, o); }
  patch(path: string, h: Handler, o?: { auth?: AuthMode }) { this.add('PATCH', path, h, o); }
  delete(path: string, h: Handler, o?: { auth?: AuthMode }) { this.add('DELETE', path, h, o); }

  /** List of routes, used to print the API on start-up. */
  describe() {
    return this.routes.map((r) => `${r.method.padEnd(6)} /${r.parts.join('/')}`);
  }

  private match(method: string, pathname: string) {
    const parts = pathname.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method || route.parts.length !== parts.length) continue;
      const params: Record<string, string> = {};
      const ok = route.parts.every((p, i) => {
        if (p.startsWith(':')) {
          params[p.slice(1)] = decodeURIComponent(parts[i]);
          return true;
        }
        return p === parts[i];
      });
      if (ok) return { route, params };
    }
    return undefined;
  }

  /** The function Node's http server calls for every request. */
  handle = async (req: IncomingMessage, res: ServerResponse) => {
    // CORS: lets the web dashboards and the mobile app (other origins) call the API.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-Device-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return send(res, 204, undefined);

    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      const found = this.match(req.method ?? 'GET', url.pathname);
      if (!found) throw new HttpError(404, `No route for ${req.method} ${url.pathname}`);
      const { route, params } = found;

      const ctx = { req, params, query: url.searchParams, body: await readJson(req) } as Ctx;
      if (route.auth === 'user') {
        const user = await this.auth.user(req);
        if (!user) throw new HttpError(401, 'Sign in first (missing or unknown token).');
        ctx.actor = user;
      } else if (route.auth === 'device') {
        const device = await this.auth.device(req);
        if (!device) throw new HttpError(401, 'Unknown device or wrong device key.');
        ctx.device = device;
      }

      const result = await route.handler(ctx);
      if (result instanceof Reply) return send(res, result.status, result.body);
      return send(res, 200, result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...err.extra });
      console.error(err);
      return send(res, 500, { error: 'Something went wrong on the server.' });
    }
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<any> {
  if (req.method === 'GET' || req.method === 'OPTIONS') return {};
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, 'Request body too large.');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

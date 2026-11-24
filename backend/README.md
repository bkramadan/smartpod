# Backend (API server)

The one place that decides things: who you are, what you may do, what is stored. Every app and the Pod talk to it over HTTP(S). Built with [Fastify](https://fastify.dev).

## How it works

| File                   | Layer    | What it does                                                                                       |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `src/server.ts`        | start-up | Entry point: reads settings, builds the app, starts listening on `HOST:PORT`.                      |
| `src/config.ts`        | start-up | Reads environment variables and checks them with a Zod schema. Bad value = clear error at start.   |
| `src/app.ts`           | HTTP     | Builds the Fastify app: logging (with secrets redacted), security headers, error handling, routes. |
| `src/routes/health.ts` | HTTP     | `GET /api/health`, answers `{ "status": "ok" }`.                                                   |
| `test/app.test.ts`     | tests    | Calls the API in memory with `app.inject()` (no real network) and checks the answers.              |

Why `app.ts` and `server.ts` are separate: tests need the app **without** opening a network port. `buildApp()` builds it; only `server.ts` starts it.

What happens to a request: Fastify receives it → helmet adds security headers → the matching route runs → if anything throws, the error handler logs the details and returns a generic message.

Node.js runs the `.ts` files directly (no build step). `node --watch` restarts the server whenever you save a file.

## Run and test

```bash
cp .env.example .env     # once
npm run dev              # from this folder, or `npm run dev:backend` from the root
npm test
npm run typecheck
```

Try it: open <http://127.0.0.1:4000/api/health>.

## Where to change things

- **New endpoint:** add a file in `src/routes/`, register it in `src/app.ts` with `app.register(...)`, define its request and response shapes in `shared/src/schemas/`, add a test in `test/`.
- **New setting:** add it to `ConfigSchema` in `src/config.ts` and to `.env.example`.
- **Error messages / security headers / logging:** `src/app.ts`.

From step 2, the folders below are added. Keep the layers separate:

- `src/services/`: business rules (permissions, conflict checks). No HTTP, no SQL here.
- `src/data/`: database access through Prisma. No rules here.
- `prisma/schema.prisma`: database tables.

A route only checks the input and calls a service; a service calls the data layer.

## How to scale

- **Stateless by design:** nothing about users is kept in server memory, so you can run several copies behind a load balancer when one isn't enough.
- **Growing codebase:** when `routes/` + `services/` + `data/` hold dozens of files, group by feature instead (`src/prescriptions/routes.ts`, `service.ts`, `data.ts`).
- **Slow work** (AI calls, notifications): move it to a background job queue so requests stay fast.
- **Production:** run behind HTTPS (the hosting platform terminates TLS), set `HOST=0.0.0.0` inside the container, and keep `LOG_LEVEL=info`.

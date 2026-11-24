# Shared

Code used by **every** part: the backend, web, mobile and the Pod simulator. It's the contract between them. If the backend and an app disagree about what data looks like, TypeScript reports it here.

## How it works

| File                    | What it does                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `src/index.ts`          | The list of everything others may import (`import { … } from '@smartpod/shared'`).         |
| `src/schemas/health.ts` | Zod schema + TypeScript type for the health-check answer.                                  |
| `src/api/client.ts`     | `getHealth()`: calls the backend and validates the answer. One function per endpoint.      |
| `src/env.ts`            | `parseEnv()`: checks environment variables at start-up; prints names, never secret values. |
| `test/client.test.ts`   | Tests the client with a fake `fetch`.                                                      |

There is no build step: the other parts import the `.ts` files directly (`"exports"` in `package.json` points to `src/index.ts`).

## Rules

- Only code that **more than one part** needs goes here.
- It must run everywhere (Node, browser, phone): no Node-only modules such as `fs`, and no React.
- **No secrets and no business rules.** Permission checks and the medicine rules engine live in `backend/` only, because code here also ships inside the apps, where anyone can read it.

## Where to change things

- **New data shape:** add `src/schemas/<topic>.ts`, export it from `src/index.ts`.
- **New endpoint client:** add a function to `src/api/` (split into files per topic as it grows), export it.

Then run `npm run typecheck` from the root to see every place that needs updating.

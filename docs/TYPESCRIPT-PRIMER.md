# TypeScript primer: just what this project uses

TypeScript is **JavaScript plus types**. A type describes what a value looks like (a number, a text, an object with certain fields). The editor and `npm run typecheck` use types to catch mistakes **before** the code runs. When the code runs, the types are simply removed.

## The basics, with examples from this repo

```ts
// A variable with a type (usually TypeScript works it out by itself)
const port: number = 4000;

// A function: input types and the return type
function add(a: number, b: number): number {
  return a + b;
}

// A "union" type: the value can only be one of these exact texts
type BackendStatus = 'checking' | 'online' | 'offline'; // web/src/useBackendStatus.ts

// An object type
type HealthResponse = { status: 'ok' };
```

If you write `setStatus('onlin')` (a typo), the editor underlines it in red, so you never ship that bug.

## Zod: types that also check real data

Types only exist while you write code. Data arriving from the network or from a user might be anything. Zod defines the shape once and gives you both:

```ts
import { z } from 'zod';

const HealthResponseSchema = z.object({ status: z.literal('ok') }); // runtime check
type HealthResponse = z.infer<typeof HealthResponseSchema>; // TypeScript type

HealthResponseSchema.safeParse(dataFromNetwork); // { success: true, data } or { success: false, error }
```

**Rule in this project:** anything that comes from outside (requests, responses, env variables) goes through a Zod schema first.

## `async` / `await`: waiting for slow things

Network calls take time. `await` pauses the function until the answer is ready, without freezing the app:

```ts
async function check() {
  const response = await fetch('/api/health'); // wait for the network
  const body = await response.json(); // wait for the body
}
```

`try { … } catch { … }` handles the case where it fails (server down, no Wi-Fi).

## `import` / `export`: splitting code into files

```ts
export function getHealth() { … }                  // in shared/src/api/client.ts
import { getHealth } from '@smartpod/shared';      // anywhere else
import { buildApp } from './app.ts';               // a file next to this one
```

In the backend, shared and pod-simulator, imports end in `.ts`, because Node.js runs those files directly. Web and mobile use a bundler, so there you leave the extension off.

## React in one minute (web and mobile)

A **component** is a function that returns what to show on screen. A **hook** (a function starting with `use`) gives a component memory (`useState`) or lets it run something when it appears (`useEffect`).

```tsx
export function App() {
  const status = useBackendStatus(); // our own hook
  return <p>{STATUS_TEXT[status]}</p>; // JSX: HTML-like syntax inside TypeScript
}
```

Web uses HTML tags (`<main>`, `<p>`). Mobile uses React Native components (`<View>`, `<Text>`). The ideas are identical.

## When you see a red underline

1. Hover over it: the message says what was expected and what was found.
2. Run `npm run typecheck` to see every error in the project.
3. Don't silence errors with `any` or `// @ts-ignore`. Fix the cause, or ask.

## Learn more

- [TypeScript for JavaScript programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) (5 minutes)
- [React: Quick Start](https://react.dev/learn)
- [Zod basics](https://zod.dev/basics)

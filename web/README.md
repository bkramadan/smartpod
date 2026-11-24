# Web dashboard

Dashboard for doctors, pharmacists and caregivers. Built with [React](https://react.dev) and [Vite](https://vite.dev).

## How it works

| File                      | Layer    | What it does                                                                       |
| ------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `index.html`              | start-up | The single HTML page; React fills in `<div id="root">`.                            |
| `src/main.tsx`            | start-up | Entry point: mounts `<App />` into the page.                                       |
| `src/App.tsx`             | UI       | The screen. Shows only what it's given; no network code here.                      |
| `src/useBackendStatus.ts` | logic    | A hook that asks the backend whether it's online, via `getHealth()` from `shared`. |
| `vite.config.ts`          | tooling  | Dev server, the `/api` proxy to the backend, and test settings.                    |
| `src/App.test.tsx`        | tests    | Renders the app with a fake `fetch` and checks what the user would see.            |

**The `/api` proxy:** during development the browser calls `http://localhost:5173/api/...` and Vite forwards it to the backend at `127.0.0.1:4000`. To the browser, both live at the same address, so the backend doesn't need to allow other websites (CORS stays closed).

## Run and test

```bash
npm run dev       # http://localhost:5173 (start the backend too, or you'll see "offline")
npm test
npm run build     # production files in dist/
```

## Where to change things

- **Text and layout of the screen:** `src/App.tsx`.
- **Talking to a new backend endpoint:** add a function in `shared/src/api/`, then call it from a hook in `src/`. Never call `fetch` directly from a component.
- **Proxy / dev server port:** `vite.config.ts`.

Step 6 adds pages and navigation (`src/pages/`), reusable pieces (`src/components/`) and login. Showing or hiding buttons by role there is for convenience only: the backend still enforces every permission.

## How to scale

- `npm run build` produces plain static files (`dist/`) that can be hosted on any static host or CDN. That's cheap, and it scales with no extra work.
- When the app gets bigger, add a data-fetching library (e.g. TanStack Query) for caching and loading states, and a router (React Router). Add them when they're needed, not before.

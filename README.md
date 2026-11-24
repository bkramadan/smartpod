# Smart Pod

Software for **Smart Pod**: a medication and supplement dispenser, a mobile app for patients and caregivers, a web dashboard for doctors, pharmacists and caregivers, and a backend that checks for conflicts and timing problems.

> ⚠️ Early stage. This branch contains the **foundation only**: every part starts, talks to the backend, and has passing tests. Features are added step by step (see [Roadmap](#roadmap)). Nothing here is medical advice.

## What is in this repository

| Folder                            | What it is                                                          | Built with          |
| --------------------------------- | ------------------------------------------------------------------- | ------------------- |
| [`backend/`](backend)             | The API every app talks to. Enforces logins, roles and the rules.   | Node.js + Fastify   |
| [`web/`](web)                     | Web dashboard for doctors, pharmacists and caregivers               | React + Vite        |
| [`mobile/`](mobile)               | Phone app for patients and caregivers                               | Expo (React Native) |
| [`pod-simulator/`](pod-simulator) | Pretends to be the Pod hardware, using the same API a real Pod will | Node.js             |
| [`shared/`](shared)               | Data shapes and the API client every part uses                      | TypeScript + Zod    |
| [`docs/`](docs)                   | Plain-language guides                                               |                     |

Everything is written in **TypeScript**. New to it? Start with [docs/TYPESCRIPT-PRIMER.md](docs/TYPESCRIPT-PRIMER.md). How the parts fit together, and where to change or scale things: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup (once)

You need:

- **Node.js 24 or newer**: [nodejs.org](https://nodejs.org), pick "LTS". Check with `node -v`.
- **Docker Desktop**, only from step 2 (the database) onward: [docker.com](https://www.docker.com/products/docker-desktop/).
- For the phone app: the **Expo Go** app on your phone, or an iOS/Android simulator.

```bash
npm install                                # installs everything for all parts
cp backend/.env.example backend/.env       # then adjust if needed
cp mobile/.env.example mobile/.env
cp pod-simulator/.env.example pod-simulator/.env
cp .env.example .env                       # database settings (step 2 onward)
```

## Run

Open a terminal window per part:

```bash
npm run dev:backend    # API on http://127.0.0.1:4000/api/health
npm run dev:web        # dashboard on http://localhost:5173
npm run dev:mobile     # scan the QR code with Expo Go
npm run pod            # simulated Pod checks it can reach the backend
```

## Test and check

```bash
npm test               # all tests, every part
npm run lint           # code-quality rules (ESLint)
npm run format         # tidy formatting (Prettier); format:check only reports
npm run typecheck      # TypeScript type checks
npm run check          # all of the above. Must pass before every commit.
```

Run one part only: `npm test -w backend` (or `web`, `mobile`, `shared`, `pod-simulator`).

## Roadmap

1. ✅ Foundation: structure, tooling, one passing test per part
2. Accounts, login, roles (doctor edits / pharmacist views), audit log, PostgreSQL + Prisma
3. Prescriptions, schedules, dose log
4. Rules engine (conflicts, timing) + Claude explanations
5. Pod Device API + simulator
6. Web dashboards and mobile screens

## Rules for this project

See [CLAUDE.md](CLAUDE.md): security and privacy first, mock data only, never real patient data.

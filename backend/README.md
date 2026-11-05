# Backend

The Smart Pod API on mock data. No outside libraries: only Node.js 20+.

```bash
npm install     # developer tools only (TypeScript, tsx)
npm run dev     # start on http://localhost:4000, restarts on save
npm test        # automatic tests
```

Start reading at `src/routes.ts` (every URL), then `src/services/` (the rules) and `src/ai/` (the AI engine).
Settings: copy `.env.example` to `.env`. Docs: [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), [../docs/API.md](../docs/API.md).

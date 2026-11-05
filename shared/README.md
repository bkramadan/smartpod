# Shared types

`src/index.ts` describes every record (User, Item, DoseEvent, AiReport …). The backend, web and mobile apps import it with `import type`, so it adds no code to any app. Change a field here and TypeScript shows every place to update.

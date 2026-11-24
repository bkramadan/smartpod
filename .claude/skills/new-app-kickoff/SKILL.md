---
name: new-app-kickoff
description: Use when starting a new app, service or module for the Smart Pod / ICP project, or when asked which language, framework or stack to use. Compares the top two stacks and waits for a choice.
---

# New app kickoff

## Step 1: Understand the app
Restate in 5 bullets or fewer:
- Purpose
- Users and roles
- Platform (mobile, web, backend, device/hardware)
- Data sensitivity (e.g. health data)
- Integrations (e.g. Odoo, the Pod hardware, an AI API) and expected scale for the next 12 months

If something missing would change the stack choice, ask, at most 3 questions.

## Step 2: Compare the top two stacks
Pick the two strongest full stacks (language + framework + database where relevant). Score each 1-5 in a table:

| Criterion | Option A | Option B |
|---|---|---|
| Easy for a non-senior developer to read and maintain | | |
| Libraries available for this app | | |
| Security track record and built-in protections | | |
| Fit with the existing stack (Python/Odoo, existing repo) | | |
| Hosting cost and deployment simplicity | | |
| Path to scale | | |
| Docs, community and long-term support | | |

Under the table:
- Your recommendation and why, in 2-3 sentences.
- The main risk of each option, in one line each.

## Step 3: Stop and wait
Ask the user to choose. Do not write any code until they choose.

## Step 4: Scaffold the chosen stack
- Folder structure that keeps UI, business logic and data access separate
- README: purpose, setup, run, test
- `.gitignore` (including `.env`) and `.env.example`
- Linter and formatter config
- Test framework with one passing sample test
- Lockfile with pinned dependency versions
- Follow the standards in the repo's CLAUDE.md

Then summarise in plain language what was created and how to run it.

## Rules
- Only mainstream, actively maintained options; no niche or abandoned frameworks.
- Never pick a stack just because it is trendy.
- If one option is clearly better, say so plainly, but still show the runner-up.

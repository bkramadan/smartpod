# Smart Pod — Instructions for Claude

## About this project
- EMBA team consulting project (ICP). Smart Pod = a smart medication pod (hardware, in scope) + an app.
- Prototype runs on **mock data only**.
- Roles: doctors can edit prescriptions; pharmacists can only view them.
- AI = rule-based checks (medicine/supplement conflicts, timing) + Claude-written explanations.
- The team members are not senior developers: explain things in plain language.

## Priorities (when goals conflict)
1. Security & privacy
2. Correctness
3. Simplicity
4. Scalability

## How to work
- Before coding: restate the task, list the files you will change, and ask if anything is unclear. For anything bigger than a small fix, wait for confirmation.
- Make small, focused changes. Follow the existing structure and conventions.
- After coding, give a short summary: what changed, why, how to run/test it, and any risks or follow-ups.
- New app, service or module: use the `new-app-kickoff` skill (compare the top two stacks, wait for the team's choice).

## Code standards
- Clear names, small functions, no duplicated or dead code.
- Comments explain *why*, not *what*. Docstrings on public functions and classes.
- Update the README whenever setup, run or configuration steps change.
- Linter and formatter must pass.
- Build for today's needs with clean boundaries (UI / business logic / data access kept separate). No speculative abstractions.

## Security baseline
- Validate all input on the server. Use parameterized queries only. Encode output.
- Authentication and authorization enforced on the server; deny by default; least privilege.
- Secrets only in environment variables. `.env` is in `.gitignore`; keep `.env.example` up to date.
- HTTPS only. Encrypt sensitive data at rest. Hash passwords with bcrypt or Argon2.
- Few, well-maintained dependencies, with versions pinned (lockfile). Flag known vulnerabilities.
- Users see generic error messages; no stack traces. Logs never contain personal or health data.

## Health-data rules
- Prescriptions and medication data are sensitive health data.
- The doctor-edit / pharmacist-view rule is enforced on the server and covered by tests.
- Audit log for every view or change of a prescription: who, what, when.
- Never use real patient data in code, tests, logs, screenshots or AI prompts.
- Send the AI API only the minimum data needed, with identifiers removed.
- Conflict and timing warnings come from the rules engine. The AI only explains them; it never invents medical advice.

## Tests
- Every feature and bug fix comes with tests, including permission tests for each role.
- Run the tests and report the results before saying a task is done.

## Git
- Clear commit messages; work on feature branches.
- Never push to `main`, force-push, or delete files or data without asking first.
- Never commit secrets.

## Definition of done
- [ ] Code works and follows the standards above
- [ ] Tests written, run and passing
- [ ] Security and health-data rules checked
- [ ] Docs/README updated
- [ ] Plain-language summary given

# Moving from mock data to a real backend

The prototype runs on mock data. For the pilot, the data moves to **Supabase**: a ready-made cloud database (PostgreSQL) with sign-in and security built in. Because every service uses the **data plug** (`backend/src/store/DataStore.ts`), the apps and the services do not change.

## Steps, in order

| # | Step | What changes | Effort |
| --- | --- | --- | --- |
| 1 | Create a Supabase project in an **EU region** | Nothing in code | 1 hour |
| 2 | Create the tables (SQL below) | New `backend/supabase/migrations/` | 1 day |
| 3 | Write `SupabaseStore` implementing `DataStore` | One new file; one line in `app.ts` | 2–3 days |
| 4 | Replace demo sign-in with **Supabase Auth** | `app.ts` (token check), sign-in screens in both apps | 3–5 days |
| 5 | Add **row-level security** so the database itself refuses other patients' rows | SQL policies | 2 days |
| 6 | Turn notifications into **push messages** (Expo push service) | `services/notify.ts`, mobile app registers for push | 2–3 days |
| 7 | Run the background job as a **scheduled function** instead of `setInterval` | `server.ts` | 1 day |
| 8 | Host the backend (Render, Railway, Fly.io or Supabase Edge Functions) and the web app (Vercel, Netlify) | Deployment settings | 1–2 days |
| 9 | Replace the demo AI catalogue with a **licensed drug database** | `backend/src/ai/` data only | depends on vendor |
| 10 | Security review, GDPR data-processing agreements, medical-device assessment | Process | weeks |

## Step 2: tables (starting point)

```sql
create table users (
  id uuid primary key references auth.users(id),
  name text not null, email text unique not null,
  role text not null check (role in ('patient','doctor','pharmacist','caregiver')),
  segment text, licence_number text, routine jsonb, created_at timestamptz default now()
);
create table care_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references users(id), member_id uuid references users(id),
  member_role text not null, granted_at timestamptz default now(), revoked_at timestamptz
);
create table items (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references users(id), kind text not null, catalog_id text not null,
  name text not null, dose text not null, times text[] not null, instructions text,
  status text not null default 'active', prescribed_by uuid references users(id),
  created_by uuid references users(id), start_date date not null, end_date date,
  updated_at timestamptz default now()
);
create table doses (
  id text primary key, patient_id uuid references users(id), item_id uuid references items(id),
  planned_at timestamptz not null, status text not null, confirmed_by text,
  actual_at timestamptz, device_id text, reminded_at timestamptz
);
-- inventory, devices, notifications, audit: same pattern as shared/src/index.ts
create index on doses (patient_id, planned_at);
```

## Step 3: the new store

```ts
// backend/src/store/SupabaseStore.ts
export class SupabaseStore implements DataStore {
  users = table<User>('users');
  careLinks = table<CareLink>('care_links');
  // … one line per table
}
```

Each `table()` maps `all / get / find / insert / update / remove` to Supabase queries. `find(predicate)` should become specific queries (e.g. `findByPatient(id)`) for speed. Add them to `DataStore` as needed and to `MemoryStore` too, so the tests keep running.

Then in `backend/src/app.ts`:

```ts
store: options.store ?? new SupabaseStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!),
```

## Step 5: row-level security (example)

```sql
alter table doses enable row level security;
create policy "patient or care team reads doses" on doses for select using (
  patient_id = auth.uid()
  or exists (select 1 from care_links l
             where l.patient_id = doses.patient_id and l.member_id = auth.uid() and l.revoked_at is null)
);
```

## Time zones

The prototype uses the backend computer's time zone. In the real backend, store every `planned_at` in UTC and add a `time_zone` field to `users` (e.g. `Asia/Beirut`), so doses follow the patient wherever they are.

## Running costs (approximate, from memory; confirm in the Gate 3 cost envelope)

| Stage | Users | Approx. per month |
| --- | --- | --- |
| Prototype (this repo) | team | $0 |
| Pilot | 20–200 | $25–100 |
| Launch | 1,000–20,000 | $300–1,500 + licences |

# API reference

Base address: `http://localhost:4000`. All bodies are JSON.

**Signing in.** People send `Authorization: Bearer <token>`. In the prototype the token is `demo.<userId>`, returned by `/api/auth/login` or `/api/auth/register`. Pods send `X-Device-Id` and `X-Device-Key`.

**Errors** look like `{ "error": "message" }`. Status codes: `400` bad input · `401` not signed in · `403` your role cannot do this · `404` not found or no access · `409` conflict (e.g. a serious AI finding to confirm, a dose already taken).

## Try it

```bash
curl localhost:4000/api/health
curl -H "Authorization: Bearer demo.u-salma" localhost:4000/api/patients
curl -H "Authorization: Bearer demo.u-salma" localhost:4000/api/patients/u-maria/ai/report
curl -X POST -H "Authorization: Bearer demo.u-salma" -H "Content-Type: application/json" \
     -d '{"catalogId":"aspirin","dose":"81 mg","times":["08:00"]}' \
     localhost:4000/api/patients/u-maria/items        # → 409 with the AI report
```

## Public (no sign-in)

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/health` | Status, data mode, AI mode |
| GET | `/api/catalog` | Medicines, supplements and foods the AI engine knows |
| GET | `/api/demo/accounts` | Demo accounts for the sign-in screens |
| POST | `/api/demo/reset` | Restore the demo data |
| POST | `/api/auth/login` | `{ userId }` or `{ email }` → `{ token, user }` |
| POST | `/api/auth/register` | `{ name, email, role, segment?, licenceNumber? }` → `{ token, user }` (doctors need a licence number) |

## Me

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/me` | Who I am |
| PATCH | `/api/me` | `{ name?, routine? }`. Routine = `{ wake, breakfast, lunch, dinner, sleep, training? }` as "HH:MM" |

## Patients

`:patientId` must be yourself (patient) or someone who gave you access.

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| GET | `/api/patients` | all | Patients I can see, with adherence, missed today, next dose, low stock |
| GET | `/api/patients/:patientId` | all | One patient summary, including my role for them |
| GET | `/api/patients/:patientId/items` | all | Active items (`?all=true` includes stopped) |
| POST | `/api/patients/:patientId/items` | doctor (medicines); patient or doctor (supplements) | Add. Body: `{ catalogId, dose?, times?, timesPerDay?, instructions?, count?, confirm? }`. No times → the AI picks them. Serious conflict → `409 { error, report, canConfirm }` |
| PATCH | `/api/patients/:patientId/items/:itemId` | same | Change `dose`, `times`, `instructions` |
| POST | `/api/patients/:patientId/items/:itemId/stop` | same | Stop an item; future doses removed |
| GET | `/api/patients/:patientId/ai/report` | all | AI report for everything they take |
| POST | `/api/patients/:patientId/ai/check` | all | Preview: `{ catalogId, times?, timesPerDay?, replacesItemId? }` → AI report. Nothing saved |
| GET | `/api/patients/:patientId/doses?date=YYYY-MM-DD` | all | Doses for a day (default today) |
| GET | `/api/patients/:patientId/adherence?days=7` | all | Totals and one entry per day |
| GET | `/api/patients/:patientId/inventory` | all | Pills left, days left, low-stock flag |
| POST | `/api/patients/:patientId/inventory/:itemId/refill` | patient, pharmacist | `{ add: 30 }` |
| GET | `/api/patients/:patientId/care-team` | all | Who has access |
| POST | `/api/patients/:patientId/care-team` | patient | `{ email }`: give access |
| DELETE | `/api/patients/:patientId/care-team/:linkId` | patient | Remove access |
| GET | `/api/patients/:patientId/audit` | patient, doctor | Last 200 changes |
| GET | `/api/patients/:patientId/devices` | all | Phone and Pods (without keys) |
| POST | `/api/patients/:patientId/devices` | patient | Pair a Pod `{ name }` → device with `deviceKey` (shown once) |

## Doses

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| POST | `/api/doses/:doseId/take` | patient, caregiver | Mark taken (from 2 h before its time). Lowers the pill count |
| POST | `/api/doses/:doseId/skip` | patient, caregiver | Mark skipped |

## Notifications

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/notifications` | My last 100 alerts, newest first |
| POST | `/api/notifications/:id/read` | Mark one read |
| POST | `/api/notifications/read-all` | Mark all read |

## Device API (called by the Pod)

Headers: `X-Device-Id`, `X-Device-Key`. Details for the hardware team: [POD-INTEGRATION.md](POD-INTEGRATION.md).

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/device/schedule` | Doses due in the next 24 hours: `{ deviceId, serverTime, doses: [{ doseId, name, dose, plannedAt }] }` |
| POST | `/api/device/events` | `{ type: "heartbeat", battery?, firmware? }` · `{ type: "dispensed", doseId, battery? }` · `{ type: "jam" }` |

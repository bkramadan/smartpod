# Demo script (about 10 minutes)

For presenting the prototype, e.g. at Gate 4. Before you start: backend, web and mobile running ([GETTING-STARTED.md](GETTING-STARTED.md)), and **Reset demo data** clicked on the web sign-in page.

| # | Who | Do this | Point to make |
| --- | --- | --- | --- |
| 1 | Phone | Open the app → **Create my profile** → show the four roles and the athlete option. Go back. | One app; everyone picks a role at sign-up. |
| 2 | Phone | Sign in as **Maria Haddad** → *Today*. | Her day at a glance; doses confirmed by her Pod. |
| 3 | Laptop | Run `node pod.mjs --now` in `pod-simulator/` (within 2 h of a dose), then pull to refresh on the phone. | The Pod releases and confirms the dose: "Confirmed by Pod". |
| 4 | Phone | *AI insights*. | Conflicts, best times, food guidance, explained in plain words. |
| 5 | Phone | *My items* → **Add a supplement** → pick **St John's wort**. | Serious conflict with Warfarin: the patient cannot add it, and is told to ask the doctor. |
| 6 | Web | Sign in as **Dr. Salma Aoun** → Maria → *Prescriptions* → **Add prescription** → Aspirin → **Save**. | The AI blocks the save: serious conflict with Warfarin. The doctor must confirm; it goes in the audit log. |
| 7 | Web | Confirm, then open *Audit log*. | Every change: who, what, when. |
| 8 | Web | Sign out → **Joseph Khoury** (pharmacist) → Maria → *Pill levels*. | Prescriptions read only; Warfarin is low; record a refill. |
| 9 | Laptop | `node pod.mjs --jam` | Pod fault. |
| 10 | Web | Sign out → **Lina Haddad** (caregiver) → *Alerts*. | The caregiver is alerted about the jam and any missed dose. |
| 11 | Phone | Sign in as **Karim Nassar** (athlete) → *AI insights*. | Same engine, supplements: caffeine before training, never close to bedtime. |
| 12 | Phone | Maria → *Me* → remove Lina's access → Lina's web page no longer shows Maria. | Consent first: the patient decides who sees what. |

**Closing line:** the same backend is ready for the real Pod. The hardware team builds against the same Device API the simulator uses.

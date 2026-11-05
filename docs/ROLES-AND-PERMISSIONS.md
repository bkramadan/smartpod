# Roles and permissions

Everyone creates a profile in the mobile app and picks one role: **patient** (medication, athlete or wellness), **doctor**, **pharmacist** or **caregiver**.

**Consent comes first.** A doctor, pharmacist or caregiver sees a patient only after that patient adds them (mobile app → Me → *Who can see my data*). The patient can remove access at any time, and it stops immediately. Without access, the backend answers "Patient not found", so nobody can even tell whether a patient exists.

## Who can do what

| Action | Patient (self) | Doctor | Pharmacist | Caregiver |
| --- | :-: | :-: | :-: | :-: |
| See schedule, doses, adherence | ✓ | ✓ | ✓ | ✓ |
| See prescriptions and supplements | ✓ | ✓ | ✓ | ✓ |
| See the AI report | ✓ | ✓ | ✓ | – (not shown in the app) |
| **Add, edit, stop medicines** | – | **✓** | – | – |
| Add, stop own supplements | ✓ | ✓ | – | – |
| Accept a **serious** AI conflict | – (told to ask the doctor) | ✓ (must confirm) | – | – |
| Mark a dose taken or skipped | ✓ | – | – | ✓ (recorded as "by caregiver") |
| See pill levels | ✓ | ✓ | ✓ | ✓ |
| Record a refill | ✓ | – | ✓ | – |
| See the audit log | ✓ | ✓ | – | – |
| Give or remove access | ✓ | – | – | – |
| Pair a Pod | ✓ | – | – | – |

Rules that apply to everyone:

- A dose can be marked taken from **2 hours before** its time, not earlier.
- Every change is written to the **audit log**: who, what, when.
- A dose not taken **60 minutes** after its time becomes *missed*; the patient and caregivers get an alert.

## Where this lives in the code

- `backend/src/services/access.ts` — the checks (`requireView`, `requireRole`, `requireItemEditor`).
- `backend/src/routes.ts` — each URL says which roles it allows.
- The apps hide buttons a role cannot use, but **the backend is what enforces it**. Never rely on the apps alone.

## Open points before real use

- Doctors' licence numbers must be verified before any patient can share with them.
- Decide with the regulatory review whether doctors may prescribe in-app or only record prescriptions.
- Decide whether caregivers may see the AI report.

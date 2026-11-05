/**
 * ROLES AND PERMISSIONS — who can see and change what.
 *
 *  Role        | Can see (only with the patient's consent)     | Can change
 *  ------------|-----------------------------------------------|-------------------------------
 *  patient     | everything about themselves                    | own supplements, doses, consent
 *  doctor      | prescriptions, adherence, AI report, audit     | adds / edits / stops medicines
 *  pharmacist  | prescriptions, usage, pill levels              | records refills
 *  caregiver   | schedule and adherence                         | marks a dose taken for them
 *
 * Consent is a CareLink. Without an active link, a doctor/pharmacist/caregiver gets 404,
 * as if the patient did not exist (so nobody can probe for patient ids).
 */
import type { ItemKind, Role, User } from '@smartpod/shared';
import { HttpError } from '../http/router.ts';
import type { Deps } from './deps.ts';

export async function activeLink(deps: Deps, patientId: string, memberId: string) {
  const [link] = await deps.store.careLinks.find(
    (l) => l.patientId === patientId && l.memberId === memberId && !l.revokedAt,
  );
  return link;
}

/** The role the actor has for this patient, or undefined if no access. */
export async function viewerRole(deps: Deps, actor: User, patientId: string): Promise<Role | undefined> {
  if (actor.id === patientId && actor.role === 'patient') return 'patient';
  const link = await activeLink(deps, patientId, actor.id);
  return link?.memberRole;
}

/** Returns the patient if the actor may view them; otherwise throws 404. */
export async function requireView(deps: Deps, actor: User, patientId: string) {
  const patient = await deps.store.users.get(patientId);
  const role = patient?.role === 'patient' ? await viewerRole(deps, actor, patientId) : undefined;
  if (!patient || !role) throw new HttpError(404, 'Patient not found.');
  return { patient, role };
}

export async function requireRole(deps: Deps, actor: User, patientId: string, allowed: Role[], action: string) {
  const { patient, role } = await requireView(deps, actor, patientId);
  if (!allowed.includes(role)) throw new HttpError(403, `As a ${role} you cannot ${action}.`);
  return { patient, role };
}

/** Medicines: doctor only. Supplements: the patient or their doctor. */
export async function requireItemEditor(deps: Deps, actor: User, patientId: string, kind: ItemKind) {
  const allowed: Role[] = kind === 'medicine' ? ['doctor'] : ['patient', 'doctor'];
  return requireRole(deps, actor, patientId, allowed, kind === 'medicine' ? 'change prescriptions' : 'change supplements');
}

/** Everyone in the patient's care team (active links), optionally by role. */
export async function careTeam(deps: Deps, patientId: string, roles?: Role[]) {
  const links = await deps.store.careLinks.find(
    (l) => l.patientId === patientId && !l.revokedAt && (!roles || roles.includes(l.memberRole)),
  );
  return links.map((l) => l.memberId);
}

/** Patients the actor can see: themselves, or those who granted access. */
export async function visiblePatientIds(deps: Deps, actor: User) {
  if (actor.role === 'patient') return [actor.id];
  const links = await deps.store.careLinks.find((l) => l.memberId === actor.id && !l.revokedAt);
  return [...new Set(links.map((l) => l.patientId))];
}

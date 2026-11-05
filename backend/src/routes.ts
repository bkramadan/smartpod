/**
 * THE FRONT DOOR (API). Every URL the apps and the Pod can call.
 * Full reference with examples: docs/API.md
 */
import type { Device, PatientSummary, User } from '@smartpod/shared';
import { CATALOG, FOODS } from './ai/catalog.ts';
import { HttpError, Reply, type Router } from './http/router.ts';
import { isDay, isTimeOfDay, localDate } from './lib/time.ts';
import { careTeam, requireRole, requireView, visiblePatientIds } from './services/access.ts';
import { activeItems, checkCandidate, patientReport } from './services/ai.ts';
import { newId, type Deps } from './services/deps.ts';
import { createItem, stopItem, updateItem } from './services/items.ts';
import { audit, notify } from './services/notify.ts';
import { adherence, dosesForDay, markDose, upcomingDoses } from './services/schedule.ts';

/** Mock sign-in: the token is just "demo.<userId>". Replaced by Supabase Auth later. */
export const tokenFor = (user: User) => `demo.${user.id}`;

const hideKey = ({ deviceKey: _hidden, ...device }: Device) => device;

export function registerRoutes(router: Router, deps: Deps) {
  const { store } = deps;

  /* ---------- Health, catalogue, demo ---------- */

  router.get('/api/health', () => ({
    ok: true,
    mode: 'mock-data',
    ai: deps.config.anthropicApiKey ? `rules + Claude (${deps.config.claudeModel})` : 'rules + template text',
    time: deps.now().toISOString(),
  }), { auth: 'none' });

  router.get('/api/catalog', () => ({
    items: CATALOG.map(({ id, name, kind, typicalDose, food, timingWhy }) => ({ id, name, kind, typicalDose, food, timingWhy })),
    foods: FOODS,
  }), { auth: 'none' });

  router.get('/api/demo/accounts', async () => {
    const users = await store.users.all();
    return users.map(({ id, name, role, segment, email }) => ({ id, name, role, segment, email }));
  }, { auth: 'none' });

  router.post('/api/demo/reset', async () => {
    await store.reset();
    return { ok: true, message: 'Demo data restored.' };
  }, { auth: 'none' });

  /* ---------- Sign-in and profile ---------- */

  router.post('/api/auth/login', async ({ body }) => {
    const [user] = await store.users.find((u) => u.id === body.userId || (!!body.email && u.email === String(body.email).toLowerCase()));
    if (!user) throw new HttpError(404, 'No account with that id or email.');
    return { token: tokenFor(user), user };
  }, { auth: 'none' });

  router.post('/api/auth/register', async ({ body }) => {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const role = body.role;
    if (!name || !email.includes('@')) throw new HttpError(400, 'Name and a valid email are required.');
    if (!['patient', 'doctor', 'pharmacist', 'caregiver'].includes(role)) throw new HttpError(400, 'Pick a role.');
    if ((await store.users.find((u) => u.email === email)).length) throw new HttpError(409, 'That email already has an account.');
    if (role === 'doctor' && !body.licenceNumber) throw new HttpError(400, 'Doctors need a licence number (it is verified before real use).');
    const user: User = {
      id: newId('u'), name, email, role,
      segment: role === 'patient' ? (['athlete', 'wellness'].includes(body.segment) ? body.segment : 'medication') : undefined,
      licenceNumber: role === 'doctor' ? String(body.licenceNumber) : undefined,
      createdAt: deps.now().toISOString(),
    };
    await store.users.insert(user);
    if (role === 'patient') {
      await store.devices.insert({ id: newId('phone'), patientId: user.id, type: 'phone', name: 'Phone', online: true, deviceKey: 'phone-only', lastSeenAt: user.createdAt });
    }
    await audit(deps, user.id, 'user.register', role === 'patient' ? user.id : undefined, user.id, role);
    return new Reply(201, { token: tokenFor(user), user });
  }, { auth: 'none' });

  router.get('/api/me', ({ actor }) => actor);

  router.patch('/api/me', async ({ actor, body }) => {
    const patch: Partial<User> = {};
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (body.routine) {
      const keys = ['wake', 'breakfast', 'lunch', 'dinner', 'sleep'] as const;
      if (!keys.every((k) => isTimeOfDay(body.routine[k])) || (body.routine.training && !isTimeOfDay(body.routine.training))) {
        throw new HttpError(400, 'Routine times must look like "07:30".');
      }
      patch.routine = { ...body.routine };
    }
    return store.users.update(actor.id, patch);
  });

  /* ---------- Patients (dashboards list and summary) ---------- */

  async function summary(patient: User, viewer: User): Promise<PatientSummary> {
    const { role } = await requireView(deps, viewer, patient.id);
    const today = await dosesForDay(deps, patient.id, localDate(deps.now()));
    const now = deps.now().toISOString();
    const next = today.find((d) => d.status === 'due' && d.plannedAt >= now);
    const items = await activeItems(deps, patient.id);
    const stock = await store.inventory.find((s) => s.patientId === patient.id && items.some((i) => i.id === s.itemId));
    return {
      patient,
      viewerRole: role,
      adherence7: (await adherence(deps, patient.id, 7)).percent,
      missedToday: today.filter((d) => d.status === 'missed').length,
      dueToday: today.filter((d) => d.status === 'due').length,
      nextDose: next && { itemName: next.itemName, dose: next.itemDose, plannedAt: next.plannedAt },
      lowStock: stock.filter((s) => s.count <= s.refillAt).length,
      activeItems: items.length,
    };
  }

  router.get('/api/patients', async ({ actor }) => {
    const ids = await visiblePatientIds(deps, actor);
    const list = [];
    for (const id of ids) {
      const p = await store.users.get(id);
      if (p) list.push(await summary(p, actor));
    }
    return list;
  });

  router.get('/api/patients/:patientId', async ({ actor, params }) => {
    const { patient } = await requireView(deps, actor, params.patientId);
    return summary(patient, actor);
  });

  /* ---------- Items: prescriptions and supplements ---------- */

  router.get('/api/patients/:patientId/items', async ({ actor, params, query }) => {
    await requireView(deps, actor, params.patientId);
    const all = query.get('all') === 'true';
    const items = await store.items.find((i) => i.patientId === params.patientId && (all || i.status === 'active'));
    return items.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  });

  router.post('/api/patients/:patientId/items', async ({ actor, params, body }) =>
    new Reply(201, await createItem(deps, actor, params.patientId, body)));

  router.patch('/api/patients/:patientId/items/:itemId', ({ actor, params, body }) =>
    updateItem(deps, actor, params.patientId, params.itemId, body));

  router.post('/api/patients/:patientId/items/:itemId/stop', ({ actor, params }) =>
    stopItem(deps, actor, params.patientId, params.itemId));

  /* ---------- AI engine ---------- */

  router.get('/api/patients/:patientId/ai/report', async ({ actor, params }) => {
    const { patient } = await requireView(deps, actor, params.patientId);
    return patientReport(deps, patient, actor);
  });

  /** Preview: what would happen if this item were added? Nothing is saved. */
  router.post('/api/patients/:patientId/ai/check', async ({ actor, params, body }) => {
    const { patient } = await requireView(deps, actor, params.patientId);
    if (!body.catalogId && !body.name) throw new HttpError(400, 'catalogId or name is required.');
    const times = Array.isArray(body.times) ? body.times.filter(isTimeOfDay) : undefined;
    return checkCandidate(deps, patient, actor, {
      catalogId: body.catalogId ?? `custom:${String(body.name).toLowerCase()}`,
      name: body.name, times, timesPerDay: Number(body.timesPerDay) || undefined, replacesItemId: body.replacesItemId,
    });
  });

  /* ---------- Doses and adherence ---------- */

  router.get('/api/patients/:patientId/doses', async ({ actor, params, query }) => {
    await requireView(deps, actor, params.patientId);
    const day = query.get('date') ?? localDate(deps.now());
    if (!isDay(day)) throw new HttpError(400, 'date must look like 2026-11-05.');
    return dosesForDay(deps, params.patientId, day);
  });

  router.get('/api/patients/:patientId/adherence', async ({ actor, params, query }) => {
    await requireView(deps, actor, params.patientId);
    const days = Math.min(90, Math.max(1, Number(query.get('days') ?? 7)));
    return adherence(deps, params.patientId, days);
  });

  for (const status of ['taken', 'skipped'] as const) {
    router.post(`/api/doses/:doseId/${status === 'taken' ? 'take' : 'skip'}`, async ({ actor, params }) => {
      const dose = await store.doses.get(params.doseId);
      if (!dose) throw new HttpError(404, 'Dose not found.');
      const { role } = await requireRole(deps, actor, dose.patientId, ['patient', 'caregiver'], 'mark doses');
      return markDose(deps, dose, status, role === 'caregiver' ? 'caregiver' : 'user', actor.id);
    });
  }

  /* ---------- Pill levels (pharmacist) ---------- */

  router.get('/api/patients/:patientId/inventory', async ({ actor, params }) => {
    await requireView(deps, actor, params.patientId);
    const items = new Map((await store.items.find((i) => i.patientId === params.patientId)).map((i) => [i.id, i]));
    const stock = await store.inventory.find((s) => s.patientId === params.patientId && items.get(s.itemId)?.status === 'active');
    return stock.map((s) => {
      const item = items.get(s.itemId)!;
      const perDay = item.times.length || 1;
      return { ...s, itemName: item.name, kind: item.kind, perDay, daysLeft: Math.floor(s.count / perDay), low: s.count <= s.refillAt };
    });
  });

  router.post('/api/patients/:patientId/inventory/:itemId/refill', async ({ actor, params, body }) => {
    await requireRole(deps, actor, params.patientId, ['patient', 'pharmacist'], 'record refills');
    const stock = await store.inventory.get(params.itemId);
    if (!stock || stock.patientId !== params.patientId) throw new HttpError(404, 'Item not found.');
    const add = Number(body.add);
    if (!Number.isInteger(add) || add <= 0 || add > 1000) throw new HttpError(400, 'add must be a whole number of pills.');
    const updated = await store.inventory.update(stock.id, { count: stock.count + add });
    await audit(deps, actor.id, 'inventory.refill', params.patientId, stock.itemId, `+${add}`);
    return updated;
  });

  /* ---------- Consent: the care team ---------- */

  router.get('/api/patients/:patientId/care-team', async ({ actor, params }) => {
    await requireView(deps, actor, params.patientId);
    const links = await store.careLinks.find((l) => l.patientId === params.patientId && !l.revokedAt);
    const out = [];
    for (const l of links) {
      const m = await store.users.get(l.memberId);
      if (m) out.push({ linkId: l.id, role: l.memberRole, grantedAt: l.grantedAt, member: { id: m.id, name: m.name, email: m.email } });
    }
    return out;
  });

  router.post('/api/patients/:patientId/care-team', async ({ actor, params, body }) => {
    await requireRole(deps, actor, params.patientId, ['patient'], 'share access');
    const email = String(body.email ?? '').trim().toLowerCase();
    const [member] = await store.users.find((u) => u.email === email);
    if (!member || member.role === 'patient') throw new HttpError(404, 'No doctor, pharmacist or caregiver with that email.');
    const existing = await store.careLinks.find((l) => l.patientId === actor.id && l.memberId === member.id && !l.revokedAt);
    if (existing.length) throw new HttpError(409, `${member.name} already has access.`);
    const link = await store.careLinks.insert({
      id: newId('link'), patientId: actor.id, memberId: member.id,
      memberRole: member.role as 'doctor' | 'pharmacist' | 'caregiver', grantedAt: deps.now().toISOString(),
    });
    await audit(deps, actor.id, 'consent.grant', actor.id, link.id, `${member.role} ${member.name}`);
    await notify(deps, [member.id], { kind: 'device', patientId: actor.id, title: 'New patient shared with you', body: `${actor.name} gave you access as their ${member.role}.` });
    return new Reply(201, link);
  });

  router.delete('/api/patients/:patientId/care-team/:linkId', async ({ actor, params }) => {
    await requireRole(deps, actor, params.patientId, ['patient'], 'remove access');
    const link = await store.careLinks.get(params.linkId);
    if (!link || link.patientId !== actor.id || link.revokedAt) throw new HttpError(404, 'Access not found.');
    await store.careLinks.update(link.id, { revokedAt: deps.now().toISOString() });
    await audit(deps, actor.id, 'consent.revoke', actor.id, link.id, link.memberRole);
    return { ok: true };
  });

  /* ---------- Audit log ---------- */

  router.get('/api/patients/:patientId/audit', async ({ actor, params }) => {
    await requireRole(deps, actor, params.patientId, ['patient', 'doctor'], 'see the audit log');
    const users = new Map((await store.users.all()).map((u) => [u.id, u.name]));
    const rows = await store.audit.find((a) => a.patientId === params.patientId);
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200).map((a) => ({ ...a, actorName: users.get(a.actorId) ?? a.actorId }));
  });

  /* ---------- Notifications ---------- */

  router.get('/api/notifications', async ({ actor }) => {
    const rows = await store.notifications.find((n) => n.userId === actor.id);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  });

  router.post('/api/notifications/:id/read', async ({ actor, params }) => {
    const n = await store.notifications.get(params.id);
    if (!n || n.userId !== actor.id) throw new HttpError(404, 'Notification not found.');
    return store.notifications.update(n.id, { readAt: deps.now().toISOString() });
  });

  router.post('/api/notifications/read-all', async ({ actor }) => {
    const now = deps.now().toISOString();
    for (const n of await store.notifications.find((x) => x.userId === actor.id && !x.readAt)) {
      await store.notifications.update(n.id, { readAt: now });
    }
    return { ok: true };
  });

  /* ---------- Devices, seen from the apps ---------- */

  router.get('/api/patients/:patientId/devices', async ({ actor, params }) => {
    await requireView(deps, actor, params.patientId);
    return (await store.devices.find((d) => d.patientId === params.patientId)).map(hideKey);
  });

  /** Pair a new Pod. The key is shown once; the Pod stores it. */
  router.post('/api/patients/:patientId/devices', async ({ actor, params, body }) => {
    await requireRole(deps, actor, params.patientId, ['patient'], 'pair a Pod');
    const device: Device = {
      id: newId('pod'), patientId: actor.id, type: body.simulated === false ? 'pod' : 'simulated-pod',
      name: String(body.name || 'Smart Pod'), online: false, deviceKey: newId('key'), battery: 100,
    };
    await store.devices.insert(device);
    await audit(deps, actor.id, 'device.pair', actor.id, device.id, device.name);
    return new Reply(201, device);
  });

  /* ---------- Device API: called BY the Pod (see docs/POD-INTEGRATION.md) ---------- */

  router.get('/api/device/schedule', async ({ device }) => {
    await store.devices.update(device.id, { online: true, lastSeenAt: deps.now().toISOString() });
    const doses = await upcomingDoses(deps, device.patientId, 24);
    return {
      deviceId: device.id,
      serverTime: deps.now().toISOString(),
      doses: doses.map((d) => ({ doseId: d.id, itemId: d.itemId, name: d.itemName, dose: d.itemDose, plannedAt: d.plannedAt })),
    };
  }, { auth: 'device' });

  router.post('/api/device/events', async ({ device, body }) => {
    const now = deps.now().toISOString();
    const patch: Partial<Device> = { online: true, lastSeenAt: now };
    if (typeof body.battery === 'number') patch.battery = Math.max(0, Math.min(100, Math.round(body.battery)));
    if (typeof body.firmware === 'string') patch.firmware = body.firmware;
    await store.devices.update(device.id, patch);

    const patient = await store.users.get(device.patientId);
    const caregivers = await careTeam(deps, device.patientId, ['caregiver']);
    switch (body.type) {
      case 'heartbeat':
        if ((patch.battery ?? 100) <= 15) {
          await notify(deps, [device.patientId], { kind: 'device', patientId: device.patientId, title: 'Pod battery low', body: `${device.name} is at ${patch.battery}%.` });
        }
        return { ok: true };
      case 'dispensed': {
        const dose = await store.doses.get(String(body.doseId));
        if (!dose || dose.patientId !== device.patientId) throw new HttpError(404, 'Dose not found for this Pod.');
        return markDose(deps, dose, 'taken', 'pod', device.id, device.id);
      }
      case 'jam':
        await notify(deps, [device.patientId, ...caregivers], {
          kind: 'device', patientId: device.patientId, title: 'Pod needs attention',
          body: `${device.name} reported a jam. ${patient?.name} may need help taking the next dose.`,
        });
        await audit(deps, device.id, 'device.jam', device.patientId, device.id);
        return { ok: true };
      default:
        throw new HttpError(400, 'type must be heartbeat, dispensed or jam.');
    }
  }, { auth: 'device' });
}

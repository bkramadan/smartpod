import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DEMO_POD } from '../src/store/seed.ts';
import { startTestServer } from './helpers.ts';

let t: Awaited<ReturnType<typeof startTestServer>>;
before(async () => { t = await startTestServer(); });
after(async () => { await t.close(); });

test('health and demo accounts need no sign-in', async () => {
  assert.equal((await t.call('GET', '/api/health')).body.ok, true);
  const accounts = (await t.call('GET', '/api/demo/accounts')).body;
  assert.deepEqual(new Set(accounts.map((a: any) => a.role)), new Set(['patient', 'doctor', 'pharmacist', 'caregiver']));
});

test('everything else needs a token', async () => {
  assert.equal((await t.call('GET', '/api/patients')).status, 401);
});

test('a doctor sees only patients who gave consent', async () => {
  const doctor = (await t.call('GET', '/api/patients', { as: 'u-salma' })).body;
  assert.deepEqual(doctor.map((p: any) => p.patient.id).sort(), ['u-karim', 'u-maria']);
  const caregiver = (await t.call('GET', '/api/patients', { as: 'u-lina' })).body;
  assert.deepEqual(caregiver.map((p: any) => p.patient.id), ['u-maria']);
  assert.equal((await t.call('GET', '/api/patients/u-karim', { as: 'u-lina' })).status, 404);
});

test('only doctors change prescriptions', async () => {
  const body = { catalogId: 'amlodipine', dose: '5 mg', times: ['08:00'] };
  assert.equal((await t.call('POST', '/api/patients/u-maria/items', { as: 'u-joseph', body })).status, 403);
  assert.equal((await t.call('POST', '/api/patients/u-maria/items', { as: 'u-lina', body })).status, 403);
  assert.equal((await t.call('POST', '/api/patients/u-maria/items', { as: 'u-maria', body })).status, 403);
});

test('a serious conflict blocks the save until the doctor confirms', async () => {
  const body = { catalogId: 'aspirin', dose: '81 mg', times: ['08:00'] };
  const blocked = await t.call('POST', '/api/patients/u-maria/items', { as: 'u-salma', body });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.report.conflicts[0].severity, 'serious');

  const saved = await t.call('POST', '/api/patients/u-maria/items', { as: 'u-salma', body: { ...body, confirm: true } });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.item.prescribedBy, 'u-salma');

  const patientInbox = (await t.call('GET', '/api/notifications', { as: 'u-maria' })).body;
  assert.ok(patientInbox.some((n: any) => n.kind === 'conflict-warning'));
  const pharmacistInbox = (await t.call('GET', '/api/notifications', { as: 'u-joseph' })).body;
  assert.ok(pharmacistInbox.some((n: any) => n.kind === 'prescription-changed'));
});

test('a pharmacist sees prescriptions and pill levels but cannot edit them', async () => {
  const items = (await t.call('GET', '/api/patients/u-maria/items', { as: 'u-joseph' })).body;
  assert.ok(items.some((i: any) => i.catalogId === 'warfarin'));
  const stock = (await t.call('GET', '/api/patients/u-maria/inventory', { as: 'u-joseph' })).body;
  assert.ok(stock.find((s: any) => s.itemId === 'i-warf').low);
  const refill = await t.call('POST', '/api/patients/u-maria/inventory/i-warf/refill', { as: 'u-joseph', body: { add: 30 } });
  assert.equal(refill.body.count, 36);
  assert.equal((await t.call('PATCH', '/api/patients/u-maria/items/i-warf', { as: 'u-joseph', body: { dose: '1 mg' } })).status, 403);
});

test('a patient adds a supplement and the AI suggests a time', async () => {
  const res = await t.call('POST', '/api/patients/u-karim/items', { as: 'u-karim', body: { catalogId: 'iron' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.item.times.length, 1);
  assert.ok(res.body.report.conflicts.some((c: any) => c.b === 'zinc' || c.a === 'zinc'));
});

test('taking a dose logs it and lowers the pill count', async () => {
  t.setTime(new Date(2026, 10, 5, 12, 30));
  const doses = (await t.call('GET', '/api/patients/u-maria/doses', { as: 'u-maria' })).body;
  const calcium = doses.find((d: any) => d.itemId === 'i-calc' && d.status === 'due');
  const before = (await t.call('GET', '/api/patients/u-maria/inventory', { as: 'u-maria' })).body.find((s: any) => s.itemId === 'i-calc').count;
  const taken = await t.call('POST', `/api/doses/${calcium.id}/take`, { as: 'u-maria' });
  assert.equal(taken.body.status, 'taken');
  assert.equal(taken.body.confirmedBy, 'user');
  const afterCount = (await t.call('GET', '/api/patients/u-maria/inventory', { as: 'u-maria' })).body.find((s: any) => s.itemId === 'i-calc').count;
  assert.equal(afterCount, before - 1);
  assert.equal((await t.call('POST', `/api/doses/${calcium.id}/take`, { as: 'u-maria' })).status, 409);
});

test('the background job reminds, then marks missed and alerts the caregiver', async () => {
  t.setTime(new Date(2026, 10, 5, 19, 5));
  await t.app.tick();
  const reminders = (await t.call('GET', '/api/notifications', { as: 'u-maria' })).body;
  assert.ok(reminders.some((n: any) => n.kind === 'reminder' && n.title.includes('Warfarin')));

  t.setTime(new Date(2026, 10, 5, 20, 10));
  await t.app.tick();
  const doses = (await t.call('GET', '/api/patients/u-maria/doses?date=2026-11-05', { as: 'u-lina' })).body;
  assert.equal(doses.find((d: any) => d.itemId === 'i-warf').status, 'missed');
  const caregiver = (await t.call('GET', '/api/notifications', { as: 'u-lina' })).body;
  assert.ok(caregiver.some((n: any) => n.kind === 'missed-dose'));
});

test('the Pod reads its schedule and confirms a dispensed dose', async () => {
  const headers = { 'x-device-id': DEMO_POD.id, 'x-device-key': DEMO_POD.key };
  assert.equal((await t.call('GET', '/api/device/schedule', { headers: { ...headers, 'x-device-key': 'wrong' } })).status, 401);
  const schedule = (await t.call('GET', '/api/device/schedule', { headers })).body;
  const next = schedule.doses.find((d: any) => d.name === 'Atorvastatin');
  assert.ok(next);
  const res = await t.call('POST', '/api/device/events', { headers, body: { type: 'dispensed', doseId: next.doseId, battery: 77 } });
  assert.equal(res.body.confirmedBy, 'pod');
  const devices = (await t.call('GET', '/api/patients/u-maria/devices', { as: 'u-maria' })).body;
  assert.equal(devices[0].battery, 77);
  assert.equal(devices[0].deviceKey, undefined);
});

test('removing consent removes access straight away', async () => {
  const team = (await t.call('GET', '/api/patients/u-maria/care-team', { as: 'u-maria' })).body;
  const lina = team.find((m: any) => m.role === 'caregiver');
  assert.equal((await t.call('DELETE', `/api/patients/u-maria/care-team/${lina.linkId}`, { as: 'u-maria' })).status, 200);
  assert.equal((await t.call('GET', '/api/patients/u-maria', { as: 'u-lina' })).status, 404);
  const back = await t.call('POST', '/api/patients/u-maria/care-team', { as: 'u-maria', body: { email: 'lina@demo.smartpod' } });
  assert.equal(back.status, 201);
});

test('sign-up creates a profile with the chosen role', async () => {
  const res = await t.call('POST', '/api/auth/register', { body: { name: 'Test Athlete', email: 'athlete@test.io', role: 'patient', segment: 'athlete' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.segment, 'athlete');
  const me = await t.call('GET', '/api/me', { headers: { authorization: `Bearer ${res.body.token}` } });
  assert.equal(me.body.email, 'athlete@test.io');
  const doctorNoLicence = await t.call('POST', '/api/auth/register', { body: { name: 'Dr X', email: 'x@test.io', role: 'doctor' } });
  assert.equal(doctorNoLicence.status, 400);
});

test('a dose cannot be marked taken hours before its time', async () => {
  t.setTime(new Date(2026, 10, 6, 8, 0));
  const doses = (await t.call('GET', '/api/patients/u-maria/doses?date=2026-11-06', { as: 'u-maria' })).body;
  const evening = doses.find((d: any) => d.itemId === 'i-warf');
  assert.equal((await t.call('POST', `/api/doses/${evening.id}/take`, { as: 'u-maria' })).status, 409);
});

test('a patient cannot override a serious conflict', async () => {
  const res = await t.call('POST', '/api/patients/u-maria/items', { as: 'u-maria', body: { catalogId: 'st-johns-wort', confirm: true } });
  assert.equal(res.status, 409);
  assert.equal(res.body.canConfirm, false);
});

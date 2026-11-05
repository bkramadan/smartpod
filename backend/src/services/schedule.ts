/**
 * SCHEDULES AND THE DOSE LOG.
 *
 * - Each active item with times creates one dose per time per day (lazily, when a day
 *   is looked at, and by the background job for today).
 * - The background job (tick) sends reminders, marks late doses as missed and alerts
 *   the patient and caregivers.
 * - Taking a dose lowers the pill count and warns about refills.
 */
import type { AdherenceSummary, ConfirmedBy, DoseEvent, DoseView, Item, User } from '@smartpod/shared';
import { HttpError } from '../http/router.ts';
import { addDays, atLocal, localDate } from '../lib/time.ts';
import { doseId } from '../store/seed.ts';
import { careTeam } from './access.ts';
import type { Deps } from './deps.ts';
import { audit, notify } from './notify.ts';

const activeOn = (item: Item, day: string) =>
  item.status === 'active' && item.startDate <= day && (!item.endDate || item.endDate >= day);

/** Create any missing doses for this patient on this day. */
export async function ensureDoses(deps: Deps, patientId: string, day: string) {
  const items = await deps.store.items.find((i) => i.patientId === patientId && activeOn(i, day));
  for (const item of items) {
    for (const time of item.times) {
      const id = doseId(item.id, day, time);
      if (await deps.store.doses.get(id)) continue;
      const planned = atLocal(day, time);
      // A time set after it already passed today starts tomorrow (no instant "missed").
      if (planned < new Date(item.updatedAt)) continue;
      await deps.store.doses.insert({ id, patientId, itemId: item.id, plannedAt: planned.toISOString(), status: 'due' });
    }
  }
}

/** After an item's times change or it stops: drop its future, not-yet-taken doses. */
export async function refreshFutureDoses(deps: Deps, item: Item) {
  const now = deps.now();
  const future = await deps.store.doses.find(
    (d) => d.itemId === item.id && d.status === 'due' && new Date(d.plannedAt) > now,
  );
  for (const d of future) await deps.store.doses.remove(d.id);
  await ensureDoses(deps, item.patientId, localDate(now));
}

async function toView(deps: Deps, doses: DoseEvent[]): Promise<DoseView[]> {
  const items = new Map((await deps.store.items.all()).map((i) => [i.id, i]));
  return doses
    .map((d) => {
      const item = items.get(d.itemId);
      return {
        ...d,
        itemName: item?.name ?? 'Unknown item',
        itemDose: item?.dose ?? '',
        itemKind: item?.kind ?? 'medicine',
        instructions: item?.instructions,
      };
    })
    .sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));
}

/** Doses for one day. Today and future days are generated on demand; past days show history. */
export async function dosesForDay(deps: Deps, patientId: string, day: string) {
  if (day >= localDate(deps.now())) await ensureDoses(deps, patientId, day);
  const start = atLocal(day, '00:00').getTime();
  const end = start + 24 * 3600 * 1000;
  const doses = await deps.store.doses.find((d) => {
    const t = new Date(d.plannedAt).getTime();
    return d.patientId === patientId && t >= start && t < end;
  });
  return toView(deps, doses);
}

/** Upcoming doses in the next `hours` hours (used by the Pod). */
export async function upcomingDoses(deps: Deps, patientId: string, hours = 24) {
  const now = deps.now();
  const today = localDate(now);
  await ensureDoses(deps, patientId, today);
  await ensureDoses(deps, patientId, addDays(today, 1));
  const until = now.getTime() + hours * 3600 * 1000;
  const doses = await deps.store.doses.find((d) => {
    const t = new Date(d.plannedAt).getTime();
    return d.patientId === patientId && d.status === 'due' && t <= until && t >= now.getTime() - 3600 * 1000;
  });
  return toView(deps, doses);
}

/** A dose can be taken (or skipped) at most this many hours before its planned time. */
export const EARLY_HOURS = 2;

export async function markDose(
  deps: Deps,
  dose: DoseEvent,
  status: 'taken' | 'skipped',
  by: ConfirmedBy,
  actorId: string,
  deviceId?: string,
) {
  if (dose.status === 'taken' || dose.status === 'skipped') {
    throw new HttpError(409, `This dose is already ${dose.status}.`);
  }
  const hoursEarly = (new Date(dose.plannedAt).getTime() - deps.now().getTime()) / 3600000;
  if (hoursEarly > EARLY_HOURS) {
    throw new HttpError(409, `Too early: this dose can be marked from ${EARLY_HOURS} hours before its time.`);
  }
  const now = deps.now().toISOString();
  const updated = await deps.store.doses.update(dose.id, {
    status,
    confirmedBy: status === 'taken' ? by : undefined,
    actualAt: now,
    deviceId,
  });
  await audit(deps, actorId, `dose.${status}`, dose.patientId, dose.id, `confirmed by ${by}`);
  if (status === 'taken') await useOne(deps, dose);
  return updated;
}

/** Lower the pill count by one and warn when it reaches the refill level. */
async function useOne(deps: Deps, dose: DoseEvent) {
  const stock = await deps.store.inventory.get(dose.itemId);
  if (!stock) return;
  const count = Math.max(0, stock.count - 1);
  await deps.store.inventory.update(stock.id, { count });
  if (count === stock.refillAt || count === 0) {
    const item = await deps.store.items.get(dose.itemId);
    const patient = await deps.store.users.get(dose.patientId);
    const pharmacists = await careTeam(deps, dose.patientId, ['pharmacist']);
    const left = count === 0 ? 'has run out of' : `has ${count} left of`;
    await notify(deps, [dose.patientId, ...pharmacists], {
      kind: 'refill',
      patientId: dose.patientId,
      title: `Refill needed: ${item?.name}`,
      body: `${patient?.name} ${left} ${item?.name}.`,
    });
  }
}

export async function adherence(deps: Deps, patientId: string, days = 7): Promise<AdherenceSummary> {
  const now = deps.now();
  const today = localDate(now);
  const daily: AdherenceSummary['daily'] = [];
  let planned = 0, taken = 0, missed = 0, skipped = 0;
  for (let d = days - 1; d >= 0; d--) {
    const day = addDays(today, -d);
    const doses = (await dosesForDay(deps, patientId, day)).filter((x) => new Date(x.plannedAt) <= now);
    const t = doses.filter((x) => x.status === 'taken').length;
    const m = doses.filter((x) => x.status === 'missed').length;
    planned += doses.length;
    taken += t;
    missed += m;
    skipped += doses.filter((x) => x.status === 'skipped').length;
    daily.push({ day, planned: doses.length, taken: t, missed: m });
  }
  return { patientId, days, planned, taken, missed, skipped, percent: planned ? Math.round((taken / planned) * 100) : 100, daily };
}

/**
 * The background job. Runs every 30 seconds in server.ts (and on demand in tests).
 * In a real backend this becomes a scheduled function.
 */
export async function tick(deps: Deps) {
  const now = deps.now();
  const today = localDate(now);
  const patients = await deps.store.users.find((u) => u.role === 'patient');
  for (const p of patients) await ensureDoses(deps, p.id, today);

  const items = new Map((await deps.store.items.all()).map((i) => [i.id, i]));
  const users = new Map((await deps.store.users.all()).map((u) => [u.id, u] as [string, User]));
  const due = await deps.store.doses.find((d) => d.status === 'due' && new Date(d.plannedAt) <= now);

  for (const dose of due) {
    const item = items.get(dose.itemId);
    const planned = new Date(dose.plannedAt);
    const minutesLate = (now.getTime() - planned.getTime()) / 60000;

    if (minutesLate >= deps.config.missedAfterMinutes) {
      await deps.store.doses.update(dose.id, { status: 'missed' });
      const caregivers = await careTeam(deps, dose.patientId, ['caregiver']);
      const name = users.get(dose.patientId)?.name ?? 'The patient';
      const time = planned.toTimeString().slice(0, 5);
      await notify(deps, [dose.patientId, ...caregivers], {
        kind: 'missed-dose',
        patientId: dose.patientId,
        title: `Missed: ${item?.name ?? 'a dose'}`,
        body: `${name} did not take ${item?.name} ${item?.dose} planned at ${time}.`,
      });
    } else if (!dose.remindedAt) {
      await deps.store.doses.update(dose.id, { remindedAt: now.toISOString() });
      await notify(deps, [dose.patientId], {
        kind: 'reminder',
        patientId: dose.patientId,
        title: `Time for ${item?.name}`,
        body: `${item?.dose}${item?.instructions ? ` · ${item.instructions}` : ''}`,
      });
    }
  }

  // Devices not heard from for 10 minutes are shown as offline.
  for (const device of await deps.store.devices.find((d) => d.type !== 'phone' && d.online)) {
    if (!device.lastSeenAt || now.getTime() - new Date(device.lastSeenAt).getTime() > 10 * 60000) {
      await deps.store.devices.update(device.id, { online: false });
    }
  }
}

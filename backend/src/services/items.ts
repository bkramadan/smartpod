/**
 * PRESCRIPTIONS AND SUPPLEMENTS.
 *
 * Every add or change runs through the AI engine first. A SERIOUS conflict blocks
 * the save until the person confirms (`confirm: true`) — the "doctor confirms" rule.
 * Moderate and minor findings are saved and sent as warnings.
 */
import type { AiReport, Item, ItemInput, ItemKind, User } from '@smartpod/shared';
import { catalogById } from '../ai/catalog.ts';
import { HttpError } from '../http/router.ts';
import { isTimeOfDay, localDate } from '../lib/time.ts';
import { careTeam, requireItemEditor } from './access.ts';
import { checkCandidate } from './ai.ts';
import { newId, type Deps } from './deps.ts';
import { audit, notify } from './notify.ts';
import { refreshFutureDoses } from './schedule.ts';


function cleanTimes(times: unknown): string[] | undefined {
  if (times === undefined) return undefined;
  if (!Array.isArray(times) || !times.every(isTimeOfDay)) {
    throw new HttpError(400, 'times must be a list like ["08:00", "20:00"].');
  }
  return [...new Set(times as string[])].sort();
}

async function tellOthers(deps: Deps, actor: User, patient: User, report: AiReport, title: string, body: string) {
  const pharmacists = await careTeam(deps, patient.id, ['pharmacist']);
  const recipients = [patient.id, ...pharmacists].filter((id) => id !== actor.id);
  await notify(deps, recipients, { kind: 'prescription-changed', patientId: patient.id, title, body });

  const important = report.conflicts.filter((c) => c.severity !== 'minor');
  if (important.length) {
    const doctors = await careTeam(deps, patient.id, ['doctor']);
    const top = important[0];
    await notify(deps, [patient.id, ...doctors].filter((id) => id !== actor.id), {
      kind: 'conflict-warning',
      patientId: patient.id,
      title: `${top.severity === 'serious' ? 'Serious' : 'Possible'} conflict: ${top.aName} + ${top.bName}`,
      body: `${top.reason} ${top.advice}`,
    });
  }
}

export async function createItem(deps: Deps, actor: User, patientId: string, input: ItemInput) {
  const entry = input.catalogId ? catalogById.get(input.catalogId) : undefined;
  if (!entry && !input.name) throw new HttpError(400, 'Choose an item from the catalogue or give a name.');
  const kind: ItemKind = entry?.kind ?? input.kind ?? 'supplement';
  const { patient } = await requireItemEditor(deps, actor, patientId, kind);

  const times = cleanTimes(input.times);
  const catalogId = entry?.id ?? `custom:${input.name!.trim().toLowerCase()}`;
  const name = input.name?.trim() || entry!.name;

  const report = await checkCandidate(deps, patient, actor, { catalogId, name, times, timesPerDay: input.timesPerDay });
  if (report.conflicts.some((c) => c.severity === 'serious')) {
    // Only a doctor may accept a serious conflict. A patient is told to ask their doctor.
    if (actor.role !== 'doctor') {
      throw new HttpError(409, 'Serious conflict found. Ask your doctor before adding this.', { report, canConfirm: false });
    }
    if (!input.confirm) {
      throw new HttpError(409, 'Serious conflict found. Review it and confirm to save anyway.', { report, canConfirm: true });
    }
  }

  const now = deps.now();
  const item: Item = {
    id: newId('i'),
    patientId,
    kind,
    catalogId,
    name,
    dose: input.dose?.trim() || entry?.typicalDose || '1',
    times: times?.length ? times : report.timing[0]?.suggestedTimes ?? ['08:00'],
    instructions: input.instructions?.trim() || undefined,
    status: 'active',
    prescribedBy: kind === 'medicine' ? actor.id : undefined,
    createdBy: actor.id,
    startDate: localDate(now),
    updatedAt: now.toISOString(),
  };
  await deps.store.items.insert(item);
  await deps.store.inventory.insert({
    id: item.id, itemId: item.id, patientId, count: Math.max(0, Number(input.count ?? 30)), refillAt: 7,
  });
  await refreshFutureDoses(deps, item);
  await audit(deps, actor.id, 'item.create', patientId, item.id, `${item.name} ${item.dose} at ${item.times.join(', ')}`);
  await tellOthers(deps, actor, patient, report, `New ${kind}: ${item.name}`,
    `${actor.name} added ${item.name} ${item.dose} at ${item.times.join(', ')}.`);
  return { item, report };
}

export async function updateItem(deps: Deps, actor: User, patientId: string, itemId: string, input: ItemInput) {
  const item = await deps.store.items.get(itemId);
  if (!item || item.patientId !== patientId) throw new HttpError(404, 'Item not found.');
  const { patient } = await requireItemEditor(deps, actor, patientId, item.kind);
  if (item.status !== 'active') throw new HttpError(409, 'This item is stopped; add it again instead.');

  const times = cleanTimes(input.times) ?? item.times;
  if (!times.length) throw new HttpError(400, 'An item needs at least one time.');
  const report = await checkCandidate(deps, patient, actor, {
    catalogId: item.catalogId, name: item.name, times, replacesItemId: item.id,
  });

  const before = `${item.dose} at ${item.times.join(', ')}`;
  const updated = await deps.store.items.update(item.id, {
    dose: input.dose?.trim() || item.dose,
    times,
    instructions: input.instructions !== undefined ? input.instructions.trim() || undefined : item.instructions,
    updatedAt: deps.now().toISOString(),
  });
  await refreshFutureDoses(deps, updated);
  const after = `${updated.dose} at ${updated.times.join(', ')}`;
  await audit(deps, actor.id, 'item.update', patientId, item.id, `${before} → ${after}`);
  await tellOthers(deps, actor, patient, report, `${item.name} changed`, `${actor.name} changed ${item.name}: ${before} → ${after}.`);
  return { item: updated, report };
}

export async function stopItem(deps: Deps, actor: User, patientId: string, itemId: string) {
  const item = await deps.store.items.get(itemId);
  if (!item || item.patientId !== patientId) throw new HttpError(404, 'Item not found.');
  const { patient } = await requireItemEditor(deps, actor, patientId, item.kind);
  const updated = await deps.store.items.update(item.id, {
    status: 'stopped', endDate: localDate(deps.now()), updatedAt: deps.now().toISOString(),
  });
  await refreshFutureDoses(deps, updated);
  await audit(deps, actor.id, 'item.stop', patientId, item.id, item.name);
  const pharmacists = await careTeam(deps, patientId, ['pharmacist']);
  await notify(deps, [patient.id, ...pharmacists].filter((id) => id !== actor.id), {
    kind: 'prescription-changed', patientId, title: `${item.name} stopped`, body: `${actor.name} stopped ${item.name}.`,
  });
  return { item: updated };
}

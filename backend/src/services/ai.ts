/**
 * Connects the AI engine to patient data: builds the full report for a patient's
 * current items, or checks one new item before it is saved.
 */
import type { AiReport, Item, User } from '@smartpod/shared';
import { catalogById } from '../ai/catalog.ts';
import { analyse, DEFAULT_ROUTINE, type EngineItem } from '../ai/engine.ts';
import { DISCLAIMER } from '../ai/explainer.ts';
import type { Deps } from './deps.ts';

export const activeItems = (deps: Deps, patientId: string) =>
  deps.store.items.find((i) => i.patientId === patientId && i.status === 'active');

const toEngine = (i: Item): EngineItem => ({ id: i.id, catalogId: i.catalogId, name: i.name, times: i.times });

/** Report on everything the patient takes now. */
export async function patientReport(deps: Deps, patient: User, viewer: User): Promise<AiReport> {
  const items = (await activeItems(deps, patient.id)).map(toEngine);
  const findings = analyse(items, patient.routine ?? DEFAULT_ROUTINE);
  const words = await deps.explainer.explain(findings, viewer);
  return { ...findings, ...words, disclaimer: DISCLAIMER };
}

export interface Candidate {
  catalogId: string;
  name?: string;
  times?: string[];
  timesPerDay?: number;
  /** When editing, the id of the item being replaced (so it is not checked against itself). */
  replacesItemId?: string;
}

/** Check a new or changed item against what the patient already takes. */
export async function checkCandidate(deps: Deps, patient: User, viewer: User, c: Candidate): Promise<AiReport> {
  const others = (await activeItems(deps, patient.id)).filter((i) => i.id !== c.replacesItemId).map(toEngine);
  const name = c.name || catalogById.get(c.catalogId)?.name || c.catalogId;
  const times = c.times?.length ? c.times : Array(Math.max(1, c.timesPerDay ?? 1)).fill('');
  const candidate: EngineItem = { id: 'candidate', catalogId: c.catalogId, name, times: times.filter(Boolean) };

  // Planner uses the dose count; conflicts use real times only.
  const planningItem = { ...candidate, times: times.map((t) => t || '00:00') };
  const full = analyse([...others, candidate], patient.routine ?? DEFAULT_ROUTINE, c.catalogId);
  const timing = analyse([...others, planningItem], patient.routine ?? DEFAULT_ROUTINE).timing.filter(
    (t) => t.itemId === 'candidate',
  );
  const findings = { conflicts: full.conflicts, timing, food: full.food };
  const words = await deps.explainer.explain(findings, viewer);
  const unknown = !catalogById.has(c.catalogId);
  return {
    ...findings,
    ...words,
    explanation: unknown
      ? `${name} is not in the catalogue, so it could not be checked for conflicts. Ask the pharmacist.`
      : words.explanation,
    disclaimer: DISCLAIMER,
  };
}

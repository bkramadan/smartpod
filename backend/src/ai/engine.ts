/**
 * AI ENGINE — the rules part.
 *
 * Given the items a person takes (and their daily routine) it returns:
 *   1. conflicts  — item↔item and item↔food, from rules.ts
 *   2. timing     — the best time of day for each item, keeping conflicting items apart
 *   3. food tips  — what to eat or avoid around each item
 *
 * It is deterministic: the same input always gives the same answer, which makes it
 * testable and checkable. The explainer (explainer.ts) only turns this result into
 * friendly words; it never adds or removes a finding.
 */
import type { Conflict, DailyRoutine, FoodTip, Severity, TimingSuggestion } from '@smartpod/shared';
import { fromMinutes, toMinutes } from '../lib/time.ts';
import { catalogById, foodById, type Anchor, type CatalogEntry } from './catalog.ts';
import { FOOD_RULES, ITEM_RULES } from './rules.ts';

/** The minimum the engine needs to know about an item. */
export interface EngineItem {
  id: string;
  catalogId: string;
  name: string;
  /** Current times; their count is the number of doses per day. */
  times: string[];
}

export const DEFAULT_ROUTINE: DailyRoutine = {
  wake: '07:00',
  breakfast: '07:45',
  lunch: '13:00',
  dinner: '19:00',
  sleep: '23:00',
};

const severityRank: Record<Severity, number> = { serious: 0, moderate: 1, minor: 2 };

const sameRule = (a: string, b: string, ra: string, rb: string) => (a === ra && b === rb) || (a === rb && b === ra);

/** All conflicts among the items, optionally only those involving `focusCatalogId`. */
export function findConflicts(items: EngineItem[], focusCatalogId?: string): Conflict[] {
  const conflicts: Conflict[] = [];
  const known = items.filter((i) => catalogById.has(i.catalogId));

  for (let x = 0; x < known.length; x++) {
    for (let y = x + 1; y < known.length; y++) {
      const A = known[x];
      const B = known[y];
      if (A.catalogId === B.catalogId) continue;
      if (focusCatalogId && A.catalogId !== focusCatalogId && B.catalogId !== focusCatalogId) continue;
      const rule = ITEM_RULES.find((r) => sameRule(A.catalogId, B.catalogId, r.a, r.b));
      if (!rule) continue;
      const conflict: Conflict = {
        a: A.catalogId, b: B.catalogId, aName: A.name, bName: B.name, type: 'item-item',
        severity: rule.severity, reason: rule.reason, advice: rule.advice, separateHours: rule.separateHours,
      };
      const gap = smallestGapHours(A.times, B.times);
      if (rule.separateHours && gap !== undefined) {
        conflict.currentGapHours = gap;
        conflict.advice +=
          gap < rule.separateHours
            ? ` Right now they are only ${gap} h apart.`
            : ` Your current times already keep them ${gap} h apart.`;
      }
      conflicts.push(conflict);
    }
  }

  for (const item of known) {
    if (focusCatalogId && item.catalogId !== focusCatalogId) continue;
    for (const rule of FOOD_RULES.filter((r) => r.a === item.catalogId)) {
      conflicts.push({
        a: item.catalogId, b: rule.b, aName: item.name, bName: foodById.get(rule.b)?.name ?? rule.b,
        type: 'item-food', severity: rule.severity, reason: rule.reason, advice: rule.advice,
      });
    }
  }

  // Remove duplicates when the same medicine appears twice, then sort serious first.
  const seen = new Set<string>();
  return conflicts
    .filter((c) => {
      const key = [c.a, c.b].sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((p, q) => severityRank[p.severity] - severityRank[q.severity]);
}

function smallestGapHours(a: string[], b: string[]) {
  if (!a.length || !b.length) return undefined;
  let best = Infinity;
  for (const t1 of a) for (const t2 of b) best = Math.min(best, Math.abs(toMinutes(t1) - toMinutes(t2)));
  return Math.round((best / 60) * 10) / 10;
}

function anchorMinutes(anchor: Anchor, routine: DailyRoutine) {
  if (anchor === 'training') return toMinutes(routine.training ?? routine.lunch);
  return toMinutes(routine[anchor]);
}

/** Order in which items get their time: the strictest go first. */
function placementOrder(entry: CatalogEntry | undefined) {
  if (!entry) return 9;
  let rank = entry.kind === 'medicine' ? 0 : 3;
  if (entry.food === 'without') rank -= 1;
  return rank;
}

/** Best time of day for each item, keeping items with a spacing rule apart. */
export function planTiming(items: EngineItem[], routine: DailyRoutine = DEFAULT_ROUTINE): TimingSuggestion[] {
  const wake = toMinutes(routine.wake);
  const sleep = toMinutes(routine.sleep);
  const placed: { catalogId: string; minutes: number[] }[] = [];
  const results = new Map<string, TimingSuggestion>();

  const ordered = [...items].sort(
    (p, q) => placementOrder(catalogById.get(p.catalogId)) - placementOrder(catalogById.get(q.catalogId)),
  );

  for (const item of ordered) {
    const entry = catalogById.get(item.catalogId);
    const dosesPerDay = Math.max(1, item.times.length);
    if (!entry) {
      results.set(item.id, {
        itemId: item.id, catalogId: item.catalogId, name: item.name,
        suggestedTimes: item.times.length ? item.times : [routine.breakfast],
        why: 'Not in the catalogue, so the AI cannot suggest a time. Follow the label or the pharmacist.',
      });
      continue;
    }

    // Spacing rules with items already placed.
    const spacing = placed.flatMap((p) => {
      const rule = ITEM_RULES.find((r) => r.separateHours && sameRule(r.a, r.b, entry.id, p.catalogId));
      return rule ? [{ minutes: p.minutes, gap: rule.separateHours! * 60, other: p.catalogId }] : [];
    });
    const latest = entry.avoidBeforeSleepHours ? sleep - entry.avoidBeforeSleepHours * 60 : sleep;
    const ok = (m: number) =>
      m >= wake && m <= latest && spacing.every((s) => s.minutes.every((o) => Math.abs(o - m) >= s.gap));

    let minutes: number[];
    let note = '';
    if (dosesPerDay === 1) {
      const candidates = entry.slots.map((sl) => anchorMinutes(sl.anchor, routine) + sl.offset);
      let pick = candidates.find(ok);
      if (pick === undefined) {
        // Scan the waking day in 30-minute steps from the preferred slot.
        for (let step = 30; step <= 16 * 60 && pick === undefined; step += 30) {
          for (const c of [candidates[0] + step, candidates[0] - step]) if (ok(c)) { pick = c; break; }
        }
        if (pick !== undefined) {
          const names = spacing.map((s) => catalogById.get(s.other)?.name ?? s.other).join(', ');
          note = ` Moved to keep it apart from ${names}.`;
        }
      }
      if (pick === undefined) {
        pick = candidates[0];
        note = ' Could not keep it far enough from other items; ask the pharmacist.';
      }
      minutes = [pick];
    } else {
      // Several doses a day: use the preferred slots, then spread over meals.
      const pool = [
        ...entry.slots.map((sl) => anchorMinutes(sl.anchor, routine) + sl.offset),
        toMinutes(routine.breakfast), toMinutes(routine.lunch), toMinutes(routine.dinner), sleep - 60,
      ];
      minutes = [...new Set(pool)].slice(0, dosesPerDay).sort((p, q) => p - q);
    }

    placed.push({ catalogId: entry.id, minutes });
    results.set(item.id, {
      itemId: item.id, catalogId: entry.id, name: item.name,
      suggestedTimes: minutes.map(fromMinutes), why: entry.timingWhy + note,
    });
  }

  // Return in the same order as the input.
  return items.map((i) => results.get(i.id)!);
}

/** Food guidance for the items. */
export function foodTips(items: EngineItem[]): FoodTip[] {
  const tips: FoodTip[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const entry = catalogById.get(item.catalogId);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const food = entry.food === 'with' ? 'Take with food.' : entry.food === 'without' ? 'Take on an empty stomach.' : '';
    const parts = [food, entry.foodTip].filter(Boolean);
    if (parts.length) tips.push({ catalogId: entry.id, name: item.name, tip: parts.join(' ') });
  }
  return tips;
}

export function analyse(items: EngineItem[], routine?: DailyRoutine, focusCatalogId?: string) {
  return {
    conflicts: findConflicts(items, focusCatalogId),
    timing: planTiming(items, routine),
    food: foodTips(focusCatalogId ? items.filter((i) => i.catalogId === focusCatalogId) : items),
  };
}

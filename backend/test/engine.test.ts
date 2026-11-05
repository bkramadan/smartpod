import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyse, findConflicts, planTiming } from '../src/ai/engine.ts';
import { toMinutes } from '../src/lib/time.ts';

const item = (catalogId: string, times: string[] = []) => ({ id: catalogId, catalogId, name: catalogId, times });

test('finds a serious medicine-medicine conflict', () => {
  const conflicts = findConflicts([item('warfarin', ['19:00']), item('aspirin', ['08:00'])]);
  assert.equal(conflicts.length >= 1, true);
  assert.equal(conflicts[0].severity, 'serious');
  assert.deepEqual([conflicts[0].a, conflicts[0].b].sort(), ['aspirin', 'warfarin']);
});

test('finds food conflicts and sorts serious first', () => {
  const conflicts = findConflicts([item('iron'), item('simvastatin')]);
  assert.equal(conflicts[0].severity, 'serious');
  assert.equal(conflicts[0].b, 'grapefruit');
  assert.ok(conflicts.some((c) => c.b === 'dairy'));
});

test('flags items whose current times are too close', () => {
  const [c] = findConflicts([item('levothyroxine', ['07:00']), item('calcium', ['08:00'])]);
  assert.equal(c.currentGapHours, 1);
  assert.match(c.advice, /only 1 h apart/);
});

test('focus only returns conflicts involving the new item', () => {
  const conflicts = findConflicts([item('warfarin'), item('aspirin'), item('calcium')], 'calcium');
  assert.equal(conflicts.length, 0);
});

test('timing keeps levothyroxine and calcium at least 4 hours apart', () => {
  const plan = planTiming([item('calcium', ['x']), item('levothyroxine', ['x'])], {
    wake: '07:00', breakfast: '08:00', lunch: '09:30', dinner: '19:00', sleep: '23:00',
  });
  const levo = toMinutes(plan.find((p) => p.catalogId === 'levothyroxine')!.suggestedTimes[0]);
  const calc = toMinutes(plan.find((p) => p.catalogId === 'calcium')!.suggestedTimes[0]);
  assert.ok(Math.abs(levo - calc) >= 240, `gap was ${Math.abs(levo - calc)} minutes`);
});

test('caffeine is never placed within 6 hours of sleep', () => {
  const [plan] = planTiming([item('caffeine', ['x'])], {
    wake: '07:00', breakfast: '07:30', lunch: '12:00', dinner: '19:00', sleep: '22:00', training: '20:00',
  });
  assert.ok(toMinutes(plan.suggestedTimes[0]) <= toMinutes('16:00'));
});

test('several doses a day get several times', () => {
  const [plan] = planTiming([item('metformin', ['a', 'b'])]);
  assert.equal(plan.suggestedTimes.length, 2);
});

test('unknown items are not checked but still get a time', () => {
  const result = analyse([item('custom:beetroot juice')]);
  assert.equal(result.conflicts.length, 0);
  assert.match(result.timing[0].why, /Not in the catalogue/);
});

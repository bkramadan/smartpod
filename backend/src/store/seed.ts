/**
 * Demo data loaded on first start and by "Reset demo".
 * All people are fictional. Dates are calculated from "now", so the demo always
 * shows the last 7 days of history.
 */
import type {
  AuditEntry,
  CareLink,
  DailyRoutine,
  Device,
  DoseEvent,
  Inventory,
  Item,
  Notification,
  User,
} from '@smartpod/shared';
import { addDays, atLocal, localDate } from '../lib/time.ts';

export interface SeedData {
  users: User[];
  careLinks: CareLink[];
  items: Item[];
  doses: DoseEvent[];
  inventory: Inventory[];
  devices: Device[];
  notifications: Notification[];
  audit: AuditEntry[];
}

/** Fixed credentials for the simulated Pod (see pod-simulator/). Mock only. */
export const DEMO_POD = { id: 'pod-maria-01', key: 'demo-pod-key' };

export const doseId = (itemId: string, day: string, time: string) => `dose_${itemId}_${day}_${time.replace(':', '')}`;

/** Cheap repeatable "random" number between 0 and 1 from a string. */
function chance(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function buildSeed(now: Date): SeedData {
  const today = localDate(now);
  const start = addDays(today, -30);
  const created = atLocal(start, '09:00').toISOString();

  const mariaRoutine: DailyRoutine = { wake: '06:30', breakfast: '07:30', lunch: '12:30', dinner: '18:30', sleep: '22:30' };
  const karimRoutine: DailyRoutine = { wake: '07:00', breakfast: '07:30', lunch: '13:00', dinner: '20:00', sleep: '23:30', training: '17:30' };

  const users: User[] = [
    { id: 'u-maria', name: 'Maria Haddad', email: 'maria@demo.smartpod', role: 'patient', segment: 'medication', routine: mariaRoutine, createdAt: created },
    { id: 'u-karim', name: 'Karim Nassar', email: 'karim@demo.smartpod', role: 'patient', segment: 'athlete', routine: karimRoutine, createdAt: created },
    { id: 'u-salma', name: 'Dr. Salma Aoun', email: 'salma@demo.smartpod', role: 'doctor', licenceNumber: 'DEMO-12345', createdAt: created },
    { id: 'u-joseph', name: 'Joseph Khoury', email: 'joseph@demo.smartpod', role: 'pharmacist', createdAt: created },
    { id: 'u-lina', name: 'Lina Haddad', email: 'lina@demo.smartpod', role: 'caregiver', createdAt: created },
  ];

  const careLinks: CareLink[] = [
    { id: 'link-1', patientId: 'u-maria', memberId: 'u-salma', memberRole: 'doctor', grantedAt: created },
    { id: 'link-2', patientId: 'u-maria', memberId: 'u-joseph', memberRole: 'pharmacist', grantedAt: created },
    { id: 'link-3', patientId: 'u-maria', memberId: 'u-lina', memberRole: 'caregiver', grantedAt: created },
    { id: 'link-4', patientId: 'u-karim', memberId: 'u-salma', memberRole: 'doctor', grantedAt: created },
  ];

  const item = (
    id: string, patientId: string, kind: Item['kind'], catalogId: string, name: string, dose: string,
    times: string[], by: string, instructions?: string,
  ): Item => ({
    id, patientId, kind, catalogId, name, dose, times, instructions, status: 'active',
    prescribedBy: kind === 'medicine' ? by : undefined, createdBy: by, startDate: start, updatedAt: created,
  });

  const items: Item[] = [
    item('i-levo', 'u-maria', 'medicine', 'levothyroxine', 'Levothyroxine', '50 mcg', ['06:45'], 'u-salma', 'Empty stomach, 45 min before breakfast'),
    item('i-warf', 'u-maria', 'medicine', 'warfarin', 'Warfarin', '5 mg', ['19:00'], 'u-salma', 'Same time every evening'),
    item('i-ator', 'u-maria', 'medicine', 'atorvastatin', 'Atorvastatin', '20 mg', ['21:30'], 'u-salma'),
    item('i-calc', 'u-maria', 'supplement', 'calcium', 'Calcium', '600 mg', ['12:40'], 'u-maria'),
    item('i-vitd', 'u-maria', 'supplement', 'vitamin-d', 'Vitamin D', '1000 IU', ['12:40'], 'u-maria'),
    item('i-crea', 'u-karim', 'supplement', 'creatine', 'Creatine', '5 g', ['18:15'], 'u-karim'),
    item('i-caff', 'u-karim', 'supplement', 'caffeine', 'Caffeine (pre-workout)', '200 mg', ['16:45'], 'u-karim'),
    item('i-zinc', 'u-karim', 'supplement', 'zinc', 'Zinc', '15 mg', ['13:10'], 'u-karim'),
    item('i-mag', 'u-karim', 'supplement', 'magnesium', 'Magnesium', '300 mg', ['22:30'], 'u-karim'),
    item('i-fish', 'u-karim', 'supplement', 'fish-oil', 'Fish oil (omega-3)', '1000 mg', ['20:10'], 'u-karim'),
  ];

  // Dose history: last 6 days, plus today's doses that are already more than an hour old.
  const doses: DoseEvent[] = [];
  const cutoff = now.getTime() - 60 * 60 * 1000;
  for (let d = -6; d <= 0; d++) {
    const day = addDays(today, d);
    for (const it of items) {
      for (const time of it.times) {
        const planned = atLocal(day, time);
        if (planned.getTime() > cutoff) continue;
        const id = doseId(it.id, day, time);
        const r = chance(id);
        const isMaria = it.patientId === 'u-maria';
        const missRate = isMaria ? (it.id === 'i-ator' ? 0.3 : 0.08) : 0.18;
        const status = r < missRate ? 'missed' : r < missRate + 0.03 ? 'skipped' : 'taken';
        const late = Math.round(chance(id + 'late') * 25);
        doses.push({
          id, patientId: it.patientId, itemId: it.id, plannedAt: planned.toISOString(), status,
          confirmedBy: status === 'taken' ? (isMaria ? 'pod' : 'user') : undefined,
          actualAt: status === 'taken' ? new Date(planned.getTime() + late * 60000).toISOString() : undefined,
          deviceId: status === 'taken' && isMaria ? DEMO_POD.id : undefined,
          remindedAt: planned.toISOString(),
        });
      }
    }
  }

  const inventory: Inventory[] = [
    { id: 'i-levo', itemId: 'i-levo', patientId: 'u-maria', count: 24, refillAt: 7 },
    { id: 'i-warf', itemId: 'i-warf', patientId: 'u-maria', count: 6, refillAt: 7 },
    { id: 'i-ator', itemId: 'i-ator', patientId: 'u-maria', count: 41, refillAt: 7 },
    { id: 'i-calc', itemId: 'i-calc', patientId: 'u-maria', count: 52, refillAt: 10 },
    { id: 'i-vitd', itemId: 'i-vitd', patientId: 'u-maria', count: 80, refillAt: 10 },
    { id: 'i-crea', itemId: 'i-crea', patientId: 'u-karim', count: 18, refillAt: 5 },
    { id: 'i-caff', itemId: 'i-caff', patientId: 'u-karim', count: 33, refillAt: 5 },
    { id: 'i-zinc', itemId: 'i-zinc', patientId: 'u-karim', count: 60, refillAt: 10 },
    { id: 'i-mag', itemId: 'i-mag', patientId: 'u-karim', count: 45, refillAt: 10 },
    { id: 'i-fish', itemId: 'i-fish', patientId: 'u-karim', count: 4, refillAt: 10 },
  ];

  const devices: Device[] = [
    { id: DEMO_POD.id, patientId: 'u-maria', type: 'simulated-pod', name: "Maria's Smart Pod (simulated)", battery: 82, online: false, firmware: 'sim-0.1', deviceKey: DEMO_POD.key, lastSeenAt: atLocal(addDays(today, -1), '21:30').toISOString() },
    { id: 'phone-karim', patientId: 'u-karim', type: 'phone', name: "Karim's phone", online: true, deviceKey: 'phone-only', lastSeenAt: now.toISOString() },
  ];

  const yesterday = atLocal(addDays(today, -1), '20:05').toISOString();
  const notifications: Notification[] = [
    { id: 'n-1', userId: 'u-joseph', patientId: 'u-maria', kind: 'refill', title: 'Refill soon: Warfarin', body: 'Maria Haddad has 6 tablets of Warfarin left.', createdAt: yesterday },
    { id: 'n-2', userId: 'u-maria', patientId: 'u-maria', kind: 'refill', title: 'Refill soon: Warfarin', body: 'You have 6 tablets of Warfarin left.', createdAt: yesterday },
    { id: 'n-3', userId: 'u-karim', patientId: 'u-karim', kind: 'refill', title: 'Running low: Fish oil', body: 'You have 4 capsules of Fish oil left.', createdAt: yesterday },
  ];

  const audit: AuditEntry[] = [
    { id: 'a-1', actorId: 'u-salma', action: 'item.create', patientId: 'u-maria', recordId: 'i-warf', detail: 'Warfarin 5 mg at 19:00', at: created },
  ];

  return { users, careLinks, items, doses, inventory, devices, notifications, audit };
}

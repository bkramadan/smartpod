/**
 * AI ENGINE — CATALOGUE (demo data)
 *
 * ⚠️  ILLUSTRATIVE DATA FOR THE PROTOTYPE ONLY. NOT CLINICALLY VALIDATED.
 * Before any real use this file is replaced by a licensed drug and supplement
 * database, reviewed by a pharmacist. See docs/AI-ENGINE.md.
 *
 * Each entry says how an item is best timed. The engine reads `slots` in order of
 * preference and places each dose at the first slot that keeps clear of conflicts.
 */

export type Anchor = 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep' | 'training';

export interface Slot {
  anchor: Anchor;
  /** Minutes before (negative) or after (positive) the anchor. */
  offset: number;
}

export interface CatalogEntry {
  id: string;
  name: string;
  kind: 'medicine' | 'supplement';
  /** Usual strength, shown as a hint in forms. */
  typicalDose: string;
  food: 'with' | 'without' | 'either';
  /** Preferred places in the day, best first (for once-a-day items). */
  slots: Slot[];
  /** Why this timing — shown to the user. */
  timingWhy: string;
  /** Extra food guidance for this item. */
  foodTip?: string;
  /** Avoid within this many hours of sleep (e.g. caffeine). */
  avoidBeforeSleepHours?: number;
}

const s = (anchor: Anchor, offset = 0): Slot => ({ anchor, offset });

export const CATALOG: CatalogEntry[] = [
  // ---------- Medicines ----------
  {
    id: 'levothyroxine', name: 'Levothyroxine', kind: 'medicine', typicalDose: '50 mcg', food: 'without',
    slots: [s('breakfast', -45), s('wake')],
    timingWhy: 'Works best on an empty stomach, 30–60 minutes before breakfast.',
    foodTip: 'Wait 30–60 minutes before coffee or breakfast.',
  },
  {
    id: 'warfarin', name: 'Warfarin', kind: 'medicine', typicalDose: '5 mg', food: 'either',
    slots: [s('dinner', 30), s('dinner')],
    timingWhy: 'Take at the same time every evening so blood tests stay comparable.',
    foodTip: 'Keep the amount of leafy green vegetables steady from week to week.',
  },
  {
    id: 'aspirin', name: 'Aspirin (low dose)', kind: 'medicine', typicalDose: '81 mg', food: 'with',
    slots: [s('breakfast', 10), s('lunch', 10)],
    timingWhy: 'With food to protect the stomach.',
  },
  {
    id: 'ibuprofen', name: 'Ibuprofen', kind: 'medicine', typicalDose: '400 mg', food: 'with',
    slots: [s('lunch', 10), s('dinner', 10)],
    timingWhy: 'With food to protect the stomach.',
  },
  {
    id: 'atorvastatin', name: 'Atorvastatin', kind: 'medicine', typicalDose: '20 mg', food: 'either',
    slots: [s('sleep', -60), s('dinner', 60)],
    timingWhy: 'Any time of day works; the evening is easy to remember.',
  },
  {
    id: 'simvastatin', name: 'Simvastatin', kind: 'medicine', typicalDose: '20 mg', food: 'either',
    slots: [s('sleep', -45), s('dinner', 60)],
    timingWhy: 'Works best taken in the evening.',
  },
  {
    id: 'metformin', name: 'Metformin', kind: 'medicine', typicalDose: '500 mg', food: 'with',
    slots: [s('breakfast', 10), s('dinner', 10), s('lunch', 10)],
    timingWhy: 'With meals to reduce stomach upset.',
  },
  {
    id: 'omeprazole', name: 'Omeprazole', kind: 'medicine', typicalDose: '20 mg', food: 'without',
    slots: [s('breakfast', -30), s('dinner', -30)],
    timingWhy: 'About 30 minutes before a meal, usually breakfast.',
  },
  {
    id: 'ciprofloxacin', name: 'Ciprofloxacin', kind: 'medicine', typicalDose: '500 mg', food: 'either',
    slots: [s('wake', 15), s('dinner', 60)],
    timingWhy: 'Twice a day, about 12 hours apart, away from minerals and dairy.',
  },
  {
    id: 'sertraline', name: 'Sertraline', kind: 'medicine', typicalDose: '50 mg', food: 'either',
    slots: [s('breakfast', 10), s('dinner', 10)],
    timingWhy: 'Same time each day; morning if it affects sleep.',
  },
  {
    id: 'lisinopril', name: 'Lisinopril', kind: 'medicine', typicalDose: '10 mg', food: 'either',
    slots: [s('breakfast'), s('wake', 30)],
    timingWhy: 'Same time each day, usually morning.',
  },
  {
    id: 'amlodipine', name: 'Amlodipine', kind: 'medicine', typicalDose: '5 mg', food: 'either',
    slots: [s('breakfast'), s('dinner')],
    timingWhy: 'Same time each day.',
  },

  // ---------- Supplements ----------
  {
    id: 'calcium', name: 'Calcium', kind: 'supplement', typicalDose: '600 mg', food: 'with',
    slots: [s('lunch', 10), s('dinner', 10)],
    timingWhy: 'With a meal for better absorption.',
  },
  {
    id: 'iron', name: 'Iron', kind: 'supplement', typicalDose: '65 mg', food: 'without',
    slots: [s('breakfast', 120), s('lunch', -60), s('wake', 30)],
    timingWhy: 'Absorbed best between meals; vitamin C helps.',
    foodTip: 'Take with orange juice rather than tea, coffee or milk.',
  },
  {
    id: 'magnesium', name: 'Magnesium', kind: 'supplement', typicalDose: '300 mg', food: 'either',
    slots: [s('sleep', -60), s('dinner', 60)],
    timingWhy: 'Often taken in the evening; can help relaxation.',
  },
  {
    id: 'vitamin-d', name: 'Vitamin D', kind: 'supplement', typicalDose: '1000 IU', food: 'with',
    slots: [s('lunch', 10), s('dinner', 10), s('breakfast', 10)],
    timingWhy: 'With the meal that contains the most fat, for absorption.',
  },
  {
    id: 'vitamin-k', name: 'Vitamin K', kind: 'supplement', typicalDose: '100 mcg', food: 'with',
    slots: [s('breakfast', 10)],
    timingWhy: 'With a meal.',
  },
  {
    id: 'vitamin-c', name: 'Vitamin C', kind: 'supplement', typicalDose: '500 mg', food: 'either',
    slots: [s('breakfast', 10)],
    timingWhy: 'Morning, with breakfast.',
  },
  {
    id: 'zinc', name: 'Zinc', kind: 'supplement', typicalDose: '15 mg', food: 'with',
    slots: [s('lunch', 10), s('dinner', 10)],
    timingWhy: 'With food to avoid nausea.',
  },
  {
    id: 'fish-oil', name: 'Fish oil (omega-3)', kind: 'supplement', typicalDose: '1000 mg', food: 'with',
    slots: [s('lunch', 10), s('dinner', 10), s('breakfast', 10)],
    timingWhy: 'With a meal to reduce aftertaste and improve absorption.',
  },
  {
    id: 'multivitamin', name: 'Multivitamin', kind: 'supplement', typicalDose: '1 tablet', food: 'with',
    slots: [s('breakfast', 10)],
    timingWhy: 'With breakfast.',
  },
  {
    id: 'st-johns-wort', name: "St John's wort", kind: 'supplement', typicalDose: '300 mg', food: 'with',
    slots: [s('breakfast', 10)],
    timingWhy: 'With breakfast.',
  },
  {
    id: 'ginkgo', name: 'Ginkgo biloba', kind: 'supplement', typicalDose: '120 mg', food: 'with',
    slots: [s('breakfast', 10)],
    timingWhy: 'With breakfast.',
  },
  {
    id: 'potassium', name: 'Potassium', kind: 'supplement', typicalDose: '99 mg', food: 'with',
    slots: [s('lunch', 10)],
    timingWhy: 'With food and water.',
  },
  {
    id: 'melatonin', name: 'Melatonin', kind: 'supplement', typicalDose: '1 mg', food: 'either',
    slots: [s('sleep', -45)],
    timingWhy: '30–60 minutes before bed.',
  },
  {
    id: 'creatine', name: 'Creatine', kind: 'supplement', typicalDose: '5 g', food: 'with',
    slots: [s('training', 45), s('lunch', 10)],
    timingWhy: 'Timing matters little; after training with a meal is easy to remember.',
    foodTip: 'Drink plenty of water through the day.',
  },
  {
    id: 'caffeine', name: 'Caffeine (pre-workout)', kind: 'supplement', typicalDose: '200 mg', food: 'either',
    slots: [s('training', -45), s('breakfast')],
    timingWhy: 'About 45 minutes before training, and not too close to bedtime.',
    avoidBeforeSleepHours: 6,
  },
  {
    id: 'whey-protein', name: 'Whey protein', kind: 'supplement', typicalDose: '25 g', food: 'either',
    slots: [s('training', 30), s('breakfast')],
    timingWhy: 'Within a couple of hours after training.',
  },
];

export interface Food {
  id: string;
  name: string;
}

export const FOODS: Food[] = [
  { id: 'grapefruit', name: 'Grapefruit' },
  { id: 'dairy', name: 'Milk and dairy' },
  { id: 'leafy-greens', name: 'Leafy green vegetables' },
  { id: 'alcohol', name: 'Alcohol' },
  { id: 'coffee', name: 'Coffee and tea' },
];

export const catalogById = new Map(CATALOG.map((c) => [c.id, c]));
export const foodById = new Map(FOODS.map((f) => [f.id, f]));

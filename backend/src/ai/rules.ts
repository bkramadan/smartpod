/**
 * AI ENGINE — INTERACTION RULES (demo data)
 *
 * ⚠️  ILLUSTRATIVE DATA FOR THE PROTOTYPE ONLY. NOT CLINICALLY VALIDATED.
 * Real rules come from a licensed interaction database and pharmacist review.
 *
 * Each rule names two catalogue ids (or a catalogue id and a food id). The order of
 * a and b does not matter. `separateHours` means spacing the two apart solves it, and
 * the timing planner will try to do that automatically.
 */
import type { Severity } from '@smartpod/shared';

export interface InteractionRule {
  a: string;
  b: string;
  severity: Severity;
  reason: string;
  advice: string;
  separateHours?: number;
}

export const ITEM_RULES: InteractionRule[] = [
  { a: 'warfarin', b: 'aspirin', severity: 'serious',
    reason: 'Both thin the blood; together the risk of bleeding goes up.',
    advice: 'Only combine if the doctor confirms it is intended.' },
  { a: 'warfarin', b: 'ibuprofen', severity: 'serious',
    reason: 'Raises the risk of bleeding, including in the stomach.',
    advice: 'Ask the doctor or pharmacist for a safer pain reliever.' },
  { a: 'warfarin', b: 'st-johns-wort', severity: 'serious',
    reason: "St John's wort can make warfarin work less well.",
    advice: 'Do not start this supplement without the doctor.' },
  { a: 'sertraline', b: 'st-johns-wort', severity: 'serious',
    reason: 'Together they can cause too much serotonin.',
    advice: 'Do not combine; speak to the doctor.' },
  { a: 'warfarin', b: 'fish-oil', severity: 'moderate',
    reason: 'Fish oil may add to the blood-thinning effect.',
    advice: 'Tell the doctor; blood tests may need watching.' },
  { a: 'warfarin', b: 'ginkgo', severity: 'moderate',
    reason: 'Ginkgo may increase bleeding risk.',
    advice: 'Tell the doctor before taking it.' },
  { a: 'warfarin', b: 'vitamin-k', severity: 'moderate',
    reason: 'Vitamin K works against warfarin.',
    advice: 'Only take it if the doctor agrees, at a steady dose.' },
  { a: 'sertraline', b: 'aspirin', severity: 'moderate',
    reason: 'Together they can raise bleeding risk.',
    advice: 'Tell the doctor; watch for unusual bruising.' },
  { a: 'sertraline', b: 'ibuprofen', severity: 'moderate',
    reason: 'Together they can raise bleeding risk in the stomach.',
    advice: 'Tell the doctor or pharmacist.' },
  { a: 'aspirin', b: 'ibuprofen', severity: 'moderate',
    reason: "Ibuprofen can block low-dose aspirin's heart protection.",
    advice: 'If both are needed, take aspirin first and ibuprofen later; ask the pharmacist.',
    separateHours: 2 },
  { a: 'lisinopril', b: 'potassium', severity: 'moderate',
    reason: 'Can push potassium in the blood too high.',
    advice: 'Only with the doctor’s agreement and blood tests.' },
  { a: 'levothyroxine', b: 'calcium', severity: 'moderate',
    reason: 'Calcium blocks the absorption of levothyroxine.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'levothyroxine', b: 'iron', severity: 'moderate',
    reason: 'Iron blocks the absorption of levothyroxine.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'levothyroxine', b: 'magnesium', severity: 'minor',
    reason: 'Magnesium can reduce levothyroxine absorption.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'ciprofloxacin', b: 'calcium', severity: 'moderate',
    reason: 'Calcium stops the antibiotic being absorbed.',
    advice: 'Take ciprofloxacin 2 hours before or 6 hours after calcium.', separateHours: 4 },
  { a: 'ciprofloxacin', b: 'iron', severity: 'moderate',
    reason: 'Iron stops the antibiotic being absorbed.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'ciprofloxacin', b: 'zinc', severity: 'moderate',
    reason: 'Zinc stops the antibiotic being absorbed.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'ciprofloxacin', b: 'magnesium', severity: 'moderate',
    reason: 'Magnesium stops the antibiotic being absorbed.',
    advice: 'Keep them at least 4 hours apart.', separateHours: 4 },
  { a: 'iron', b: 'calcium', severity: 'minor',
    reason: 'Calcium reduces iron absorption.',
    advice: 'Keep them about 2 hours apart.', separateHours: 2 },
  { a: 'iron', b: 'zinc', severity: 'minor',
    reason: 'They compete for absorption.',
    advice: 'Keep them about 2 hours apart.', separateHours: 2 },
  { a: 'melatonin', b: 'caffeine', severity: 'minor',
    reason: 'Caffeine works against sleep.',
    advice: 'Keep caffeine at least 6 hours before melatonin.', separateHours: 6 },
];

export const FOOD_RULES: InteractionRule[] = [
  { a: 'simvastatin', b: 'grapefruit', severity: 'serious',
    reason: 'Grapefruit raises simvastatin levels and the risk of muscle damage.',
    advice: 'Avoid grapefruit and grapefruit juice.' },
  { a: 'atorvastatin', b: 'grapefruit', severity: 'moderate',
    reason: 'Large amounts of grapefruit raise atorvastatin levels.',
    advice: 'Avoid large amounts of grapefruit juice.' },
  { a: 'warfarin', b: 'leafy-greens', severity: 'minor',
    reason: 'Vitamin K in greens changes how warfarin works.',
    advice: 'You can eat greens; keep the amount steady.' },
  { a: 'warfarin', b: 'alcohol', severity: 'moderate',
    reason: 'Alcohol changes how warfarin works and raises bleeding risk.',
    advice: 'Keep alcohol low and steady; ask the doctor.' },
  { a: 'metformin', b: 'alcohol', severity: 'moderate',
    reason: 'Heavy drinking with metformin can be dangerous.',
    advice: 'Limit alcohol.' },
  { a: 'ciprofloxacin', b: 'dairy', severity: 'moderate',
    reason: 'Dairy stops the antibiotic being absorbed.',
    advice: 'No milk or yoghurt within 2 hours before or 6 hours after.' },
  { a: 'levothyroxine', b: 'coffee', severity: 'minor',
    reason: 'Coffee reduces absorption if taken too soon.',
    advice: 'Wait 30–60 minutes after the tablet.' },
  { a: 'iron', b: 'dairy', severity: 'minor',
    reason: 'Dairy reduces iron absorption.',
    advice: 'Take iron away from milk and cheese.' },
  { a: 'iron', b: 'coffee', severity: 'minor',
    reason: 'Tea and coffee reduce iron absorption.',
    advice: 'Wait an hour after iron before tea or coffee.' },
];

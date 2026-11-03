import { PLACEMENT_ITEMS } from '../content/placement/items.js';

export type PlacementLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

export const PLACEMENT_LEVELS: readonly PlacementLevel[] = [
  'beginner',
  'elementary',
  'intermediate',
  'advanced',
];

export const TIER_PASS_COUNT = 2;
export const TIER_SIZE = 3;

export interface PlacementAnswer {
  itemId: string;
  passed: boolean;
  skipped?: boolean;
}

export interface PlacementOutcome {
  level: PlacementLevel;
  tiersPassed: number;
  understanding: { passed: number; total: number };
  speaking: { passed: number; total: number; skipped: number };
}

const ITEM_BY_ID = new Map(PLACEMENT_ITEMS.map((item) => [item.id, item]));

export function isPlacementLevel(value: unknown): value is PlacementLevel {
  return typeof value === 'string' && PLACEMENT_LEVELS.includes(value as PlacementLevel);
}

/** Returns an error message, or null when the answers are acceptable. */
export function validatePlacementAnswers(answers: readonly PlacementAnswer[]): string | null {
  const seen = new Set<string>();
  for (const answer of answers) {
    if (!ITEM_BY_ID.has(answer.itemId)) return `Unknown placement item: ${answer.itemId}`;
    if (seen.has(answer.itemId)) return `Duplicate placement item: ${answer.itemId}`;
    seen.add(answer.itemId);
  }
  return null;
}

/** A tier is passed with at least TIER_PASS_COUNT passes; the first failed tier stops the count. */
export function computePlacement(answers: readonly PlacementAnswer[]): PlacementOutcome {
  const byTier = new Map<number, PlacementAnswer[]>();
  const understanding = { passed: 0, total: 0 };
  const speaking = { passed: 0, total: 0, skipped: 0 };

  for (const answer of answers) {
    const item = ITEM_BY_ID.get(answer.itemId);
    if (!item) continue;
    byTier.set(item.tier, [...(byTier.get(item.tier) ?? []), answer]);
    if (item.kind === 'read_aloud') {
      if (answer.skipped) {
        speaking.skipped += 1;
      } else {
        speaking.total += 1;
        if (answer.passed) speaking.passed += 1;
      }
    } else {
      understanding.total += 1;
      if (answer.passed) understanding.passed += 1;
    }
  }

  let tiersPassed = 0;
  for (const tier of [1, 2, 3, 4]) {
    const given = byTier.get(tier) ?? [];
    const passes = given.filter((answer) => answer.passed && !answer.skipped).length;
    if (passes < TIER_PASS_COUNT) break;
    tiersPassed += 1;
  }

  return {
    level: PLACEMENT_LEVELS[Math.min(tiersPassed, 3)] ?? 'beginner',
    tiersPassed,
    understanding,
    speaking,
  };
}

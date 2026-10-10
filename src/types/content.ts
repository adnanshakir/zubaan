export const languages = [
  'hi',
  'ta',
  'te',
  'mr',
  'bn',
  'kn',
  'ml',
  'gu',
  'pa',
  'or',
] as const;

export type Language = (typeof languages)[number];

export const levels = [
  'beginner',
  'elementary',
  'intermediate',
  'advanced',
] as const;

export type Level = (typeof levels)[number];

export const goals = [
  'daily_conversation',
  'work',
  'interviews',
  'travel',
  'confidence',
] as const;

export type Goal = (typeof goals)[number];

export const lessonCategories = ['daily', 'work', 'career', 'travel'] as const;

export type LessonCategory = (typeof lessonCategories)[number];

export const goalCategoryMap: Record<Goal, LessonCategory> = {
  daily_conversation: 'daily',
  work: 'work',
  interviews: 'career',
  travel: 'travel',
  confidence: 'daily',
};

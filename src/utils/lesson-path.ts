export type LessonStatus = 'locked' | 'available' | 'completed';

export const LEVEL_RANK = {
  beginner: 0,
  elementary: 1,
  intermediate: 2,
  advanced: 3,
} as const;

export interface PathLesson {
  id: string;
  title: string;
  level: string;
  order: number;
  slug: string;
}

export interface ProgressInfo {
  bestScore: number;
  attempts: number;
  passed: boolean;
}

export interface PathItem {
  id: string;
  status: LessonStatus;
  bestScore: number | null;
  attempts: number;
  isCurrent: boolean;
  unlockAfter: { id: string; title: string } | null;
}

export const DEFAULT_PASS_SCORE = 60;
export const UNLOCK_AFTER_ATTEMPTS = 3;

function levelRank(level: string): number {
  return LEVEL_RANK[level as keyof typeof LEVEL_RANK] ?? 0;
}

export function sortPath(lessons: readonly PathLesson[]): PathLesson[] {
  return [...lessons].sort(
    (a, b) =>
      levelRank(a.level) - levelRank(b.level) || a.order - b.order || a.slug.localeCompare(b.slug),
  );
}

export function computePath(
  lessons: PathLesson[],
  progress: ReadonlyMap<string, ProgressInfo>,
  userLevel: string,
  unlockAll = false,
): PathItem[] {
  const sorted = sortPath(lessons);
  const userRank = levelRank(userLevel);
  const firstAtOrAbove = sorted.findIndex((lesson) => levelRank(lesson.level) >= userRank);
  const startIndex = firstAtOrAbove === -1 ? 0 : firstAtOrAbove;
  const passed = sorted.map((lesson) => progress.get(lesson.id)?.passed === true);
  const currentIndex = sorted.findIndex(
    (_lesson, index) =>
      index >= startIndex &&
      !passed[index] &&
      (unlockAll || index <= startIndex || passed[index - 1]),
  );

  return sorted.map((lesson, index) => {
    const info = progress.get(lesson.id);
    const unlocked = unlockAll || index <= startIndex || passed[index - 1] === true;
    const isPassed = passed[index];
    return {
      id: lesson.id,
      status: isPassed ? 'completed' : unlocked ? 'available' : 'locked',
      bestScore: info?.bestScore ?? null,
      attempts: info?.attempts ?? 0,
      isCurrent: index === currentIndex,
      unlockAfter:
        !unlocked && index > 0
          ? { id: sorted[index - 1].id, title: sorted[index - 1].title }
          : null,
    };
  });
}

export function applyResult(
  prev: ProgressInfo | undefined,
  score: number,
  passScore: number,
): { next: ProgressInfo; newlyPassed: boolean } {
  const attempts = (prev?.attempts ?? 0) + 1;
  const bestScore = Math.max(prev?.bestScore ?? 0, score);
  const passed =
    prev?.passed === true || bestScore >= passScore || attempts >= UNLOCK_AFTER_ATTEMPTS;
  return {
    next: { bestScore, attempts, passed },
    newlyPassed: passed && !(prev?.passed ?? false),
  };
}

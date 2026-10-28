import { jobInterviewLesson } from './job-interview.js';
import { managerUpdateLesson } from './manager-update.js';
import { neighbourLesson } from './neighbour.js';
import type { LessonContent } from './types.js';
import { validateLesson } from './validate.js';

export const lessons: readonly LessonContent[] = [
  neighbourLesson,
  managerUpdateLesson,
  jobInterviewLesson,
];

/** Call this at the start of the seed script; it throws if any lesson is inconsistent. */
export function assertLessonsValid(): void {
  const problems = lessons.flatMap((lesson) => validateLesson(lesson));
  if (problems.length > 0) {
    throw new Error(`Invalid lesson content:\n${problems.join('\n')}`);
  }
}

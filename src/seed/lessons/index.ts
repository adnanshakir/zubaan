import { buildLesson } from './build.js';
import { jobInterviewLesson } from './job-interview/lesson.js';
import { jobInterviewHi } from './job-interview/hi.js';
import { managerUpdateLesson } from './manager-update/lesson.js';
import { managerUpdateHi } from './manager-update/hi.js';
import { neighbourLesson } from './neighbour/lesson.js';
import { neighbourHi } from './neighbour/hi.js';
import type { LessonContent } from './types.js';
import type { LessonDef, LessonTranslation } from './authoring.js';
import { validateAuthoring, validateLesson } from './validate.js';
import { cafeLesson } from './cafe/lesson.js';
import { directionsLesson } from './directions/lesson.js';
import { directionsHi } from './directions/hi.js';
import { cafeHi } from './cafe/hi.js';
import { appointmentLesson } from './appointment/lesson.js';
import { meetingLesson } from './meeting/lesson.js';
import { meetingHi } from './meeting/hi.js';
import { appointmentHi } from './appointment/hi.js';
import { problemReportLesson } from './problem-report/lesson.js';
import { storyLesson } from './story/lesson.js';
import { negotiationLesson } from './negotiation/lesson.js';
import { negotiationHi } from './negotiation/hi.js';
import { storyHi } from './story/hi.js';
import { problemReportHi } from './problem-report/hi.js';

export const lessonSources: { def: LessonDef; translations: Record<string, LessonTranslation> }[] =
  [
    { def: neighbourLesson, translations: { hi: neighbourHi } },
    { def: managerUpdateLesson, translations: { hi: managerUpdateHi } },
    { def: jobInterviewLesson, translations: { hi: jobInterviewHi } },
    { def: cafeLesson, translations: { hi: cafeHi } },
    { def: directionsLesson, translations: { hi: directionsHi } },
    { def: appointmentLesson, translations: { hi: appointmentHi } },
    { def: meetingLesson, translations: { hi: meetingHi } },
    { def: problemReportLesson, translations: { hi: problemReportHi } },
    { def: storyLesson, translations: { hi: storyHi } },
    { def: negotiationLesson, translations: { hi: negotiationHi } },
  ];

export const lessons: readonly LessonContent[] = lessonSources.map(({ def, translations }) =>
  buildLesson(def, translations.hi),
);

/** Call this at the start of the seed script; it throws if any lesson is inconsistent. */
export function assertLessonsValid(): void {
  const problems = lessonSources.flatMap(({ def, translations }) => {
    const authoringProblems = validateAuthoring(def, translations.hi);
    const lesson = buildLesson(def, translations.hi);
    return [...authoringProblems, ...validateLesson(lesson)];
  });
  if (problems.length > 0) {
    throw new Error(`Invalid lesson content:\n${problems.join('\n')}`);
  }
}

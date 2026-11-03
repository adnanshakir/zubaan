import type { UserDocument } from '../models/User.js';
import type { Types } from 'mongoose';
import { listLessons } from './lessonService.js';

export async function getHomeData(user: UserDocument & { _id: Types.ObjectId }) {
  const lessons = await listLessons({}, user);
  const recommendedLesson = lessons.find((lesson) => lesson.isCurrent) ?? null;
  const completed = lessons.filter((lesson) => lesson.progress?.status === 'completed').length;

  return {
    greetingName: user.name ?? 'there',
    recommendedLesson,
    pathProgress: {
      completed,
      total: lessons.length,
    },
    placementDone: user.placement?.measured !== undefined,
    allCompleted: recommendedLesson === null,
  };
}

import { isValidObjectId } from 'mongoose';
import { Lesson } from '../models/Lesson.js';
import type { UserDocument } from '../models/User.js';
import {
  goalCategoryMap,
  levels,
  type Goal,
  type LessonCategory,
  type Level,
} from '../types/content.js';
import { ApiError } from '../utils/ApiError.js';

export type LessonListItem = {
  id: string;
  slug: string;
  title: string;
  category: LessonCategory;
  level: Level;
  objective: string;
  estimatedMinutes: number;
};

type LessonFilters = {
  category?: LessonCategory;
  level?: Level;
};

export function toLessonListItem(lesson: {
  _id: { toString(): string };
  slug: string;
  title: string;
  category: string;
  level: string;
  objective: string;
  estimatedMinutes: number;
}): LessonListItem {
  return {
    id: lesson._id.toString(),
    slug: lesson.slug,
    title: lesson.title,
    category: lesson.category as LessonCategory,
    level: lesson.level as Level,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
  };
}

export async function listLessons(
  filters: LessonFilters,
): Promise<LessonListItem[]> {
  const lessons = await Lesson.find(filters)
    .select('slug title category level objective estimatedMinutes')
    .lean();

  return lessons.map(toLessonListItem);
}

export async function getRecommended(
  user: Pick<UserDocument, 'goal' | 'level'>,
): Promise<LessonListItem | null> {
  const category = goalCategoryMap[user.goal as Goal];
  const userLevel = user.level as Level;
  const exactMatch = await Lesson.findOne({ category, level: userLevel })
    .select('slug title category level objective estimatedMinutes')
    .lean();

  if (exactMatch) {
    return toLessonListItem(exactMatch);
  }

  const categoryLessons = await Lesson.find({ category })
    .select('slug title category level objective estimatedMinutes')
    .lean();

  if (categoryLessons.length > 0) {
    const targetLevelIndex = levels.indexOf(userLevel);
    const nearestLesson = categoryLessons.reduce((closest, lesson) => {
      const closestDistance = Math.abs(
        levels.indexOf(closest.level as Level) - targetLevelIndex,
      );
      const lessonDistance = Math.abs(
        levels.indexOf(lesson.level as Level) - targetLevelIndex,
      );

      return lessonDistance < closestDistance ? lesson : closest;
    });

    return toLessonListItem(nearestLesson);
  }

  const fallbackLesson = await Lesson.findOne()
    .select('slug title category level objective estimatedMinutes')
    .lean();

  return fallbackLesson ? toLessonListItem(fallbackLesson) : null;
}

export async function getLessonById(id: string) {
  if (!isValidObjectId(id)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const lesson = await Lesson.findById(id).lean();

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  return {
    ...toLessonListItem(lesson),
    steps: lesson.steps,
  };
}

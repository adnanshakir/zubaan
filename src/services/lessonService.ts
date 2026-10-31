import { isValidObjectId } from 'mongoose';
import type { UserDocument } from '../models/User.js';
import {
  goalCategoryMap,
  levels,
  type Goal,
  type LessonCategory,
  type Level,
} from '../types/content.js';
import { ApiError } from '../utils/ApiError.js';
import { getBuiltLesson, resolveLang } from './lessonBuilder.js';
import { Lesson } from '../models/Lesson.js';

export type LessonListItem = {
  id: string;
  slug: string;
  title: string;
  category: LessonCategory;
  level: Level;
  objective: string;
  estimatedMinutes: number;
  sentenceCount: number;
  exerciseCount: number;
  unit: string;
  order: number;
  canDo: string;
};

type LessonFilters = {
  category?: LessonCategory;
  level?: Level;
  lang?: string;
};

function toLessonListItem(lesson: {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: string;
  objective: string;
  estimatedMinutes: number;
  unit?: string;
  order?: number;
  canDo?: string;
  sentences?: readonly unknown[];
  stages?: readonly { exercises?: readonly unknown[] }[];
}): LessonListItem {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    category: lesson.category as LessonCategory,
    level: lesson.level as Level,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    sentenceCount: lesson.sentences?.length ?? 0,
    exerciseCount:
      lesson.stages?.reduce((count, stage) => count + (stage.exercises?.length ?? 0), 0) ?? 0,
    unit: lesson.unit ?? '',
    order: lesson.order ?? 0,
    canDo: lesson.canDo ?? lesson.objective,
  };
}

function sortLessons(a: LessonListItem, b: LessonListItem): number {
  return levels.indexOf(a.level) - levels.indexOf(b.level) || a.order - b.order;
}

export async function listLessons(
  filters: LessonFilters,
  user: Pick<UserDocument, 'nativeLanguage'>,
): Promise<LessonListItem[]> {
  const { lang: requestedLang, ...query } = filters;
  const lang = resolveLang(requestedLang, user);
  const lessons = await Lesson.find(query).select('_id').lean();
  const built = await Promise.all(
    lessons.map((lesson) => getBuiltLesson(lesson._id.toString(), lang)),
  );
  return built.map((lesson) => toLessonListItem(lesson)).sort(sortLessons);
}

export async function getRecommended(
  user: Pick<UserDocument, 'goal' | 'level' | 'nativeLanguage'>,
): Promise<LessonListItem | null> {
  const lang = resolveLang(undefined, user);
  const category = goalCategoryMap[user.goal as Goal];
  const userLevel = user.level as Level;
  const exactMatch = await Lesson.findOne({ category, level: userLevel }).select('_id').lean();

  if (exactMatch) {
    return toLessonListItem(await getBuiltLesson(exactMatch._id.toString(), lang));
  }

  const categoryLessons = await Lesson.find({ category }).select('_id level').lean();
  if (categoryLessons.length > 0) {
    const targetLevelIndex = levels.indexOf(userLevel);
    const nearestLesson = categoryLessons.reduce((closest, lesson) => {
      const closestDistance = Math.abs(levels.indexOf(closest.level as Level) - targetLevelIndex);
      const lessonDistance = Math.abs(levels.indexOf(lesson.level as Level) - targetLevelIndex);
      return lessonDistance < closestDistance ? lesson : closest;
    });
    return toLessonListItem(await getBuiltLesson(nearestLesson._id.toString(), lang));
  }

  const fallbackLesson = await Lesson.findOne().select('_id').lean();
  return fallbackLesson
    ? toLessonListItem(await getBuiltLesson(fallbackLesson._id.toString(), lang))
    : null;
}

export async function getLessonById(
  id: string,
  user: Pick<UserDocument, 'nativeLanguage'>,
  requestedLang?: string,
) {
  if (!isValidObjectId(id)) throw new ApiError(404, 'Lesson not found');
  const lang = resolveLang(requestedLang, user);
  const lesson = await getBuiltLesson(id, lang);
  return {
    ...toLessonListItem(lesson),
    lang: lesson.lang,
    sentences: lesson.sentences,
    stages: lesson.stages,
    chat: {
      aiRole: lesson.chat.aiRole,
      userRole: lesson.chat.userRole,
      situation: lesson.chat.situation,
      goal: lesson.chat.goal,
      turns: lesson.chat.turns.map((turn) => ({
        ai: turn.ai,
        sentenceId: turn.sentenceId,
        hint: turn.hint,
      })),
      closingLine: lesson.chat.closingLine,
    },
  };
}

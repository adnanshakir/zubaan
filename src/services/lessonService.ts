import { isValidObjectId } from 'mongoose';
import type { Types } from 'mongoose';
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
import { getPathForUser } from './progressService.js';

type UserWithId = UserDocument & { _id: Types.ObjectId };

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
  progress?: {
    status: 'locked' | 'available' | 'completed';
    bestScore: number | null;
    attempts: number;
    unlockAfter: { id: string; title: string } | null;
  };
  isCurrent?: boolean;
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

export async function listLessons(
  filters: LessonFilters,
  user: UserWithId,
): Promise<LessonListItem[]> {
  const { lang: requestedLang, ...query } = filters;
  const lang = resolveLang(requestedLang, user);
  const lessons = await Lesson.find(query).select('_id').lean();
  const built = await Promise.all(
    lessons.map((lesson) => getBuiltLesson(lesson._id.toString(), lang)),
  );
  const path = await getPathForUser(user);
  return built
    .map((lesson) => {
      const item = toLessonListItem(lesson);
      const progress = path.items.get(item.id);
      return progress
        ? {
            ...item,
            progress: {
              status: progress.status,
              bestScore: progress.bestScore,
              attempts: progress.attempts,
              unlockAfter: progress.unlockAfter,
            },
            isCurrent: progress.isCurrent,
          }
        : item;
    })
    .sort((a, b) => {
      const aIndex = path.lessons.findIndex((lesson) => lesson.id === a.id);
      const bIndex = path.lessons.findIndex((lesson) => lesson.id === b.id);
      return aIndex - bIndex;
    });
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

export async function getLessonById(id: string, user: UserWithId, requestedLang?: string) {
  if (!isValidObjectId(id)) throw new ApiError(404, 'Lesson not found');
  const lang = resolveLang(requestedLang, user);
  const lesson = await getBuiltLesson(id, lang);
  const path = await getPathForUser(user);
  const pathItem = path.items.get(id);
  return {
    ...toLessonListItem(lesson),
    progress: pathItem
      ? {
          status: pathItem.status,
          bestScore: pathItem.bestScore,
          attempts: pathItem.attempts,
          unlockAfter: pathItem.unlockAfter,
        }
      : undefined,
    isCurrent: pathItem?.isCurrent ?? false,
    lang: lesson.lang,
    focus: lesson.focus ?? '',
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

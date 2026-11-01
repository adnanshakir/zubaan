import { isValidObjectId } from 'mongoose';
import { Lesson } from '../models/Lesson.js';
import { LessonTranslation } from '../models/LessonTranslation.js';
import type { UserDocument } from '../models/User.js';
import { buildLesson } from '../seed/lessons/build.js';
import type {
  LessonDef,
  LessonTranslation as AuthoringTranslation,
} from '../seed/lessons/authoring.js';
import type { LessonContent } from '../seed/lessons/types.js';
import { ApiError } from '../utils/ApiError.js';

export const SUPPORTED_LANGS = ['hi'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const cache = new Map<string, LessonContent & { id: string; lang: string }>();

export function resolveLang(
  requested: string | undefined,
  user: Pick<UserDocument, 'nativeLanguage'>,
): string {
  if (requested !== undefined) {
    if (!SUPPORTED_LANGS.includes(requested as SupportedLang)) {
      throw new ApiError(400, `Language is not supported: ${requested}`, 'LANG_NOT_SUPPORTED');
    }
    return requested;
  }
  return SUPPORTED_LANGS.includes(user.nativeLanguage as SupportedLang)
    ? user.nativeLanguage
    : 'hi';
}

export async function getBuiltLesson(
  lessonId: string,
  lang: string,
): Promise<LessonContent & { id: string; lang: string }> {
  if (!isValidObjectId(lessonId)) throw new ApiError(404, 'Lesson not found');
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) throw new ApiError(404, 'Lesson not found');
  const translation = await LessonTranslation.findOne({ lessonId: lesson._id, lang }).lean();
  if (!translation)
    throw new ApiError(404, 'Lesson translation not found', 'TRANSLATION_NOT_FOUND');
  const key = `${lessonId}:${lang}:${lesson.version}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const def: LessonDef = {
    slug: lesson.slug,
    title: lesson.title,
    category: lesson.category,
    level: lesson.level,
    unit: lesson.unit,
    order: lesson.order,
    canDo: lesson.canDo,
    focus: lesson.focus,
    estimatedMinutes: lesson.estimatedMinutes,
    phrases: lesson.phrases as LessonDef['phrases'],
    vocab: lesson.vocab as LessonDef['vocab'],
    concepts: lesson.concepts as LessonDef['concepts'],
    drills: lesson.drills as LessonDef['drills'],
    dialogue: lesson.dialogue as LessonDef['dialogue'],
  };
  const built = {
    ...buildLesson(def, translation.data as AuthoringTranslation),
    id: lesson._id.toString(),
    lang,
  };
  cache.set(key, built);
  return built;
}

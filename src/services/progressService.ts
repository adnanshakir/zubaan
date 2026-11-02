import { isValidObjectId, type Types } from 'mongoose';
import { env } from '../config/env.js';
import { Conversation } from '../models/Conversation.js';
import { Lesson } from '../models/Lesson.js';
import { LessonProgress } from '../models/LessonProgress.js';
import type { UserDocument } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  applyResult,
  computePath,
  DEFAULT_PASS_SCORE,
  sortPath,
  type PathItem,
  type PathLesson,
  type ProgressInfo,
} from '../utils/lesson-path.js';

export type ProgressUser = UserDocument & { _id: Types.ObjectId };

type PathResult = {
  items: Map<string, PathItem>;
  lessons: PathLesson[];
  completedCount: number;
  total: number;
};

function userLevel(user: Pick<UserDocument, 'level' | 'placement'>): string {
  return user.placement?.measured ?? user.placement?.selfReported ?? user.level;
}

export async function getPathForUser(user: ProgressUser): Promise<PathResult> {
  const [lessons, progressDocuments] = await Promise.all([
    Lesson.find().select('_id title level order slug').lean(),
    LessonProgress.find({ userId: user._id }).lean(),
  ]);
  const pathLessons = lessons.map((lesson) => ({
    id: lesson._id.toString(),
    title: lesson.title,
    level: lesson.level,
    order: lesson.order,
    slug: lesson.slug,
  }));
  const progress = new Map<string, ProgressInfo>(
    progressDocuments.map((document) => [
      document.lessonId.toString(),
      {
        bestScore: document.bestScore,
        attempts: document.attempts,
        passed: document.passed,
      },
    ]),
  );
  const sortedLessons = sortPath(pathLessons);
  const path = computePath(sortedLessons, progress, userLevel(user), env.LESSONS_UNLOCK_ALL);
  const items = new Map(path.map((item) => [item.id, item]));

  return {
    items,
    lessons: sortedLessons,
    completedCount: path.filter((item) => item.status === 'completed').length,
    total: path.length,
  };
}

export async function assertLessonUnlocked(user: ProgressUser, lessonId: string): Promise<void> {
  if (!isValidObjectId(lessonId)) throw new ApiError(404, 'Lesson not found');
  const path = await getPathForUser(user);
  const item = path.items.get(lessonId);
  if (!item) throw new ApiError(404, 'Lesson not found');
  if (item.status === 'locked') {
    throw new ApiError(403, 'Finish the previous lesson to unlock this one.', 'LESSON_LOCKED');
  }
}

function progressResponse(
  lessonId: string,
  item: PathItem,
  newlyPassed: boolean,
  passScore: number,
  nextLessonId: string | null,
  completedCount: number,
  total: number,
) {
  return {
    lessonId,
    bestScore: item.bestScore ?? 0,
    attempts: item.attempts,
    passed: item.status === 'completed',
    newlyPassed,
    passScore,
    nextLessonId,
    completedCount,
    total,
  };
}

export async function recordProgress(
  user: ProgressUser,
  lessonId: string,
  score: number,
  conversationId: string,
) {
  if (!isValidObjectId(lessonId)) throw new ApiError(404, 'Lesson not found');
  if (!isValidObjectId(conversationId)) throw new ApiError(400, 'Invalid conversationId');
  const path = await getPathForUser(user);
  const lessonIndex = path.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonIndex === -1) throw new ApiError(404, 'Lesson not found');

  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId: user._id,
    lessonId,
  });
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (conversation.status !== 'completed') {
    throw new ApiError(400, 'Conversation must be completed');
  }

  let document = await LessonProgress.findOne({ userId: user._id, lessonId });
  const conversationAlreadyRecorded = document?.conversationIds.some(
    (id) => id.toString() === conversationId,
  );
  if (conversationAlreadyRecorded) {
    const item = path.items.get(lessonId)!;
    const nextLessonId =
      item.status === 'completed' ? (path.lessons[lessonIndex + 1]?.id ?? null) : null;
    return progressResponse(
      lessonId,
      item,
      false,
      env.LESSON_PASS_SCORE,
      nextLessonId,
      path.completedCount,
      path.total,
    );
  }

  const previous: ProgressInfo | undefined = document
    ? {
        bestScore: document.bestScore,
        attempts: document.attempts,
        passed: document.passed,
      }
    : undefined;
  const result = applyResult(previous, score, env.LESSON_PASS_SCORE ?? DEFAULT_PASS_SCORE);
  if (!document) {
    document = new LessonProgress({
      userId: user._id,
      lessonId,
      conversationIds: [],
    });
  }
  document.bestScore = result.next.bestScore;
  document.lastScore = score;
  document.attempts = result.next.attempts;
  document.passed = result.next.passed;
  if (result.newlyPassed) document.firstPassedAt = new Date();
  document.conversationIds.push(conversation._id);
  document.conversationIds = document.conversationIds.slice(-100);
  await document.save();

  const nextPath = await getPathForUser(user);
  const item = nextPath.items.get(lessonId)!;
  const nextLessonId = result.next.passed ? (nextPath.lessons[lessonIndex + 1]?.id ?? null) : null;
  return progressResponse(
    lessonId,
    item,
    result.newlyPassed,
    env.LESSON_PASS_SCORE,
    nextLessonId,
    nextPath.completedCount,
    nextPath.total,
  );
}

import { isValidObjectId, type Types } from 'mongoose';
import { Lesson } from '../models/Lesson.js';
import type { UserDocument } from '../models/User.js';
import { User } from '../models/User.js';
import { getBuiltLesson, resolveLang } from './lessonBuilder.js';
import { LessonAttempt, type LessonAttemptDocument } from '../models/LessonAttempt.js';
import { createMistake } from './mistakeService.js';
import { ApiError } from '../utils/ApiError.js';
import type { AttemptResultInput, CompleteAttemptInput } from '../validators/attemptValidator.js';
import type { Correction } from './conversationLlmService.js';

type Exercise = {
  id: string;
  type: string;
  mistakeType?: Correction['type'];
  sentence?: string;
  correct?: string;
  answer?: string;
  accept?: readonly string[];
  text?: string;
  explanation?: string;
};

type Stage = { id: string; exercises: readonly Exercise[] };

function findAttempt(userId: Types.ObjectId, attemptId: string): Promise<LessonAttemptDocument> {
  if (!isValidObjectId(attemptId)) throw new ApiError(404, 'Attempt not found');
  return LessonAttempt.findOne({ _id: attemptId, userId }).then((attempt) => {
    if (!attempt) throw new ApiError(404, 'Attempt not found');
    return attempt;
  });
}

async function getExercise(
  attempt: LessonAttemptDocument,
  exerciseId: string,
  user: Pick<UserDocument, 'nativeLanguage'>,
) {
  const lesson = await getBuiltLesson(attempt.lessonId.toString(), resolveLang(undefined, user));
  const stages = lesson.stages as readonly Stage[];
  for (const stage of stages) {
    const exercise = stage.exercises.find((candidate) => candidate.id === exerciseId);
    if (exercise) return { lesson, stage, exercise };
  }
  throw new ApiError(400, 'Exercise does not belong to this lesson');
}

function validateAnswer(exercise: Exercise, answer: string | string[] | undefined): void {
  if (answer === undefined) return;
  if (
    ['mcq', 'gap', 'listen_pick', 'type_gap', 'dictation', 'reply_speak'].includes(exercise.type) &&
    typeof answer !== 'string'
  ) {
    throw new ApiError(400, 'answer must be a string');
  }
  if (typeof answer === 'string') {
    const storedText =
      ['gap', 'type_gap'].includes(exercise.type) && exercise.sentence
        ? exercise.sentence.replace('___', answer)
        : answer;
    const maxLength = ['type_gap', 'dictation'].includes(exercise.type) ? 200 : 500;
    if (storedText.length > maxLength) {
      throw new ApiError(400, `answer must produce text of at most ${maxLength} characters`);
    }
  }
  if (exercise.type === 'order_words') {
    if (
      !Array.isArray(answer) ||
      answer.length > 30 ||
      answer.some((word) => word.length > 40) ||
      answer.join(' ').length > 500
    ) {
      throw new ApiError(400, 'answer must be an array of up to 30 words of 40 characters');
    }
  }
}

function mistakeText(
  exercise: Exercise,
  answer: string | string[],
): { original: string; corrected: string } {
  if (exercise.type === 'gap' || exercise.type === 'type_gap') {
    return {
      original: exercise.sentence!.replace('___', String(answer)),
      corrected: exercise.sentence!.replace(
        '___',
        exercise.type === 'type_gap' ? exercise.accept![0] : exercise.correct!,
      ),
    };
  }
  if (exercise.type === 'dictation') {
    return { original: String(answer), corrected: exercise.text! };
  }
  if (exercise.type === 'order_words') {
    return { original: (answer as string[]).join(' '), corrected: exercise.answer! };
  }
  return { original: String(answer), corrected: exercise.correct! };
}

function response(attempt: LessonAttemptDocument) {
  return {
    attemptId: attempt._id.toString(),
    lessonId: attempt.lessonId.toString(),
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt ?? null,
    bestStreak: attempt.bestStreak,
    results: attempt.results.map((result) => ({
      exerciseId: result.exerciseId,
      stageId: result.stageId,
      type: result.type,
      result: result.result,
      retryResult: result.retryResult,
    })),
    mistakes: attempt.results
      .filter((result) => result.original)
      .map((result) => ({
        exerciseId: result.exerciseId,
        original: result.original,
        corrected: result.corrected,
        explanation: result.explanation,
        mistakeType: result.mistakeType,
      })),
  };
}

export async function createAttempt(userId: Types.ObjectId, lessonId: string) {
  if (!isValidObjectId(lessonId) || !(await Lesson.exists({ _id: lessonId }))) {
    throw new ApiError(404, 'Lesson not found');
  }
  const attempt = await LessonAttempt.create({ lessonId, userId });
  return { attemptId: attempt._id.toString() };
}

export async function recordAttemptResult(
  userId: Types.ObjectId,
  attemptId: string,
  input: AttemptResultInput,
) {
  const attempt = await findAttempt(userId, attemptId);
  const user = await User.findById(userId).select('nativeLanguage').lean();
  if (!user) throw new ApiError(404, 'User not found');
  const { stage, exercise } = await getExercise(attempt, input.exerciseId, user);
  validateAnswer(exercise, input.answer);
  const allowed = [
    'mcq',
    'gap',
    'listen_pick',
    'order_words',
    'match_pairs',
    'type_gap',
    'dictation',
  ].includes(exercise.type)
    ? ['correct', 'wrong']
    : exercise.type === 'reply_speak' || exercise.type === 'speak'
      ? ['said', 'close', 'missed', 'skipped']
      : [];
  if (!allowed.includes(input.result)) throw new ApiError(400, 'Invalid result for exercise type');

  const existing = attempt.results.find((result) => result.exerciseId === input.exerciseId);
  if (input.retry) {
    if (!existing || !['correct', 'wrong'].includes(input.result)) {
      throw new ApiError(400, 'Invalid retry result');
    }
    existing.retryResult = input.result as 'correct' | 'wrong';
    await attempt.save();
    return { recorded: true, mistakeSaved: false };
  }
  if (existing) return { recorded: false, mistakeSaved: false };

  let mistakeSaved = false;
  const result = {
    exerciseId: input.exerciseId,
    stageId: stage.id,
    type: exercise.type,
    result: input.result,
  } as LessonAttemptDocument['results'][number];
  if (input.result === 'wrong' && exercise.mistakeType && input.answer !== undefined) {
    const text = mistakeText(exercise, input.answer);
    result.original = text.original;
    result.corrected = text.corrected;
    result.explanation = exercise.explanation;
    result.mistakeType = exercise.mistakeType;
    mistakeSaved = await createMistake({
      userId,
      attemptId: attempt._id,
      lessonId: attempt.lessonId,
      original: text.original,
      correction: {
        corrected: text.corrected,
        explanation: exercise.explanation ?? '',
        type: exercise.mistakeType,
      },
      source: 'exercise',
    });
  }
  attempt.results.push(result);
  await attempt.save();
  return { recorded: true, mistakeSaved };
}

export async function completeAttempt(
  userId: Types.ObjectId,
  attemptId: string,
  input: CompleteAttemptInput,
) {
  const attempt = await findAttempt(userId, attemptId);
  attempt.completedAt = new Date();
  attempt.bestStreak = input.bestStreak;
  await attempt.save();
  return response(attempt);
}

export async function getAttempt(userId: Types.ObjectId, attemptId: string) {
  return response(await findAttempt(userId, attemptId));
}

import { Types } from 'mongoose';
import { Mistake } from '../models/Mistake.js';
import { type MistakeType } from '../utils/text.js';
import type { Correction } from './conversationLlmService.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export async function recordMistake(input: {
  userId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  attemptId?: Types.ObjectId;
  lessonId: Types.ObjectId;
  original: string;
  correction: Correction;
  source?: 'exercise' | 'conversation';
}): Promise<boolean> {
  const result = await Mistake.updateOne(
    {
      userId: input.userId,
      lessonId: input.lessonId,
      original: input.original,
      corrected: input.correction.corrected,
      type: input.correction.type,
    },
    {
      $setOnInsert: {
        userId: input.userId,
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        ...(input.attemptId ? { attemptId: input.attemptId } : {}),
        lessonId: input.lessonId,
        original: input.original,
        corrected: input.correction.corrected,
        explanation: input.correction.explanation,
        type: input.correction.type,
        source: input.source ?? 'conversation',
      },
    },
    { upsert: true },
  );
  return result.upsertedCount > 0;
}

export async function createMistake(input: {
  userId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  attemptId?: Types.ObjectId;
  lessonId: Types.ObjectId;
  original: string;
  correction: Correction;
  source?: 'exercise' | 'conversation';
}): Promise<boolean> {
  return recordMistake(input);
}

export async function listMistakes(
  userId: Types.ObjectId,
  query: { type?: MistakeType; limit: number; before?: string },
) {
  const rows = await Mistake.find({
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.before ? { _id: { $lt: new Types.ObjectId(query.before) } } : {}),
  })
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .lean();

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map((row) => ({
      id: String(row._id),
      original: row.original,
      corrected: row.corrected,
      explanation: row.explanation,
      type: row.type,
      conversationId: row.conversationId ? String(row.conversationId) : null,
      lessonId: String(row.lessonId),
      createdAt: row.createdAt,
    })),
    nextBefore: hasMore && last ? String(last._id) : null,
  };
}

export async function getMistakeSummary(userId: Types.ObjectId) {
  const rows = await Mistake.aggregate<{ _id: MistakeType; count: number }>([
    { $match: { userId } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const byType: Record<MistakeType, number> = {
    grammar: 0,
    tense: 0,
    preposition: 0,
    word_choice: 0,
    other: 0,
  };

  for (const row of rows) {
    byType[row._id] = row.count;
  }

  const total = Object.values(byType).reduce((sum, count) => sum + count, 0);
  return { total, byType };
}

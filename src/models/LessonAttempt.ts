import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { MISTAKE_TYPES } from '../utils/text.js';

const resultSchema = new Schema(
  {
    exerciseId: { type: String, required: true },
    stageId: { type: String, required: true },
    type: { type: String, required: true },
    result: {
      type: String,
      enum: ['correct', 'wrong', 'said', 'close', 'missed', 'skipped'],
      required: true,
    },
    retryResult: { type: String, enum: ['correct', 'wrong'] },
    original: { type: String, trim: true, maxlength: 500 },
    corrected: { type: String, trim: true, maxlength: 500 },
    explanation: { type: String, trim: true, maxlength: 160 },
    mistakeType: { type: String, enum: [...MISTAKE_TYPES] },
  },
  { _id: false },
);

const lessonAttemptSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    bestStreak: { type: Number, required: true, default: 0, min: 0, max: 200 },
    results: { type: [resultSchema], required: true, default: [] },
  },
  { timestamps: true },
);

lessonAttemptSchema.index({ userId: 1, createdAt: -1 });

export type LessonAttemptDocument = HydratedDocument<InferSchemaType<typeof lessonAttemptSchema>>;

export const LessonAttempt = model<LessonAttemptDocument>('LessonAttempt', lessonAttemptSchema);

import { model, Schema, type InferSchemaType } from 'mongoose';
import { MISTAKE_TYPES } from '../utils/text.js';

const mistakeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    attemptId: { type: Schema.Types.ObjectId, ref: 'LessonAttempt' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    original: { type: String, required: true, trim: true, maxlength: 500 },
    corrected: { type: String, required: true, trim: true, maxlength: 500 },
    explanation: { type: String, default: '', trim: true, maxlength: 160 },
    type: { type: String, enum: [...MISTAKE_TYPES], required: true },
    source: { type: String, enum: ['exercise', 'conversation'], default: 'conversation' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mistakeSchema.index({ userId: 1, _id: -1 });
mistakeSchema.index({ userId: 1, type: 1, _id: -1 });
mistakeSchema.index(
  { userId: 1, lessonId: 1, original: 1, corrected: 1, type: 1 },
  { unique: true },
);

export type MistakeDocument = InferSchemaType<typeof mistakeSchema>;

export const Mistake = model<MistakeDocument>('Mistake', mistakeSchema);

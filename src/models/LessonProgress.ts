import { model, Schema, type InferSchemaType } from 'mongoose';

const lessonProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    bestScore: { type: Number, required: true, default: 0, min: 0, max: 100 },
    lastScore: { type: Number, required: true, default: 0, min: 0, max: 100 },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    passed: { type: Boolean, required: true, default: false },
    conversationIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Conversation',
      required: true,
      default: [],
    },
    firstPassedAt: { type: Date },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1 });

export type LessonProgressDocument = InferSchemaType<typeof lessonProgressSchema>;

export const LessonProgress = model<LessonProgressDocument>('LessonProgress', lessonProgressSchema);

import { model, Schema, type InferSchemaType } from 'mongoose';
import { lessonCategories, levels } from '../types/content.js';

const lessonSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, enum: lessonCategories, required: true },
    level: { type: String, enum: levels, required: true },
    unit: { type: String, required: true },
    order: { type: Number, required: true },
    canDo: { type: String, required: true },
    focus: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true },
    phrases: { type: [Schema.Types.Mixed], required: true },
    vocab: { type: [Schema.Types.Mixed], required: true },
    concepts: { type: [Schema.Types.Mixed], required: true },
    dialogue: { type: Schema.Types.Mixed, required: true },
    version: { type: String, required: true },
  },
  { timestamps: true },
);

lessonSchema.index({ level: 1, order: 1 });

export type LessonDocument = InferSchemaType<typeof lessonSchema>;

export const Lesson = model<LessonDocument>('Lesson', lessonSchema);

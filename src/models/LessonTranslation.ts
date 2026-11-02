import { model, Schema, type InferSchemaType } from 'mongoose';

const lessonTranslationSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    lang: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

lessonTranslationSchema.index({ lessonId: 1, lang: 1 }, { unique: true });

export type LessonTranslationDocument = InferSchemaType<typeof lessonTranslationSchema>;

export const LessonTranslation = model<LessonTranslationDocument>(
  'LessonTranslation',
  lessonTranslationSchema,
);

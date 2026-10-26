import { model, Schema, type InferSchemaType } from 'mongoose';
import { lessonCategories, levels } from '../types/content.js';

const sentenceSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    hi: { type: String, required: true },
    tip: { type: String, required: true },
    chunks: { type: [String], required: true },
  },
  { _id: false },
);

const stageSchema = new Schema(
  {
    id: { type: String, enum: ['words', 'sentences'], required: true },
    title: { type: String, required: true },
    intro: { type: String, required: true },
    exercises: { type: [Schema.Types.Mixed], required: true },
  },
  { _id: false },
);

const knownMistakeSchema = new Schema(
  {
    wrong: { type: String, required: true },
    explanation: { type: String, required: true },
    type: {
      type: String,
      enum: ['grammar', 'tense', 'preposition', 'word_choice'],
      required: true,
    },
  },
  { _id: false },
);

const chatTurnSchema = new Schema(
  {
    ai: { type: String, required: true },
    sentenceId: { type: String, required: true },
    alternatives: { type: [String] },
    hint: {
      en: { type: String, required: true },
      hi: { type: String, required: true },
    },
    repeat: { type: String, required: true },
    knownMistakes: { type: [knownMistakeSchema] },
  },
  { _id: false },
);

const chatSchema = new Schema(
  {
    aiRole: { type: String, required: true },
    userRole: { type: String, required: true },
    situation: { type: String, required: true },
    goal: { type: String, required: true },
    turns: { type: [chatTurnSchema], required: true },
    closingLine: { type: String, required: true },
  },
  { _id: false },
);

const lessonSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, enum: lessonCategories, required: true },
    level: { type: String, enum: levels, required: true },
    objective: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true },
    sentences: { type: [sentenceSchema], required: true },
    stages: { type: [stageSchema], required: true },
    chat: { type: chatSchema, required: true },
  },
  { timestamps: true },
);

lessonSchema.index({ category: 1, level: 1 });

export type LessonDocument = InferSchemaType<typeof lessonSchema>;

export const Lesson = model<LessonDocument>('Lesson', lessonSchema);

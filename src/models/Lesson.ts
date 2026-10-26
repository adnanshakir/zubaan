import { model, Schema, type InferSchemaType } from 'mongoose';
import {
  lessonCategories,
  levels,
  type Language,
  type LessonCategory,
  type Level,
} from '../types/content.js';

export type LessonPhrase = {
  text: string;
  hints: Partial<Record<Language, string>>;
  tip?: string;
  chunks?: string[];
};

export type ScriptedRoleplayTurn = {
  ai: string;
  expect: string;
  hint: { en: string; hi: string };
};

export type RoleplayStep = {
  aiRole: string;
  userRole: string;
  situation: string;
  goal: string;
  openingLine: string;
  maxTurns: number;
  targetPhrases: string[];
  turns?: ScriptedRoleplayTurn[];
  closingLine?: string;
};

export type LessonStep = {
  order: number;
  type: 'learn' | 'repeat' | 'roleplay';
  phrases?: LessonPhrase[];
  phraseIndexes?: number[];
  roleplay?: RoleplayStep;
};

export type LessonSeed = {
  slug: string;
  title: string;
  category: LessonCategory;
  level: Level;
  objective: string;
  estimatedMinutes: number;
  steps: LessonStep[];
};

const phraseSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    hints: {
      type: Map,
      of: String,
      default: {},
    },
    tip: {
      type: String,
    },
    chunks: {
      type: [String],
    },
  },
  { _id: false },
);

const roleplaySchema = new Schema(
  {
    aiRole: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    situation: {
      type: String,
      required: true,
    },
    goal: {
      type: String,
      required: true,
    },
    openingLine: {
      type: String,
      required: true,
    },
    maxTurns: {
      type: Number,
      required: true,
    },
    targetPhrases: {
      type: [String],
      required: true,
    },
    turns: {
      type: [
        new Schema(
          {
            ai: { type: String, required: true },
            expect: { type: String, required: true },
            hint: {
              en: { type: String, required: true },
              hi: { type: String, required: true },
            },
          },
          { _id: false },
        ),
      ],
    },
    closingLine: {
      type: String,
    },
  },
  { _id: false },
);

const lessonStepSchema = new Schema(
  {
    order: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['learn', 'repeat', 'roleplay'],
      required: true,
    },
    phrases: {
      type: [phraseSchema],
    },
    phraseIndexes: {
      type: [Number],
    },
    roleplay: {
      type: roleplaySchema,
    },
  },
  { _id: false },
);

const lessonSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: lessonCategories,
      required: true,
    },
    level: {
      type: String,
      enum: levels,
      required: true,
    },
    objective: {
      type: String,
      required: true,
    },
    estimatedMinutes: {
      type: Number,
      required: true,
    },
    steps: {
      type: [lessonStepSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

lessonSchema.index({ category: 1, level: 1 });

export type LessonDocument = InferSchemaType<typeof lessonSchema>;

export const Lesson = model<LessonDocument>('Lesson', lessonSchema);

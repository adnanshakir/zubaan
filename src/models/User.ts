import { model, Schema, type InferSchemaType } from 'mongoose';
import { goals, languages, levels } from '../types/content.js';

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    nativeLanguage: {
      type: String,
      enum: languages,
      required: true,
    },
    level: {
      type: String,
      enum: levels,
      required: true,
    },
    goal: {
      type: String,
      enum: goals,
      required: true,
    },
    dailyGoalMinutes: {
      type: Number,
      default: 10,
    },
    placement: {
      selfReported: {
        type: String,
        enum: levels,
        required: true,
      },
      measured: {
        type: String,
        enum: levels,
      },
      source: {
        type: String,
        enum: ['test', 'beginner', 'manual'],
      },
      completedAt: {
        type: Date,
      },
      sample: {
        type: String,
        maxlength: 1000,
      },
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model<UserDocument>('User', userSchema);

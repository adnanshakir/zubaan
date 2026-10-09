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
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model<UserDocument>('User', userSchema);

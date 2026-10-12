import { model, Schema, type InferSchemaType } from 'mongoose';

const speechLogSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ['tts'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['kokoro', 'sarvam'],
      required: true,
    },
    voice: {
      type: String,
      trim: true,
    },
    pace: {
      type: Number,
    },
    language: {
      type: String,
      enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN'],
      required: true,
    },
    chars: {
      type: Number,
      required: true,
      min: 0,
    },
    audioBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMs: {
      type: Number,
      min: 0,
    },
    totalMs: {
      type: Number,
      required: true,
      min: 0,
    },
    ok: {
      type: Boolean,
      required: true,
    },
    error: {
      type: String,
      maxlength: 160,
      trim: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

speechLogSchema.index({ provider: 1, createdAt: -1 });

export type SpeechLogDocument = InferSchemaType<typeof speechLogSchema>;

export const SpeechLog = model<SpeechLogDocument>('SpeechLog', speechLogSchema);

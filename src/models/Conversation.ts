import { model, Schema, type InferSchemaType } from 'mongoose';

const conversationMessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'ai'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      required: true,
      default: 'active',
    },
    messages: {
      type: [conversationMessageSchema],
      required: true,
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    durationSec: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ userId: 1, createdAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;

export const Conversation = model<ConversationDocument>('Conversation', conversationSchema);

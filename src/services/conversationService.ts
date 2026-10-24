import { isValidObjectId, type Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Lesson, type RoleplayStep } from '../models/Lesson.js';
import { buildConversationPrompt } from '../prompts/conversationPrompt.js';
import { synthesizeSpeechToStoredAudio } from './speechService.js';
import type { Level } from '../types/content.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import type {
  ConversationStartInput,
  ConversationTurnInput,
} from '../validators/conversationValidator.js';
import {
  generateConversationResponse,
  toCorrection,
  type Correction,
} from './conversationLlmService.js';
import { buildConversationFeedback, type ConversationFeedback } from './feedbackService.js';
import { recordMistake } from './mistakeService.js';

type ConversationMessage = {
  role: 'user' | 'ai';
  text: string;
  audioUrl?: string | null;
  correction?: Correction | null;
  createdAt: Date;
};

type ConversationUser = {
  _id: Types.ObjectId;
  level: Level;
  name?: string | null;
};

function getRoleplayStep(
  steps: ReadonlyArray<{
    type: 'learn' | 'repeat' | 'roleplay';
    roleplay?: RoleplayStep | null;
  }>,
): RoleplayStep {
  const roleplay = steps.find(
    (step) => step.type === 'roleplay' && step.roleplay !== null && step.roleplay !== undefined,
  )?.roleplay;

  if (!roleplay) {
    throw new ApiError(400, 'Lesson has no roleplay step');
  }

  return roleplay;
}

function toConversationMessage(message: ConversationMessage) {
  return {
    role: message.role,
    text: message.text,
    audioUrl: message.audioUrl ?? null,
    correction: message.role === 'user' ? (message.correction ?? null) : undefined,
    createdAt: message.createdAt,
  };
}

async function synthesizeConversationAudio(text: string): Promise<string | null> {
  try {
    const speech = await synthesizeSpeechToStoredAudio({
      text,
      language: 'en-IN',
    });

    return speech.audioUrl;
  } catch {
    return null;
  }
}

export async function startConversation(userId: Types.ObjectId, input: ConversationStartInput) {
  if (!isValidObjectId(input.lessonId)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const lesson = await Lesson.findById(input.lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const roleplay = getRoleplayStep(lesson.steps);
  const openingAudioUrl = await synthesizeConversationAudio(roleplay.openingLine);

  const conversation = await Conversation.create({
    userId,
    lessonId: lesson._id,
    status: 'active',
    messages: [
      {
        role: 'ai',
        text: roleplay.openingLine,
        audioUrl: openingAudioUrl,
      },
    ],
  });

  return {
    conversationId: conversation._id.toString(),
    status: conversation.status,
    messages: conversation.messages.map(toConversationMessage),
    turnsRemaining: roleplay.maxTurns,
  };
}

function toLlmMessages(
  messages: ReadonlyArray<Pick<ConversationMessage, 'role' | 'text'>>,
): { role: 'user' | 'assistant'; content: string }[] {
  return messages.slice(-10).map((message) => ({
    role: message.role === 'ai' ? 'assistant' : 'user',
    content: message.text,
  }));
}

function durationSince(startedAt: Date): number {
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
}

async function findOwnedConversation(userId: Types.ObjectId, conversationId: string) {
  if (!isValidObjectId(conversationId)) {
    throw new ApiError(404, 'Conversation not found');
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  });

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  return conversation;
}

function countUserTurns(messages: ReadonlyArray<Pick<ConversationMessage, 'role'>>): number {
  return messages.filter((message) => message.role === 'user').length;
}

export async function takeConversationTurn(
  user: ConversationUser,
  conversationId: string,
  input: ConversationTurnInput,
) {
  const existingConversation = await findOwnedConversation(user._id, conversationId);

  const lesson = await Lesson.findById(existingConversation.lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const roleplay = getRoleplayStep(lesson.steps);

  // Atomic conditional update: append user message only if conversation is
  // active and current user turns are below maxTurns.
  const userMessage = {
    role: 'user' as const,
    text: input.text,
    audioUrl: null,
    createdAt: new Date(),
  };

  const updatedConversation = await Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      userId: user._id,
      status: 'active',
      // Only match if the number of user messages is below maxTurns
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: '$messages',
                as: 'msg',
                cond: { $eq: ['$$msg.role', 'user'] },
              },
            },
          },
          roleplay.maxTurns,
        ],
      },
    },
    {
      $push: { messages: userMessage },
    },
    { returnDocument: 'after' },
  );

  if (!updatedConversation) {
    throw new ApiError(
      409,
      'Cannot take turn: conversation is not active or has reached the maximum number of turns',
    );
  }

  const completedUserTurns = countUserTurns(updatedConversation.messages);
  const turnsRemaining = Math.max(0, roleplay.maxTurns - completedUserTurns);

  let output;
  try {
    output = await generateConversationResponse({
      system: buildConversationPrompt({
        roleplay,
        user: {
          level: user.level,
          name: user.name ?? undefined,
        },
        turnsRemaining,
      }),
      messages: toLlmMessages(updatedConversation.messages),
    });
  } catch (error) {
    await Conversation.updateOne({ _id: conversationId }, { $pop: { messages: 1 } });
    throw error;
  }

  // Compute correction from LLM output before saving
  const correction = toCorrection(output, input.text);
  if (correction) {
    await recordMistake({
      userId: user._id,
      conversationId: existingConversation._id,
      lessonId: lesson._id,
      original: input.text,
      correction,
    });
  }

  const aiAudioUrl = await synthesizeConversationAudio(output.reply);

  // Find the user message _id that was just pushed so we can attach
  // the correction to it with arrayFilters in one save.
  const lastUserMsg = [...updatedConversation.messages].reverse().find((m) => m.role === 'user');

  updatedConversation.messages.push({
    role: 'ai',
    text: output.reply,
    audioUrl: aiAudioUrl,
    createdAt: new Date(),
  });

  const endConversation = turnsRemaining === 0 || output.endConversation;

  if (endConversation) {
    updatedConversation.status = 'completed';
    updatedConversation.endedAt = new Date();
    updatedConversation.durationSec = durationSince(updatedConversation.startedAt);
  }

  // Attach correction to the user message and save everything atomically.
  // Using arrayFilters targets the specific user message by _id.
  if (correction && lastUserMsg) {
    // Set correction on the in-memory document so the save persists it
    lastUserMsg.correction = correction;
  }

  let feedback: ConversationFeedback | null = null;
  if (endConversation) {
    try {
      feedback = await buildConversationFeedback(updatedConversation);
    } catch (error) {
      logger.warn(
        { conversationId, error },
        'Conversation completed but feedback could not be built',
      );
    }
  }

  await updatedConversation.save();

  return {
    reply: output.reply,
    audioUrl: aiAudioUrl,
    endConversation,
    turnsRemaining,
    correction,
    feedback,
  };
}

export async function endConversation(user: ConversationUser, conversationId: string) {
  const conversation = await findOwnedConversation(user._id, conversationId);

  if (conversation.status === 'abandoned') {
    throw new ApiError(409, 'Conversation is not active');
  }

  let feedback: ConversationFeedback;
  if (conversation.status === 'active') {
    conversation.status = 'completed';
    conversation.endedAt = new Date();
    conversation.durationSec = durationSince(conversation.startedAt);
    feedback = await buildConversationFeedback(conversation);
    await conversation.save();
  } else {
    feedback = await buildConversationFeedback(conversation);
  }

  return {
    conversationId: conversation._id.toString(),
    status: conversation.status,
    durationSec: conversation.durationSec ?? 0,
    userTurns: countUserTurns(conversation.messages),
    feedback,
  };
}

export async function getConversation(user: ConversationUser, conversationId: string) {
  const conversation = await findOwnedConversation(user._id, conversationId);
  const feedback =
    conversation.status === 'completed' ? await buildConversationFeedback(conversation) : null;

  return {
    conversationId: conversation._id.toString(),
    lessonId: conversation.lessonId.toString(),
    status: conversation.status,
    messages: conversation.messages.map(toConversationMessage),
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    durationSec: conversation.durationSec,
    feedback,
  };
}

import { isValidObjectId, type Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Lesson, type RoleplayStep } from '../models/Lesson.js';
import { buildConversationPrompt } from '../prompts/conversationPrompt.js';
import { generateConversationResponse } from './conversationLlmService.js';
import type { Level } from '../types/content.js';
import { ApiError } from '../utils/ApiError.js';
import type {
  ConversationStartInput,
  ConversationTurnInput,
} from '../validators/conversationValidator.js';

type ConversationMessage = {
  role: 'user' | 'ai';
  text: string;
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

function toConversationMessage(message: ConversationMessage): ConversationMessage {
  return {
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
  };
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
  const conversation = await Conversation.create({
    userId,
    lessonId: lesson._id,
    status: 'active',
    messages: [
      {
        role: 'ai',
        text: roleplay.openingLine,
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
  const conversation = await findOwnedConversation(user._id, conversationId);

  if (conversation.status !== 'active') {
    throw new ApiError(409, 'Conversation is not active');
  }

  const lesson = await Lesson.findById(conversation.lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const roleplay = getRoleplayStep(lesson.steps);
  const completedUserTurns = countUserTurns(conversation.messages);
  const turnsRemaining = Math.max(0, roleplay.maxTurns - completedUserTurns - 1);

  conversation.messages.push({
    role: 'user',
    text: input.text,
    createdAt: new Date(),
  });
  await conversation.save();

  const output = await generateConversationResponse({
    system: buildConversationPrompt({
      roleplay,
      user: {
        level: user.level,
        name: user.name ?? undefined,
      },
      turnsRemaining,
    }),
    messages: toLlmMessages(conversation.messages),
  });

  conversation.messages.push({
    role: 'ai',
    text: output.reply,
    createdAt: new Date(),
  });

  const endConversation = turnsRemaining === 0 || output.endConversation;

  if (endConversation) {
    conversation.status = 'completed';
    conversation.endedAt = new Date();
    conversation.durationSec = durationSince(conversation.startedAt);
  }

  await conversation.save();

  return {
    reply: output.reply,
    endConversation,
    turnsRemaining,
  };
}

export async function endConversation(user: ConversationUser, conversationId: string) {
  const conversation = await findOwnedConversation(user._id, conversationId);

  if (conversation.status === 'abandoned') {
    throw new ApiError(409, 'Conversation is not active');
  }

  if (conversation.status === 'active') {
    conversation.status = 'completed';
    conversation.endedAt = new Date();
    conversation.durationSec = durationSince(conversation.startedAt);
    await conversation.save();
  }

  return {
    conversationId: conversation._id.toString(),
    status: conversation.status,
    durationSec: conversation.durationSec ?? 0,
    userTurns: countUserTurns(conversation.messages),
  };
}

export async function getConversation(user: ConversationUser, conversationId: string) {
  const conversation = await findOwnedConversation(user._id, conversationId);

  return {
    conversationId: conversation._id.toString(),
    lessonId: conversation.lessonId.toString(),
    status: conversation.status,
    messages: conversation.messages.map(toConversationMessage),
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    durationSec: conversation.durationSec,
  };
}

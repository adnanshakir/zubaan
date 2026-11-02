import { isValidObjectId, type Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { LessonAttempt } from '../models/LessonAttempt.js';
import { User } from '../models/User.js';
import { buildConversationPrompt } from '../prompts/conversationPrompt.js';
import { synthesizeSpeechToStoredAudio } from './speechService.js';
import type { UserDocument } from '../models/User.js';
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
import { stepScript, type ScriptState } from '../utils/scripted-lesson.js';
import { getBuiltLesson, resolveLang } from './lessonBuilder.js';

type ConversationMessage = {
  role: 'user' | 'ai';
  text: string;
  audioUrl?: string | null;
  correction?: Correction | null;
  turnIndex: number;
  revealHint?: boolean | null;
  outcome?: 'exact' | 'close' | 'off' | 'moved_on' | null;
  createdAt: Date;
};

type ConversationUser = {
  _id: Types.ObjectId;
  level: Level;
  name?: string | null;
  nativeLanguage: UserDocument['nativeLanguage'];
};

function toConversationMessage(message: ConversationMessage) {
  return {
    role: message.role,
    text: message.text,
    audioUrl: message.audioUrl ?? null,
    correction: message.role === 'user' ? (message.correction ?? null) : undefined,
    turnIndex: message.turnIndex,
    outcome: message.role === 'user' ? message.outcome : undefined,
    revealHint: message.role === 'ai' ? message.revealHint : undefined,
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

  const user = await User.findById(userId).select('nativeLanguage').lean();
  if (!user) throw new ApiError(404, 'User not found');
  const lesson = await getBuiltLesson(input.lessonId, resolveLang(undefined, user));
  if (input.attemptId) {
    if (!isValidObjectId(input.attemptId)) throw new ApiError(400, 'Invalid attemptId');
    const attempt = await LessonAttempt.findOne({
      _id: input.attemptId,
      lessonId: lesson.id,
      userId,
    });
    if (!attempt) throw new ApiError(400, 'Attempt does not belong to this lesson and user');
  }

  const chat = lesson.chat;
  const opening = chat.turns[0];
  if (!opening) throw new ApiError(400, 'Lesson has no conversation turns');
  const openingAudioUrl = await synthesizeConversationAudio(opening.ai);

  const conversation = await Conversation.create({
    userId,
    lessonId: lesson.id,
    ...(input.attemptId ? { attemptId: input.attemptId } : {}),
    status: 'active',
    messages: [
      {
        role: 'ai',
        text: opening.ai,
        audioUrl: openingAudioUrl,
        turnIndex: 0,
      },
    ],
    script: chat.turns.length ? { turnIndex: 0, attempts: 0 } : undefined,
  });

  return {
    conversationId: conversation._id.toString(),
    attemptId: conversation.attemptId?.toString() ?? null,
    status: conversation.status,
    messages: conversation.messages.map(toConversationMessage),
    turnsRemaining: chat.turns.length * 3,
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

  const lesson = await getBuiltLesson(
    existingConversation.lessonId.toString(),
    resolveLang(undefined, user),
  );

  const chat = lesson.chat;
  const maxTurns = chat.turns.length * 3;

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
          maxTurns,
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
  const turnsRemaining = Math.max(0, maxTurns - completedUserTurns);

  const lastUserMsg = [...updatedConversation.messages].reverse().find((m) => m.role === 'user');
  if (chat.turns.length > 0) {
    const scriptState: ScriptState = updatedConversation.script
      ? {
          turnIndex: updatedConversation.script.turnIndex,
          attempts: updatedConversation.script.attempts,
        }
      : { turnIndex: 0, attempts: 0 };
    const step = stepScript(
      {
        turns: chat.turns.map((turn) => ({
          ai: turn.ai,
          sentenceId: turn.sentenceId,
          alternatives: turn.alternatives,
          repeat: turn.repeat,
          free: turn.free,
          knownMistakes: turn.knownMistakes?.map((mistake) => ({
            wrong: mistake.wrong,
            explanation: mistake.explanation,
            type: mistake.type,
          })),
        })),
        closingLine: chat.closingLine,
      },
      lesson.sentences.map((sentence) => ({ id: sentence.id, text: sentence.text })),
      scriptState,
      input.text,
    );
    if (!lastUserMsg) {
      throw new ApiError(500, 'Conversation user message was not saved');
    }
    lastUserMsg.turnIndex = scriptState.turnIndex;
    lastUserMsg.outcome = step.outcome;
    updatedConversation.script = step.state;

    const correction =
      step.outcome !== 'moved_on' && step.check.corrected
        ? {
            corrected: step.check.corrected,
            explanation: step.check.explanation,
            type: step.check.mistakeType,
          }
        : null;
    lastUserMsg.correction = correction;
    const aiAudioUrl = await synthesizeConversationAudio(step.reply);
    updatedConversation.messages.push({
      role: 'ai',
      text: step.reply,
      audioUrl: aiAudioUrl,
      turnIndex: step.finished ? chat.turns.length - 1 : step.state.turnIndex,
      revealHint: step.revealHint,
      createdAt: new Date(),
    });

    if (step.finished) {
      updatedConversation.status = 'completed';
      updatedConversation.endedAt = new Date();
      updatedConversation.durationSec = durationSince(updatedConversation.startedAt);
    }
    let feedback: ConversationFeedback | null = null;
    if (step.finished) {
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
    if (correction) {
      await recordMistake({
        userId: user._id,
        conversationId: existingConversation._id,
        lessonId: existingConversation.lessonId,
        original: input.text,
        correction,
      });
    }
    return {
      reply: step.reply,
      audioUrl: aiAudioUrl,
      endConversation: step.finished,
      turnsRemaining: Math.max(0, maxTurns - completedUserTurns),
      progress: {
        current: Math.min(step.state.turnIndex + 1, chat.turns.length),
        total: chat.turns.length,
      },
      hasMistake: correction !== null,
      corrected: correction?.corrected ?? '',
      explanation: correction?.explanation ?? '',
      mistakeType: correction?.type ?? 'other',
      correction,
      revealHint: step.revealHint,
      feedback,
    };
  }

  let output;
  try {
    output = await generateConversationResponse({
      system: buildConversationPrompt({
        chat: {
          aiRole: chat.aiRole,
          userRole: chat.userRole,
          situation: chat.situation,
          goal: chat.goal,
        },
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

  const aiAudioUrl = await synthesizeConversationAudio(output.reply);

  // Find the user message _id that was just pushed so we can attach
  // the correction to it with arrayFilters in one save.
  updatedConversation.messages.push({
    role: 'ai',
    text: output.reply,
    audioUrl: aiAudioUrl,
    createdAt: new Date(),
    turnIndex: completedUserTurns,
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

  if (correction) {
    await recordMistake({
      userId: user._id,
      conversationId: existingConversation._id,
      lessonId: existingConversation.lessonId,
      original: input.text,
      correction,
    });
  }

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
    attemptId: conversation.attemptId?.toString() ?? null,
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
    attemptId: conversation.attemptId?.toString() ?? null,
    status: conversation.status,
    messages: conversation.messages.map(toConversationMessage),
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    durationSec: conversation.durationSec,
    feedback,
  };
}

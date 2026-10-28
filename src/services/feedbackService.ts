import type { Types } from 'mongoose';
import { normalizeText, type MistakeType } from '../utils/text.js';
import type { Correction } from './conversationLlmService.js';
import { Lesson } from '../models/Lesson.js';

export interface FeedbackMessage {
  role: 'user' | 'ai';
  text: string;
  correction?: Correction | null;
}

export interface FeedbackCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: MistakeType;
}

export interface ConversationFeedback {
  userTurns: number;
  durationSec: number | null;
  mistakeCount: number;
  corrections: FeedbackCorrection[];
  targetPhrases: { used: string[]; missed: string[] };
}

/** Pure function: no database access, easy to reason about. */
export function buildFeedback(
  messages: readonly FeedbackMessage[],
  targetPhrases: readonly string[],
  durationSec: number | null,
): ConversationFeedback {
  const userMessages = messages.filter((m) => m.role === 'user');

  // Normalise each message on its own, then join with ' | ' (a character
  // normalizeText never produces) so a phrase cannot match across two
  // different messages. Padding with spaces makes the match whole-word, so
  // the phrase "I am" does not match inside "I amazing".
  const haystack = ` ${userMessages.map((m) => normalizeText(m.text)).join(' | ')} `;

  const used: string[] = [];
  const missed: string[] = [];
  for (const phrase of targetPhrases) {
    const needle = normalizeText(phrase);
    if (needle !== '' && haystack.includes(` ${needle} `)) used.push(phrase);
    else missed.push(phrase);
  }

  // Pick fields explicitly (do not spread the stored object, it could
  // carry Mongoose internals such as _id).
  const corrections: FeedbackCorrection[] = [];
  for (const message of userMessages) {
    if (!message.correction) continue;
    corrections.push({
      original: message.text,
      corrected: message.correction.corrected,
      explanation: message.correction.explanation,
      type: message.correction.type,
    });
  }

  return {
    userTurns: userMessages.length,
    durationSec,
    mistakeCount: corrections.length,
    corrections,
    targetPhrases: { used, missed },
  };
}

/** Target phrases come from the lesson sentences. */
async function loadTargetPhrases(lessonId: Types.ObjectId | string): Promise<string[]> {
  const lesson = await Lesson.findById(lessonId).select('sentences').lean();
  return lesson?.sentences.map((sentence) => sentence.text) ?? [];
}

/** Accepts a conversation (lean object or document). */
export async function buildConversationFeedback(conversation: {
  lessonId: Types.ObjectId | string;
  messages: readonly FeedbackMessage[];
  durationSec?: number | null;
}): Promise<ConversationFeedback> {
  const targetPhrases = await loadTargetPhrases(conversation.lessonId);
  return buildFeedback(conversation.messages, targetPhrases, conversation.durationSec ?? null);
}

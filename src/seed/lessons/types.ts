export interface Sentence {
  id: string; // 's1', 's2', ...
  text: string;
  hi: string; // Hindi meaning
  meaning: string; // Hindi meaning
  tip: string; // how to say it / grammar note
  chunks: readonly string[]; // chunks.join(' ') must equal text
}

export interface McqExercise {
  id: string;
  type: 'mcq';
  mistakeType?: MistakeKind;
  prompt: string;
  promptHi?: string;
  options: readonly string[]; // the app shuffles them
  correct: string; // must be one of options
  explanation: string;
}

export interface GapExercise {
  id: string;
  type: 'gap';
  mistakeType?: MistakeKind;
  sentence: string; // contains ___
  hi: string;
  options: readonly string[];
  correct: string;
  explanation: string;
}

export interface ListenPickExercise {
  id: string;
  type: 'listen_pick';
  prompt: string;
  text: string; // spoken with TTS, must equal `correct`
  options: readonly string[];
  correct: string;
  explanation: string;
}

export interface MatchPairsExercise {
  id: string;
  type: 'match_pairs';
  prompt: string;
  pairs: readonly { en: string; hi: string }[]; // 3 to 6 pairs
}

export interface OrderWordsExercise {
  id: string;
  type: 'order_words';
  mistakeType?: MistakeKind;
  promptHi: string; // the Hindi sentence to build in English
  answer: string; // tiles = answer.split(' '), punctuation stays on its word
  extraWords?: readonly string[]; // wrong tiles mixed in
  explanation: string;
}

export interface SpeakExercise {
  id: string;
  type: 'speak';
  sentenceId: string; // says the sentence out loud with colored feedback
}

export type Exercise =
  | McqExercise
  | GapExercise
  | ListenPickExercise
  | MatchPairsExercise
  | OrderWordsExercise
  | SpeakExercise;

export interface Stage {
  id: 'words' | 'sentences';
  title: string;
  intro: string;
  exercises: readonly Exercise[];
}

export type MistakeKind = 'grammar' | 'tense' | 'preposition' | 'word_choice';

export interface KnownMistake {
  /** Words the learner may say wrongly, matched as a whole-word phrase after normalizing. */
  wrong: string;
  explanation: string;
  type: MistakeKind;
}

export interface ChatTurn {
  ai: string; // what the AI says before the learner answers
  sentenceId: string; // the sentence the learner should say
  alternatives?: readonly string[]; // other accepted answers (count as exact)
  hint: { en: string; hi: string; native: string }; // always visible; the sentence is behind a tap
  repeat: string; // AI re-asks in character after an unrelated answer
  knownMistakes?: readonly KnownMistake[]; // beat the automatic explanation
  free?: boolean; // "say it your own way"
}

export interface Chat {
  aiRole: string;
  userRole: string;
  situation: string;
  goal: string;
  turns: readonly ChatTurn[];
  closingLine: string;
}

export interface LessonContent {
  slug: string;
  title: string;
  category: LessonCategory;
  level: Level;
  objective: string;
  estimatedMinutes: number;
  unit?: string;
  order?: number;
  canDo?: string;
  focus?: string;
  sentences: readonly Sentence[];
  stages: readonly Stage[];
  chat: Chat;
}
import type { LessonCategory, Level } from '../../types/content.js';

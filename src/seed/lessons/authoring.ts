import type { KnownMistake, MistakeKind } from './types.js';

export interface PhraseDef {
  id: string; // 'p1', stable forever: results and mistakes point at it
  text: string;
  chunks: readonly string[]; // chunks.join(' ') must equal text
  tip: string; // how to say it, in English
  why?: string; // grammar reason shown after practice (defaults to tip)
  mistakeType?: MistakeKind; // default 'grammar'
  gap?: { word: string; options: readonly string[] }; // word must be inside text
  wrong?: readonly string[]; // wrong versions for "choose the correct sentence"
  distractors?: readonly string[]; // similar sentences for listen-and-pick
  extraWords?: readonly string[]; // wrong tiles for word order
  focus?: { sound?: string; grammar?: string }; // metadata for later
}

export interface VocabDef {
  id: string;
  en: string;
}

export interface ConceptDef {
  id: string;
  prompt: string;
  options: readonly string[];
  correct: string;
  explanation: string;
}

export interface TurnDef {
  id: string; // 't1'
  ai: string;
  phraseId: string;
  alternatives?: readonly string[];
  hint: string; // English hint, shown to every learner
  repeat: string;
  knownMistakes?: readonly KnownMistake[];
  free?: boolean; // "say it your own way": any answer of 3+ English words counts
}

export interface LessonDef {
  slug: string;
  title: string;
  category: string;
  level: string;
  unit: string;
  order: number; // order inside the level
  canDo: string;
  focus: string;
  estimatedMinutes: number;
  phrases: readonly PhraseDef[];
  vocab: readonly VocabDef[];
  concepts: readonly ConceptDef[];
  dialogue: {
    aiRole: string;
    userRole: string;
    situation: string;
    goal: string;
    turns: readonly TurnDef[];
    closingLine: string;
  };
}

export interface LessonTranslation {
  lang: string; // 'hi'
  canDo?: string;
  phrases: Record<string, { meaning: string; tip?: string; why?: string }>;
  vocab: Record<string, string>;
  concepts?: Record<string, { prompt?: string; explanation?: string }>;
  turns: Record<string, { hint: string }>;
  ui: { spotPrompt: string };
}

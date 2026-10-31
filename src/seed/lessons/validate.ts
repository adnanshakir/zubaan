import type { LessonDef, LessonTranslation } from './authoring.js';
import type { LessonContent } from './types.js';

/** Returns a list of problems; an empty list means the lesson is consistent. */
export function validateLesson(lesson: LessonContent): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`${lesson.slug}: ${message}`);
  };

  const sentenceIds = new Set<string>();
  for (const sentence of lesson.sentences) {
    if (sentenceIds.has(sentence.id)) fail(`duplicate sentence id ${sentence.id}`);
    sentenceIds.add(sentence.id);
    if (sentence.chunks.join(' ') !== sentence.text) {
      fail(`chunks of ${sentence.id} do not join into its text`);
    }
  }

  const exerciseIds = new Set<string>();
  const spoken = new Set<string>();
  for (const stage of lesson.stages) {
    for (const exercise of stage.exercises) {
      if (exerciseIds.has(exercise.id)) fail(`duplicate exercise id ${exercise.id}`);
      exerciseIds.add(exercise.id);
      switch (exercise.type) {
        case 'mcq':
        case 'gap':
        case 'listen_pick': {
          if (!exercise.options.includes(exercise.correct)) {
            fail(`${exercise.id}: correct answer is not in options`);
          }
          if (new Set(exercise.options).size !== exercise.options.length) {
            fail(`${exercise.id}: duplicate options`);
          }
          if (exercise.type === 'gap' && !exercise.sentence.includes('___')) {
            fail(`${exercise.id}: gap sentence has no ___`);
          }
          if (exercise.type === 'listen_pick' && exercise.correct !== exercise.text) {
            fail(`${exercise.id}: correct must equal the spoken text`);
          }
          break;
        }
        case 'order_words': {
          if (exercise.answer.split(' ').length < 4) fail(`${exercise.id}: answer is too short`);
          break;
        }
        case 'match_pairs': {
          const count = exercise.pairs.length;
          if (count < 3 || count > 6) fail(`${exercise.id}: needs 3 to 6 pairs`);
          break;
        }
        case 'speak': {
          if (!sentenceIds.has(exercise.sentenceId)) {
            fail(`${exercise.id}: unknown sentence ${exercise.sentenceId}`);
          }
          spoken.add(exercise.sentenceId);
          break;
        }
      }
      if (exercise.type !== 'mcq' && exercise.type !== 'gap' && exercise.type !== 'order_words') {
        if ('mistakeType' in exercise) {
          fail(`${exercise.id}: mistakeType is not allowed on ${exercise.type}`);
        }
      }
    }
  }

  const asked = new Set<string>();
  lesson.chat.turns.forEach((turn, index) => {
    if (!sentenceIds.has(turn.sentenceId)) {
      fail(`turn ${index + 1}: unknown sentence ${turn.sentenceId}`);
    }
    asked.add(turn.sentenceId);
    if (!turn.hint.en || !turn.hint.hi || !turn.repeat) {
      fail(`turn ${index + 1}: hint and repeat are required`);
    }
  });
  if (lesson.chat.turns.length < 5) fail('the chat needs at least 5 turns');

  for (const sentence of lesson.sentences) {
    if (!spoken.has(sentence.id)) fail(`${sentence.id} has no speak exercise`);
    if (!asked.has(sentence.id)) fail(`${sentence.id} is never asked in the chat`);
  }

  return problems;
}

export function validateAuthoring(def: LessonDef, tr: LessonTranslation): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`${def.slug}: ${message}`);
  };
  const unique = (ids: readonly string[], label: string): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) fail(`duplicate ${label} id ${id}`);
      seen.add(id);
    }
  };

  unique(
    def.phrases.map((phrase) => phrase.id),
    'phrase',
  );
  unique(
    def.vocab.map((vocab) => vocab.id),
    'vocab',
  );
  unique(
    def.concepts.map((concept) => concept.id),
    'concept',
  );
  unique(
    def.dialogue.turns.map((turn) => turn.id),
    'turn',
  );

  for (const phrase of def.phrases) {
    if (phrase.chunks.join(' ') !== phrase.text)
      fail(`chunks of ${phrase.id} do not join into its text`);
    if (phrase.text.trim().split(/\s+/).length > 12) fail(`${phrase.id} has more than 12 words`);
    const translation = tr.phrases[phrase.id];
    if (!translation?.meaning) fail(`missing translation phrases.${phrase.id}.meaning`);
    if (phrase.gap) {
      const escaped = phrase.gap.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wholeWord = new RegExp(`\\b${escaped}\\b`, 'i');
      if (!wholeWord.test(phrase.text)) fail(`${phrase.id}: gap word is not in the text`);
      if (!phrase.gap.options.includes(phrase.gap.word))
        fail(`${phrase.id}: gap word is not an option`);
      if (new Set(phrase.gap.options).size !== phrase.gap.options.length) {
        fail(`${phrase.id}: duplicate gap options`);
      }
    }
    if (phrase.wrong && (phrase.wrong.length === 0 || phrase.wrong.includes(phrase.text))) {
      fail(`${phrase.id}: wrong options must be non-empty and different from the text`);
    }
    if (
      phrase.distractors &&
      (phrase.distractors.length === 0 || phrase.distractors.includes(phrase.text))
    ) {
      fail(`${phrase.id}: distractors must be non-empty and different from the text`);
    }
  }
  for (const vocab of def.vocab) {
    if (!tr.vocab[vocab.id]) fail(`missing translation vocab.${vocab.id}`);
  }
  for (const concept of def.concepts) {
    if (!concept.options.includes(concept.correct))
      fail(`${concept.id}: correct answer is not in options`);
  }
  const phraseIds = new Set(def.phrases.map((phrase) => phrase.id));
  const asked = new Set<string>();
  for (const turn of def.dialogue.turns) {
    if (!tr.turns[turn.id]?.hint) fail(`missing translation turns.${turn.id}.hint`);
    if (!phraseIds.has(turn.phraseId)) fail(`${turn.id}: unknown phrase ${turn.phraseId}`);
    if (!turn.repeat) fail(`${turn.id}: repeat is required`);
    asked.add(turn.phraseId);
  }
  if (def.dialogue.turns.length < 5) fail('the chat needs at least 5 turns');
  for (const phrase of def.phrases) {
    if (!asked.has(phrase.id)) fail(`${phrase.id} is never asked in the chat`);
  }
  return problems;
}

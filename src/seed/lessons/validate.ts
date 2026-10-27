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

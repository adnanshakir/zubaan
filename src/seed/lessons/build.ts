import type { DrillDef, LessonDef, LessonTranslation } from './authoring.js';
import type { Exercise, LessonContent, Stage, Sentence } from './types.js';

function missing(slug: string, key: string): never {
  throw new Error(`Missing translation for lesson ${slug}: ${key}`);
}

export function buildLesson(def: LessonDef, tr: LessonTranslation): LessonContent {
  const phraseTranslation = (id: string) => {
    const translation = tr.phrases[id];
    if (!translation) missing(def.slug, `phrases.${id}`);
    return translation;
  };
  const vocabTranslation = (id: string) => {
    const translation = tr.vocab[id];
    if (!translation) missing(def.slug, `vocab.${id}`);
    return translation;
  };
  const turnTranslation = (id: string) => {
    const translation = tr.turns[id];
    if (!translation) missing(def.slug, `turns.${id}`);
    return translation;
  };
  const drillTranslation = (id: string) => tr.drills?.[id];

  const buildDrill = (drill: DrillDef): Exercise => {
    const translation = drillTranslation(drill.id);
    switch (drill.type) {
      case 'mcq':
        return {
          id: drill.id,
          type: 'mcq',
          prompt: drill.prompt,
          promptHi: translation?.promptHi,
          options: drill.options,
          correct: drill.correct,
          explanation: translation?.explanation ?? drill.explanation,
          mistakeType: drill.mistakeType,
        };
      case 'type_gap':
        if (!translation?.hi) missing(def.slug, `drills.${drill.id}.hi`);
        return {
          id: drill.id,
          type: 'type_gap',
          sentence: drill.sentence,
          hi: translation.hi,
          accept: drill.accept,
          explanation: translation.explanation ?? drill.explanation,
          mistakeType: drill.mistakeType,
        };
      case 'dictation':
        return {
          id: drill.id,
          type: 'dictation',
          text: drill.text,
          explanation: translation?.explanation ?? drill.explanation,
          mistakeType: drill.mistakeType,
        };
      case 'reply_speak':
        if (!translation?.hint) missing(def.slug, `drills.${drill.id}.hint`);
        return {
          id: drill.id,
          type: 'reply_speak',
          ai: drill.ai,
          hint: { en: drill.hint, hi: translation.hint, native: translation.hint },
          accept: drill.accept,
          explanation: translation.explanation ?? drill.explanation,
        };
    }
  };

  const sentences: Sentence[] = def.phrases.map((phrase) => {
    const translation = phraseTranslation(phrase.id);
    return {
      id: phrase.id,
      text: phrase.text,
      hi: translation.meaning,
      meaning: translation.meaning,
      tip: translation.tip ?? phrase.tip,
      chunks: phrase.chunks,
    };
  });

  const wordExercises: Exercise[] = [];
  if (def.vocab.length >= 3) {
    wordExercises.push({
      id: 'w-match',
      type: 'match_pairs',
      prompt: 'Match each word with its meaning.',
      pairs: def.vocab.map((vocab) => ({ en: vocab.en, hi: vocabTranslation(vocab.id) })),
    });
  }
  for (const concept of def.concepts) {
    const translation = tr.concepts?.[concept.id];
    wordExercises.push({
      id: `w-c-${concept.id}`,
      type: 'mcq',
      prompt: concept.prompt,
      promptHi: translation?.prompt,
      options: concept.options,
      correct: concept.correct,
      explanation: translation?.explanation ?? concept.explanation,
    });
  }
  for (const phrase of def.phrases.filter((item) => item.distractors).slice(0, 2)) {
    const translation = phraseTranslation(phrase.id);
    wordExercises.push({
      id: `w-l-${phrase.id}`,
      type: 'listen_pick',
      prompt: 'Listen and choose what you hear.',
      text: phrase.text,
      options: [phrase.text, ...(phrase.distractors ?? []).slice(0, 3)],
      correct: phrase.text,
      explanation: translation.tip ?? phrase.tip,
    });
  }

  const sentenceExercises: Exercise[] = [];
  for (const phrase of def.phrases) {
    const translation = phraseTranslation(phrase.id);
    const explanation = translation.why ?? phrase.why ?? translation.tip ?? phrase.tip;
    if (phrase.gap) {
      const escaped = phrase.gap.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sentence = phrase.text.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '___');
      sentenceExercises.push({
        id: `g-${phrase.id}`,
        type: 'gap',
        mistakeType: phrase.mistakeType ?? 'grammar',
        sentence,
        hi: translation.meaning,
        options: phrase.gap.options,
        correct: phrase.gap.word,
        explanation,
      });
    } else if (phrase.wrong) {
      sentenceExercises.push({
        id: `g-${phrase.id}`,
        type: 'mcq',
        mistakeType: phrase.mistakeType ?? 'grammar',
        prompt: 'Choose the correct sentence.',
        promptHi: tr.ui.spotPrompt,
        options: [phrase.text, ...phrase.wrong],
        correct: phrase.text,
        explanation,
      });
    } else if (phrase.text.trim().split(/\s+/).length >= 4) {
      sentenceExercises.push({
        id: `g-${phrase.id}`,
        type: 'order_words',
        mistakeType: phrase.mistakeType ?? 'grammar',
        promptHi: translation.meaning,
        answer: phrase.text,
        extraWords: phrase.extraWords,
        explanation,
      });
    }
    sentenceExercises.push({ id: `say-${phrase.id}`, type: 'speak', sentenceId: phrase.id });
    for (const drill of def.drills ?? []) {
      if (drill.stage === 'sentences' && drill.after === phrase.id) {
        sentenceExercises.push(buildDrill(drill));
      }
    }
  }
  for (const drill of def.drills ?? []) {
    if (drill.stage === 'sentences' && !drill.after) {
      sentenceExercises.push(buildDrill(drill));
    }
  }
  for (const drill of def.drills ?? []) {
    if (drill.stage === 'words') {
      wordExercises.push(buildDrill(drill));
    }
  }

  const stages: readonly Stage[] = [
    {
      id: 'words',
      title: 'Learn the words',
      intro: 'Meet the words and phrases you will need.',
      exercises: wordExercises,
    },
    {
      id: 'sentences',
      title: 'Build the sentences',
      intro: 'Practise the grammar, then say each sentence out loud.',
      exercises: sentenceExercises,
    },
  ];

  return {
    slug: def.slug,
    title: def.title,
    category: def.category as LessonContent['category'],
    level: def.level as LessonContent['level'],
    objective: def.canDo,
    estimatedMinutes: def.estimatedMinutes,
    unit: def.unit,
    order: def.order,
    canDo: tr.canDo ?? def.canDo,
    focus: def.focus,
    sentences,
    stages,
    chat: {
      aiRole: def.dialogue.aiRole,
      userRole: def.dialogue.userRole,
      situation: def.dialogue.situation,
      goal: def.dialogue.goal,
      turns: def.dialogue.turns.map((turn) => {
        const nativeHint = turnTranslation(turn.id).hint;
        return {
          ai: turn.ai,
          sentenceId: turn.phraseId,
          alternatives: turn.alternatives,
          hint: { en: turn.hint, hi: nativeHint, native: nativeHint },
          repeat: turn.repeat,
          knownMistakes: turn.knownMistakes,
          free: turn.free,
        };
      }),
      closingLine: def.dialogue.closingLine,
    },
  };
}

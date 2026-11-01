import type { LessonDef } from '../authoring.js';

export const storyLesson: LessonDef = {
  slug: 'tell-a-story-about-a-challenge',
  title: 'Tell a story about a challenge',
  category: 'career',
  level: 'advanced',
  unit: 'storytelling',
  order: 1,
  canDo:
    'I can tell a clear story about a work challenge: the situation, the problem, my actions, and what I learned.',
  focus:
    'past continuous, past perfect, linking words (however, as a result, in the end), reflecting on a result',
  estimatedMinutes: 12,
  phrases: [
    {
      id: 'p1',
      text: 'Last year, I was leading a project with a tight deadline.',
      chunks: ['Last year,', 'I was leading', 'a project', 'with a tight deadline.'],
      tip: 'Stress "deadline" as DED-line. "Was leading" sets the scene of a situation in progress.',
      why: 'Use the past continuous ("was leading") for a situation that was in progress when the story begins.',
      mistakeType: 'tense',
      gap: { word: 'leading', options: ['leading', 'led', 'lead', 'leads'] },
    },
    {
      id: 'p2',
      text: 'At first, everything was going well.',
      chunks: ['At first,', 'everything', 'was going well.'],
      tip: '"At first" sets up a contrast that is coming. Say "everything" as EV-ree-thing.',
      why: '"Everything" takes a singular verb: "was going". Say "at first", without "the".',
      wrong: [
        'At first, everything were going well.',
        'At first, everything was go well.',
        'At first, everything is going well.',
      ],
    },
    {
      id: 'p3',
      text: 'However, our main developer suddenly left the team.',
      chunks: ['However,', 'our main developer', 'suddenly left', 'the team.'],
      tip: '"However" joins two ideas that contrast. Say it as how-EV-er, with a short pause after it.',
      why: '"However" shows contrast with the previous idea, and a comma follows it.',
      mistakeType: 'word_choice',
      gap: { word: 'However', options: ['However', 'Because', 'Although', 'Therefore'] },
    },
    {
      id: 'p4',
      text: 'I had never managed a crisis like that before.',
      chunks: ['I had never', 'managed a crisis', 'like that before.'],
      tip: '"I had" often sounds like "I\'d". "Had + a past form" talks about something before the moment in the story.',
      why: 'Use the past perfect ("had managed") for an experience from before the story moment.',
      mistakeType: 'tense',
      wrong: [
        'I have never managed a crisis like that before.',
        'I had never manage a crisis like that before.',
        'I did never managed a crisis like that before.',
      ],
    },
    {
      id: 'p5',
      text: 'As a result, I split the work and asked for support.',
      chunks: ['As a result,', 'I split', 'the work', 'and asked for support.'],
      tip: '"As a result" introduces a consequence. "Split" is the same in the past and the present.',
      why: 'Use past simple verbs for the actions in the story: "split", "asked".',
      extraWords: ['have', 'to'],
    },
    {
      id: 'p6',
      text: 'In the end, we delivered the project two days early.',
      chunks: ['In the end,', 'we delivered', 'the project', 'two days early.'],
      tip: '"In the end" means finally. Do not confuse it with "at the end of".',
      why: '"In the end" means finally. "At the end" needs "of" and a noun: "at the end of the project".',
      mistakeType: 'preposition',
      gap: { word: 'In', options: ['In', 'At', 'On', 'By'] },
      distractors: [
        'In the end, we delivered the project two days late.',
        'In the end, we delivered the project two weeks early.',
        'At the end, we delivered the project two days early.',
      ],
    },
    {
      id: 'p7',
      text: 'Looking back, I learned that asking for help early matters.',
      chunks: ['Looking back,', 'I learned', 'that asking for help', 'early matters.'],
      tip: '"Looking back" begins a reflection. "Asking" is the subject, so the verb is singular: "matters".',
      why: 'A phrase with "-ing" as the subject takes a singular verb: "asking ... matters".',
      extraWords: ['matter', 'to'],
    },
  ],
  vocab: [
    { id: 'setback', en: 'setback' },
    { id: 'crisis', en: 'crisis' },
    { id: 'deliver', en: 'deliver' },
    { id: 'resign', en: 'resign' },
    { id: 'reflect', en: 'reflect' },
  ],
  concepts: [
    {
      id: 'c1',
      prompt: 'What does "a setback" mean?',
      options: [
        'A problem that delays progress',
        'A big success',
        'A short holiday',
        'A new team member',
      ],
      correct: 'A problem that delays progress',
      explanation:
        'A setback is something that slows or stops progress, but you can recover from it.',
    },
    {
      id: 'c2',
      prompt: 'Which sentence uses the past perfect correctly?',
      options: [
        'I had finished the report before the meeting started.',
        'I had finish the report before the meeting started.',
        'I have finished the report before the meeting started yesterday.',
        'I finished had the report before the meeting.',
      ],
      correct: 'I had finished the report before the meeting started.',
      explanation:
        'The past perfect is "had" + the past participle. It shows what happened before another past moment.',
    },
    {
      id: 'c3',
      prompt: 'Which word shows contrast?',
      options: ['However', 'Therefore', 'Moreover', 'Firstly'],
      correct: 'However',
      explanation:
        '"However" shows contrast. "Therefore" shows a result, "moreover" adds an idea, and "firstly" starts a list.',
    },
  ],
  drills: [
    {
      id: 'd-best-start',
      type: 'mcq',
      stage: 'words',
      prompt: 'Which sentence is the best start for a story about a challenge?',
      options: [
        'Last year, I was leading a project with a tight deadline.',
        'I am leading a project with a tight deadline now.',
        'Project is tight deadline last year.',
        'Last year I lead project tight.',
      ],
      correct: 'Last year, I was leading a project with a tight deadline.',
      explanation: 'A good story start gives a time and the situation, in the past tense.',
    },
    {
      id: 'd-fill-however',
      type: 'type_gap',
      stage: 'sentences',
      after: 'p3',
      sentence: 'At first, everything was fine. ___, our main developer suddenly left the team.',
      accept: ['however', 'unfortunately', 'then'],
      explanation: '"However" marks the turn in the story, from good news to a problem.',
      mistakeType: 'word_choice',
    },
    {
      id: 'd-fix-past-perfect',
      type: 'mcq',
      stage: 'sentences',
      after: 'p4',
      prompt: 'Choose the correct sentence.',
      options: [
        'I had never managed a crisis like that before.',
        'I have never managed a crisis like that last year.',
        'I never had managed a crisis like that before.',
        'I had never manage a crisis like that before.',
      ],
      correct: 'I had never managed a crisis like that before.',
      explanation: 'Use "had" + the past participle for an earlier experience in a past story.',
      mistakeType: 'tense',
    },
    {
      id: 'd-dictate-asresult',
      type: 'dictation',
      stage: 'sentences',
      after: 'p5',
      text: 'As a result, I split the work and asked for support.',
      explanation: 'Listen for "asked for" and the soft ending of "asked".',
      mistakeType: 'grammar',
    },
    {
      id: 'd-fill-inend',
      type: 'type_gap',
      stage: 'sentences',
      after: 'p6',
      sentence: '___ the end, we delivered the project two days early.',
      accept: ['in'],
      explanation:
        '"In the end" means finally. "At the end" needs "of": "at the end of the project".',
      mistakeType: 'preposition',
    },
    {
      id: 'd-reply-challenge',
      type: 'reply_speak',
      stage: 'sentences',
      after: 'p1',
      ai: 'Tell me about a challenge you faced at work.',
      hint: 'Start your story: last year you were leading a project with a tight deadline.',
      accept: [
        'Last year, I was leading a project with a tight deadline.',
        'Last year, I was working on a project with a tight deadline.',
        'Last year, I led a project with a very tight deadline.',
      ],
      explanation:
        'Set the scene with a time and the past continuous: "Last year, I was leading...".',
    },
    {
      id: 'd-reply-next',
      type: 'reply_speak',
      stage: 'sentences',
      after: 'p7',
      ai: 'Would you do anything differently next time?',
      hint: 'Say that next time you would ask for help earlier.',
      accept: [
        'I would ask for help earlier.',
        'Next time, I would ask for help earlier.',
        'I would ask for support much earlier.',
      ],
      explanation:
        'Use "would" + the base verb to talk about what you would do in a similar future situation.',
    },
  ],
  dialogue: {
    aiRole: 'Interviewer (Karan)',
    userRole: 'Candidate',
    situation: 'In an interview, you are asked to describe a difficult situation at work.',
    goal: 'Tell a clear story: the situation, the problem, what you did, and what you learned.',
    turns: [
      {
        id: 't1',
        ai: 'Thanks for coming in. Could you tell me about a challenge you faced at work?',
        phraseId: 'p1',
        alternatives: [
          'Last year, I was leading a project with a very tight deadline.',
          'Last year, I was working on a project with a tight deadline.',
        ],
        hint: 'Set the scene: last year you were leading a project with a tight deadline.',
        repeat: 'Sorry, could you describe one challenge you faced at work?',
        free: true,
        knownMistakes: [
          {
            wrong: 'i was lead',
            explanation: 'After "was", use the -ing form: "was leading".',
            type: 'tense',
          },
          {
            wrong: 'i am leading',
            explanation: 'This is a story about the past, so use "was leading".',
            type: 'tense',
          },
        ],
      },
      {
        id: 't2',
        ai: 'Interesting. How was the project going?',
        phraseId: 'p2',
        alternatives: ['At first, everything went well.', 'At first, things were going well.'],
        hint: 'Say that at first everything was going well.',
        repeat: 'How was the project going at the beginning?',
        knownMistakes: [
          {
            wrong: 'everything were',
            explanation: '"Everything" is singular, so use "was".',
            type: 'grammar',
          },
          {
            wrong: 'at the first',
            explanation: 'Say "at first", without "the".',
            type: 'grammar',
          },
        ],
      },
      {
        id: 't3',
        ai: 'And then what happened?',
        phraseId: 'p3',
        alternatives: [
          'However, our main developer suddenly left.',
          'But our main developer suddenly left the team.',
        ],
        hint: 'Use "However" to show the problem: your main developer suddenly left the team.',
        repeat: 'What went wrong?',
        knownMistakes: [
          {
            wrong: 'developer leave',
            explanation: 'This happened in the past, so use "left".',
            type: 'tense',
          },
          {
            wrong: 'suddenly leaved',
            explanation: '"Leave" is irregular. The past form is "left".',
            type: 'tense',
          },
        ],
      },
      {
        id: 't4',
        ai: 'That sounds stressful. Had you faced anything like that before?',
        phraseId: 'p4',
        alternatives: [
          'No, I had never managed a crisis like that.',
          'I had never handled a crisis like that before.',
        ],
        hint: 'Say you had never managed a crisis like that before.',
        repeat: 'Had you ever handled a situation like that earlier?',
        free: true,
        knownMistakes: [
          {
            wrong: 'i never managed',
            explanation: 'Add "had" to show it was before the story: "I had never managed".',
            type: 'tense',
          },
          {
            wrong: 'i have never managed',
            explanation: 'This is a past story, so use "had": "I had never managed".',
            type: 'tense',
          },
        ],
      },
      {
        id: 't5',
        ai: 'What did you do about it?',
        phraseId: 'p5',
        alternatives: [
          'As a result, I split the work and asked the team for support.',
          'I split the work and asked for support.',
        ],
        hint: 'Say what you did: you split the work and asked for support.',
        repeat: 'What steps did you take?',
        knownMistakes: [
          {
            wrong: 'splitted',
            explanation: '"Split" is irregular. The past form is also "split".',
            type: 'tense',
          },
          {
            wrong: 'asked support',
            explanation: 'Say "asked for support".',
            type: 'preposition',
          },
        ],
      },
      {
        id: 't6',
        ai: 'Good thinking. How did it end?',
        phraseId: 'p6',
        alternatives: [
          'In the end, we delivered the project early.',
          'In the end, we finished two days early.',
        ],
        hint: 'Say that in the end you delivered two days early.',
        repeat: 'So, how did the project end?',
        knownMistakes: [
          {
            wrong: 'at the end we delivered',
            explanation:
              '"In the end" means finally. "At the end" needs "of": "at the end of the project".',
            type: 'preposition',
          },
          {
            wrong: 'two day early',
            explanation: 'Add the plural: "two days".',
            type: 'grammar',
          },
        ],
      },
      {
        id: 't7',
        ai: 'A great result. Looking back, what did you learn from it?',
        phraseId: 'p7',
        alternatives: [
          'I learned that asking for help early matters.',
          'I learned to ask for help early.',
        ],
        hint: 'Reflect: say you learned that asking for help early matters.',
        repeat: 'What is your main lesson from that experience?',
        free: true,
        knownMistakes: [
          {
            wrong: 'asking for help early matter',
            explanation: '"Asking" is the subject, so the verb is singular: "matters".',
            type: 'grammar',
          },
          {
            wrong: 'i learn that',
            explanation: 'This happened in the past, so use "learned".',
            type: 'tense',
          },
        ],
      },
    ],
    closingLine:
      'That is a clear and honest story. Thank you, that really helps us understand how you work under pressure.',
  },
};

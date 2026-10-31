import type { LessonDef } from '../authoring.js';

export const neighbourLesson: LessonDef = {
  slug: 'introduce-yourself-to-a-new-neighbour',
  title: 'Introduce yourself to a new neighbour',
  category: 'daily',
  level: 'beginner',
  unit: 'introductions',
  order: 1,
  canDo: 'I can introduce myself to a new neighbour and ask where the nearest shop is.',
  focus: 'to + base verb, "used to", because, polite questions',
  estimatedMinutes: 8,
  phrases: [
    {
      id: 'p1',
      text: 'Hi, I am your new neighbour.',
      chunks: ['Hi,', 'I am', 'your new', 'neighbour.'],
      tip: 'Say "neighbour" as NAY-bur. The "gh" is silent.',
      why: 'The describing word "new" comes before the noun: "your new neighbour".',
      extraWords: ['my', 'now'],
      focus: { sound: 'neighbour' },
    },
    {
      id: 'p2',
      text: 'It is nice to meet you.',
      chunks: ['It is', 'nice', 'to meet', 'you.'],
      tip: 'After "to", use "meet". "Met" is the past form, so "nice to met you" is wrong.',
      why: 'After "to", use the base verb "meet". "Met" is the past form.',
      wrong: ['It is nice to met you.', 'It is nice to meeting you.', 'It is nice meet you.'],
      distractors: [
        'It is nice to see you.',
        'It is nice to meet them.',
        'It was nice to meet you.',
      ],
    },
    {
      id: 'p3',
      text: 'I just moved in last week.',
      chunks: ['I just', 'moved in', 'last week.'],
      tip: '"Just" + past tense means very recently. "Moved in" links together: moov-din.',
      why: '"Just" with a finished action uses the past tense: "just moved".',
      mistakeType: 'tense',
      gap: { word: 'moved', options: ['moved', 'move', 'moving', 'moves'] },
      distractors: [
        'I just moved in last month.',
        'I just moved out last week.',
        'I have moved in last week.',
      ],
    },
    {
      id: 'p4',
      text: 'I used to live in Pune.',
      chunks: ['I used to', 'live in', 'Pune.'],
      tip: '"Used to" talks about the past and is followed by the base verb: "used to live", not "used to lived".',
      why: '"Used to" is followed by the base verb: "used to live".',
      mistakeType: 'tense',
      gap: { word: 'live', options: ['live', 'lived', 'living', 'lives'] },
    },
    {
      id: 'p5',
      text: 'I like it because it is very quiet.',
      chunks: ['I like it', 'because', 'it is', 'very quiet.'],
      tip: '"Because" gives a reason and is followed by a full sentence: "it is very quiet".',
      why: '"Because" gives the reason: you like it, and the reason is that it is quiet.',
      mistakeType: 'word_choice',
      gap: { word: 'because', options: ['because', 'so', 'but', 'or'] },
    },
    {
      id: 'p6',
      text: 'Could you tell me where the nearest shop is?',
      chunks: ['Could you', 'tell me', 'where the', 'nearest shop', 'is?'],
      tip: 'After "where", the verb goes last: "where the shop is", not "where is the shop".',
      why: 'In a polite question the verb goes last after "where": "where the shop is".',
      extraWords: ['does', 'near'],
    },
  ],
  vocab: [
    { id: 'neighbour', en: 'neighbour' },
    { id: 'move-in', en: 'move in' },
    { id: 'quiet', en: 'quiet' },
    { id: 'nearest', en: 'nearest' },
    { id: 'building', en: 'building' },
  ],
  concepts: [
    {
      id: 'c1',
      prompt: 'What does "next door" mean?',
      options: [
        'In the house or flat beside yours',
        'Very far away',
        'On the top floor',
        'Outside the city',
      ],
      correct: 'In the house or flat beside yours',
      explanation:
        '"Next door" means the house or flat right beside yours. "The next-door neighbour" lives there.',
    },
    {
      id: 'c2',
      prompt: 'What does "I just moved in" mean?',
      options: [
        'I came to live here a short time ago',
        'I am leaving this place',
        'I am looking for a flat',
        'I work in this building',
      ],
      correct: 'I came to live here a short time ago',
      explanation:
        '"Move in" means to start living in a new home. "Just" means a very short time ago.',
    },
    {
      id: 'c3',
      prompt: 'Which word means "with little noise"?',
      options: ['quiet', 'quite', 'quick', 'queen'],
      correct: 'quiet',
      explanation:
        '"Quiet" means with little noise. "Quite" looks similar but means fairly or very.',
    },
    {
      id: 'c4',
      prompt: 'Priya says: "The shop is just around the corner." Where is it?',
      options: [
        'Very close, just after the turn',
        'Very far away',
        'Inside the building',
        'It is closed',
      ],
      correct: 'Very close, just after the turn',
      explanation: '"Around the corner" means a short walk, just after the next turn.',
    },
  ],
  dialogue: {
    aiRole: 'Neighbour (Priya)',
    userRole: 'New neighbour',
    situation: 'You meet your neighbour in the corridor during your first week.',
    goal: 'Introduce yourself, share a few details, and ask where the nearest shop is.',
    turns: [
      {
        id: 't1',
        ai: "Hello! I don't think we've met. Are you new in the building?",
        phraseId: 'p1',
        alternatives: ['Hello, I am your new neighbour.'],
        hint: 'Greet her and say you are her new neighbour.',
        repeat: "Sorry, I didn't catch that. Are you new in the building?",
        knownMistakes: [
          {
            wrong: 'now neighbour',
            explanation: '"New" means recently arrived. "Now" means at this moment.',
            type: 'word_choice',
          },
        ],
      },
      {
        id: 't2',
        ai: "Welcome! I'm Priya from apartment 4B.",
        phraseId: 'p2',
        alternatives: ['Nice to meet you.'],
        hint: 'Be polite: say it is nice to meet her.',
        repeat: "I'm Priya, by the way. It's great to have a new neighbour!",
        knownMistakes: [
          {
            wrong: 'to met',
            explanation: 'After "to", use "meet": "nice to meet you". "Met" is the past form.',
            type: 'tense',
          },
          {
            wrong: 'to meeting',
            explanation: 'After "to", use the base verb "meet", not "meeting".',
            type: 'grammar',
          },
        ],
      },
      {
        id: 't3',
        ai: 'Nice to meet you too! When did you move in?',
        phraseId: 'p3',
        alternatives: ['I moved in last week.'],
        hint: 'Say that you moved in last week.',
        repeat: 'Sorry, when did you move in?',
        knownMistakes: [
          {
            wrong: 'just move in',
            explanation: '"Just" with a finished action uses the past: "just moved in".',
            type: 'tense',
          },
        ],
      },
      {
        id: 't4',
        ai: "Last week, that's recent! Where did you live before?",
        phraseId: 'p4',
        alternatives: ['I lived in Pune before.', 'I lived in Pune.'],
        hint: 'Say that you used to live in Pune.',
        repeat: 'Sorry, where did you live before?',
        knownMistakes: [
          {
            wrong: 'used to lived',
            explanation: 'After "used to", use the base verb: "used to live".',
            type: 'tense',
          },
          {
            wrong: 'use to live',
            explanation: 'It is "used to", with a "d".',
            type: 'grammar',
          },
        ],
      },
      {
        id: 't5',
        ai: 'Pune is lovely. How are you finding the building so far?',
        phraseId: 'p5',
        alternatives: ['I like it because it is quiet.'],
        hint: 'Say you like it, and give the reason: it is very quiet.',
        repeat: 'Sorry, how do you find the building so far?',
        knownMistakes: [
          {
            wrong: 'because very quiet',
            explanation: 'After "because", say a full sentence: "because it is very quiet".',
            type: 'grammar',
          },
        ],
      },
      {
        id: 't6',
        ai: 'Glad to hear it. Is there anything I can help you with?',
        phraseId: 'p6',
        alternatives: [
          'Could you tell me where the closest shop is?',
          'Can you tell me where the nearest shop is?',
        ],
        hint: 'Politely ask where the nearest shop is.',
        repeat: 'Sorry, is there anything I can help you with?',
        knownMistakes: [
          {
            wrong: 'where is the nearest shop',
            explanation: 'In a polite question the verb goes last: "where the nearest shop is".',
            type: 'grammar',
          },
        ],
      },
    ],
    closingLine:
      "It's just around the corner, left from the main gate. Knock on my door anytime. Welcome to the building!",
  },
};

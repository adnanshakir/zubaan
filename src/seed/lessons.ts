import type { LessonSeed } from '../models/Lesson.js';

// Hindi hints are draft content and require native-speaker review.
export const lessons: LessonSeed[] = [
  {
    slug: 'introduce-yourself-to-a-new-neighbour',
    title: 'Introduce yourself to a new neighbour',
    category: 'daily',
    level: 'beginner',
    objective: 'Start a friendly conversation with a new neighbour.',
    estimatedMinutes: 5,
    steps: [
      {
        order: 1,
        type: 'learn',
        phrases: [
          {
            text: 'Hi, I am your new neighbour.',
            hints: { hi: 'नमस्ते, मैं आपका नया पड़ोसी हूँ।' },
          },
          {
            text: 'I just moved in last week.',
            hints: { hi: 'मैं पिछले हफ़्ते यहाँ आया हूँ।' },
          },
          {
            text: 'It is nice to meet you.',
            hints: { hi: 'आपसे मिलकर अच्छा लगा।' },
          },
        ],
      },
      {
        order: 2,
        type: 'repeat',
        phraseIndexes: [0, 1, 2],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: {
          aiRole: 'Neighbour',
          userRole: 'New resident',
          situation: 'You meet a neighbour outside your apartment building.',
          goal: 'Introduce yourself and make a friendly first impression.',
          openingLine:
            'Hello! I have not seen you here before. Are you new to the building?',
          maxTurns: 4,
          targetPhrases: [
            'Hi, I am your new neighbour.',
            'I just moved in last week.',
            'It is nice to meet you.',
          ],
        },
      },
    ],
  },
  {
    slug: 'give-your-manager-a-quick-work-update',
    title: 'Give your manager a quick work update',
    category: 'work',
    level: 'elementary',
    objective: 'Share a clear, concise update with your manager.',
    estimatedMinutes: 6,
    steps: [
      {
        order: 1,
        type: 'learn',
        phrases: [
          {
            text: 'I have completed the first draft.',
            hints: { hi: 'मैंने पहला ड्राफ्ट पूरा कर लिया है।' },
          },
          {
            text: 'I am waiting for feedback from the design team.',
            hints: { hi: 'मैं डिज़ाइन टीम के फीडबैक का इंतज़ार कर रहा हूँ।' },
          },
          {
            text: 'I will share the final version by Friday.',
            hints: { hi: 'मैं अंतिम संस्करण शुक्रवार तक साझा कर दूँगा।' },
          },
        ],
      },
      {
        order: 2,
        type: 'repeat',
        phraseIndexes: [0, 1, 2],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: {
          aiRole: 'Manager',
          userRole: 'Team member',
          situation:
            'Your manager asks for a quick update during a team meeting.',
          goal: 'Explain your progress, dependency, and next deadline.',
          openingLine: 'Can you give me a quick update on the project?',
          maxTurns: 4,
          targetPhrases: [
            'I have completed the first draft.',
            'I am waiting for feedback from the design team.',
            'I will share the final version by Friday.',
          ],
        },
      },
    ],
  },
  {
    slug: 'job-interview-tell-me-about-yourself',
    title: 'Job interview: Tell me about yourself',
    category: 'career',
    level: 'elementary',
    objective: 'Give a confident introduction in a job interview.',
    estimatedMinutes: 7,
    steps: [
      {
        order: 1,
        type: 'learn',
        phrases: [
          {
            text: 'I have experience working with cross-functional teams.',
            hints: { hi: 'मुझे अलग-अलग टीमों के साथ काम करने का अनुभव है।' },
          },
          {
            text: 'I enjoy solving practical problems.',
            hints: { hi: 'मुझे व्यावहारिक समस्याओं को हल करना पसंद है।' },
          },
          {
            text: 'I am excited about this opportunity because it matches my skills.',
            hints: {
              hi: 'मैं इस अवसर को लेकर उत्साहित हूँ क्योंकि यह मेरे कौशल से मेल खाता है।',
            },
          },
        ],
      },
      {
        order: 2,
        type: 'repeat',
        phraseIndexes: [0, 1, 2],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: {
          aiRole: 'Interviewer',
          userRole: 'Candidate',
          situation: 'You are beginning a job interview.',
          goal: 'Introduce your relevant experience and motivation.',
          openingLine:
            'Thank you for joining us today. Could you tell me about yourself?',
          maxTurns: 5,
          targetPhrases: [
            'I have experience working with cross-functional teams.',
            'I enjoy solving practical problems.',
            'I am excited about this opportunity because it matches my skills.',
          ],
        },
      },
    ],
  },
];

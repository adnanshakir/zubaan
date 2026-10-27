import type { LessonContent } from './types.js';

export const neighbourLesson: LessonContent = {
  slug: 'introduce-yourself-to-a-new-neighbour',
  title: 'Introduce yourself to a new neighbour',
  category: 'daily',
  level: 'beginner',
  objective: 'Introduce yourself, share a few details, and ask for help politely.',
  estimatedMinutes: 8,
  sentences: [
    {
      id: 's1',
      text: 'Hi, I am your new neighbour.',
      hi: 'नमस्ते, मैं आपका नया पड़ोसी हूँ।',
      tip: 'Say "neighbour" as NAY-bur. The "gh" is silent.',
      chunks: ['Hi,', 'I am', 'your new', 'neighbour.'],
    },
    {
      id: 's2',
      text: 'It is nice to meet you.',
      hi: 'आपसे मिलकर अच्छा लगा।',
      tip: 'After "to", use "meet". "Met" is the past form, so "nice to met you" is wrong.',
      chunks: ['It is', 'nice', 'to meet', 'you.'],
    },
    {
      id: 's3',
      text: 'I just moved in last week.',
      hi: 'मुझे यहाँ आए अभी एक हफ़्ता ही हुआ है।',
      tip: '"Just" + past tense means very recently. "Moved in" links together: moov-din.',
      chunks: ['I just', 'moved in', 'last week.'],
    },
    {
      id: 's4',
      text: 'I used to live in Pune.',
      hi: 'पहले मेरा घर पुणे में था।',
      tip: '"Used to" talks about the past and is followed by the base verb: "used to live", not "used to lived".',
      chunks: ['I used to', 'live in', 'Pune.'],
    },
    {
      id: 's5',
      text: 'I like it because it is very quiet.',
      hi: 'मुझे यह पसंद है क्योंकि यह बहुत शांत है।',
      tip: '"Because" gives a reason and is followed by a full sentence: "it is very quiet".',
      chunks: ['I like it', 'because', 'it is', 'very quiet.'],
    },
    {
      id: 's6',
      text: 'Could you tell me where the nearest shop is?',
      hi: 'क्या आप मुझे बता सकती हैं कि सबसे नज़दीकी दुकान कहाँ है?',
      tip: 'After "where", the verb goes last: "where the shop is", not "where is the shop".',
      chunks: ['Could you', 'tell me', 'where the', 'nearest shop', 'is?'],
    },
  ],
  stages: [
    {
      id: 'words',
      title: 'Learn the words',
      intro: 'Meet the words you will need to talk to a neighbour.',
      exercises: [
        {
          id: 'w1',
          type: 'match_pairs',
          prompt: 'Match each word with its meaning.',
          pairs: [
            { en: 'neighbour', hi: 'पड़ोसी' },
            { en: 'move in', hi: 'नए घर में रहने आना' },
            { en: 'quiet', hi: 'शांत' },
            { en: 'nearest', hi: 'सबसे नज़दीकी' },
            { en: 'building', hi: 'इमारत' },
          ],
        },
        {
          id: 'w2',
          type: 'mcq',
          prompt: 'What does "next door" mean?',
          promptHi: '"next door" का मतलब क्या है?',
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
          id: 'w3',
          type: 'mcq',
          prompt: 'What does "I just moved in" mean?',
          promptHi: '"I just moved in" का क्या मतलब है?',
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
          id: 'w4',
          type: 'listen_pick',
          prompt: 'Listen and choose what you hear.',
          text: 'It is nice to meet you.',
          options: [
            'It is nice to meet you.',
            'It is nice to see you.',
            'It is nice to meet them.',
            'It was nice to meet you.',
          ],
          correct: 'It is nice to meet you.',
          explanation: 'You say "It is nice to meet you" when you meet someone for the first time.',
        },
        {
          id: 'w5',
          type: 'mcq',
          prompt: 'Which word means "शांत"?',
          options: ['quiet', 'quite', 'quick', 'queen'],
          correct: 'quiet',
          explanation:
            '"Quiet" means with little noise. "Quite" looks similar but means fairly or very (काफ़ी).',
        },
        {
          id: 'w6',
          type: 'mcq',
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
    },
    {
      id: 'sentences',
      title: 'Build the sentences',
      intro: 'Practise the grammar, then say each sentence out loud.',
      exercises: [
        {
          id: 'g1',
          type: 'order_words',
          mistakeType: 'grammar',
          promptHi: 'नमस्ते, मैं आपका नया पड़ोसी हूँ।',
          answer: 'Hi, I am your new neighbour.',
          extraWords: ['my', 'now'],
          explanation: 'The describing word "new" comes before the noun: "your new neighbour".',
        },
        { id: 'say-s1', type: 'speak', sentenceId: 's1' },
        {
          id: 'g2',
          type: 'mcq',
          mistakeType: 'grammar',
          prompt: 'Choose the correct sentence.',
          promptHi: 'सही वाक्य चुनें।',
          options: [
            'It is nice to meet you.',
            'It is nice to met you.',
            'It is nice to meeting you.',
            'It is nice meet you.',
          ],
          correct: 'It is nice to meet you.',
          explanation: 'After "to", use the base verb "meet". "Met" is the past form.',
        },
        { id: 'say-s2', type: 'speak', sentenceId: 's2' },
        {
          id: 'g3',
          type: 'gap',
          mistakeType: 'tense',
          sentence: 'I just ___ in last week.',
          hi: 'मैं पिछले हफ़्ते ही यहाँ रहने आया।',
          options: ['moved', 'move', 'moving', 'moves'],
          correct: 'moved',
          explanation: '"Just" with a finished action uses the past tense: "just moved".',
        },
        { id: 'say-s3', type: 'speak', sentenceId: 's3' },
        {
          id: 'g4',
          type: 'gap',
          mistakeType: 'tense',
          sentence: 'I used to ___ in Pune.',
          hi: 'मैं पहले पुणे में रहता था।',
          options: ['live', 'lived', 'living', 'lives'],
          correct: 'live',
          explanation: '"Used to" is followed by the base verb: "used to live".',
        },
        { id: 'say-s4', type: 'speak', sentenceId: 's4' },
        {
          id: 'g5',
          type: 'gap',
          mistakeType: 'word_choice',
          sentence: 'I like it ___ it is very quiet.',
          hi: 'मुझे यह पसंद है क्योंकि यह बहुत शांत है।',
          options: ['because', 'so', 'but', 'or'],
          correct: 'because',
          explanation:
            '"Because" gives the reason: you like it, and the reason is that it is quiet.',
        },
        { id: 'say-s5', type: 'speak', sentenceId: 's5' },
        {
          id: 'g6',
          type: 'order_words',
          mistakeType: 'grammar',
          promptHi: 'क्या आप मुझे बता सकती हैं कि सबसे नज़दीकी दुकान कहाँ है?',
          answer: 'Could you tell me where the nearest shop is?',
          extraWords: ['does', 'near'],
          explanation:
            'In a polite question the verb goes last after "where": "where the shop is".',
        },
        { id: 'say-s6', type: 'speak', sentenceId: 's6' },
      ],
    },
  ],
  chat: {
    aiRole: 'Neighbour (Priya)',
    userRole: 'New neighbour',
    situation: 'You meet your neighbour in the corridor during your first week.',
    goal: 'Introduce yourself, share a few details, and ask where the nearest shop is.',
    turns: [
      {
        ai: "Hello! I don't think we've met. Are you new in the building?",
        sentenceId: 's1',
        alternatives: ['Hello, I am your new neighbour.'],
        hint: {
          en: 'Greet her and say you are her new neighbour.',
          hi: 'नमस्ते कहें और बताएँ कि आप उनके नए पड़ोसी हैं।',
        },
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
        ai: "Welcome! I'm Priya from apartment 4B.",
        sentenceId: 's2',
        alternatives: ['Nice to meet you.'],
        hint: {
          en: 'Be polite: say it is nice to meet her.',
          hi: 'विनम्रता से कहें कि आपसे मिलकर अच्छा लगा।',
        },
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
        ai: 'Nice to meet you too! When did you move in?',
        sentenceId: 's3',
        alternatives: ['I moved in last week.'],
        hint: {
          en: 'Say that you moved in last week.',
          hi: 'बताएँ कि आप पिछले हफ़्ते यहाँ आए हैं।',
        },
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
        ai: "Last week, that's recent! Where did you live before?",
        sentenceId: 's4',
        alternatives: ['I lived in Pune before.', 'I lived in Pune.'],
        hint: {
          en: 'Say that you used to live in Pune.',
          hi: 'बताएँ कि पहले आप पुणे में रहते थे।',
        },
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
        ai: 'Pune is lovely. How are you finding the building so far?',
        sentenceId: 's5',
        alternatives: ['I like it because it is quiet.'],
        hint: {
          en: 'Say you like it, and give the reason: it is very quiet.',
          hi: 'बताएँ कि आपको यह पसंद है, और कारण दें: यह बहुत शांत है।',
        },
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
        ai: 'Glad to hear it. Is there anything I can help you with?',
        sentenceId: 's6',
        alternatives: [
          'Could you tell me where the closest shop is?',
          'Can you tell me where the nearest shop is?',
        ],
        hint: {
          en: 'Politely ask where the nearest shop is.',
          hi: 'विनम्रता से पूछें कि सबसे नज़दीकी दुकान कहाँ है।',
        },
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

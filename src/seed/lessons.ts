import type { LessonSeed, RoleplayStep } from '../models/Lesson.js';
import { MAX_ATTEMPTS } from '../utils/scripted-lesson.js';

type ScriptedRoleplay = Omit<RoleplayStep, 'openingLine' | 'maxTurns' | 'targetPhrases'> & {
  turns: NonNullable<RoleplayStep['turns']>;
  closingLine: string;
};

const withScript = (roleplay: ScriptedRoleplay): RoleplayStep => ({
  ...roleplay,
  openingLine: roleplay.turns[0]?.ai ?? '',
  targetPhrases: roleplay.turns.map((turn) => turn.expect),
  maxTurns: roleplay.turns.length * MAX_ATTEMPTS,
});

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
            chunks: ['Hi,', 'I am', 'your new', 'neighbour.'],
            tip: 'Say "neighbour" as NAY-bur. The "gh" is silent.',
          },
          {
            text: 'It is nice to meet you.',
            hints: { hi: 'आपसे मिलकर अच्छा लगा।' },
            chunks: ['It is', 'nice', 'to meet', 'you.'],
            tip: 'After "to", use "meet", not "met". Say "meet you" smoothly together.',
          },
          {
            text: 'I just moved in last week.',
            hints: { hi: 'मुझे यहाँ आए अभी एक हफ़्ता ही हुआ है।' },
            chunks: ['I just', 'moved in', 'last week.'],
            tip: '"Moved in" links together, like "moov-din".',
          },
          {
            text: 'I used to live in Pune.',
            hints: { hi: 'पहले मेरा घर पुणे में था।' },
            chunks: ['I used to', 'live in', 'Pune.'],
            tip: '"Used to" sounds like "yoost-too" and talks about the past.',
          },
          {
            text: 'Could you tell me where the nearest shop is?',
            hints: { hi: 'क्या आप मुझे बता सकती हैं कि सबसे नज़दीकी दुकान कहाँ है?' },
            chunks: ['Could you', 'tell me', 'where the', 'nearest shop', 'is?'],
            tip: 'After "where", the verb goes last: "where the shop is".',
          },
        ],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: withScript({
          aiRole: 'Neighbour',
          userRole: 'New resident',
          situation: 'You meet a neighbour outside your apartment building.',
          goal: 'Introduce yourself and make a friendly first impression.',
          turns: [
            {
              ai: "Hello! I don't think we've met. Are you new in the building?",
              expect: 'Hi, I am your new neighbour.',
              hint: {
                en: 'Greet her and say you are her new neighbour.',
                hi: 'नमस्ते कहें और बताएँ कि आप उनके नए पड़ोसी हैं।',
              },
            },
            {
              ai: "Welcome! I'm Priya from apartment 4B.",
              expect: 'It is nice to meet you.',
              hint: {
                en: 'Be polite: say it is nice to meet her.',
                hi: 'विनम्रता से कहें कि आपसे मिलकर अच्छा लगा।',
              },
            },
            {
              ai: 'Nice to meet you too! When did you move in?',
              expect: 'I just moved in last week.',
              hint: {
                en: 'Say that you moved in last week.',
                hi: 'बताएँ कि आप पिछले हफ़्ते यहाँ आए हैं।',
              },
            },
            {
              ai: "Last week, that's recent! Where did you live before?",
              expect: 'I used to live in Pune.',
              hint: {
                en: 'Say that you used to live in Pune.',
                hi: 'बताएँ कि पहले आप पुणे में रहते थे।',
              },
            },
            {
              ai: 'Pune is lovely. Is there anything I can help you with?',
              expect: 'Could you tell me where the nearest shop is?',
              hint: {
                en: 'Politely ask where the nearest shop is.',
                hi: 'विनम्रता से पूछें कि सबसे नज़दीकी दुकान कहाँ है।',
              },
            },
          ],
          closingLine:
            "It's just around the corner, left from the main gate. Knock on my door anytime. Welcome to the building!",
        }),
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
            chunks: ['I have', 'completed', 'the first draft.'],
            tip: 'Use "have completed" for work that is done now, and do not drop "the".',
          },
          {
            text: 'I am waiting for feedback from the design team.',
            hints: { hi: 'मैं डिज़ाइन टीम के फीडबैक का इंतज़ार कर रहा हूँ।' },
            chunks: ['I am waiting', 'for feedback', 'from the', 'design team.'],
            tip: '"Am" needs the -ing form: "waiting", not "wait".',
          },
          {
            text: 'I will share the final version by Friday.',
            hints: { hi: 'मैं अंतिम संस्करण शुक्रवार तक साझा कर दूँगा।' },
            chunks: ['I will share', 'the final version', 'by Friday.'],
            tip: '"By Friday" means no later than Friday. "On Friday" means exactly that day.',
          },
          {
            text: 'There is one small delay with the images.',
            hints: { hi: 'इमेजेज़ में थोड़ी देरी हो गई है।' },
            chunks: ['There is', 'one small delay', 'with the images.'],
            tip: 'Say "delay" as di-LAY, with the stress on the second part.',
          },
          {
            text: 'Could we review it together on Monday?',
            hints: { hi: 'क्या हम सोमवार को इसे साथ मिलकर देख सकते हैं?' },
            chunks: ['Could we', 'review it', 'together', 'on Monday?'],
            tip: 'Use "on" with a day: "on Monday". Use "by" only for deadlines.',
          },
        ],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: withScript({
          aiRole: 'Manager',
          userRole: 'Team member',
          situation: 'Your manager asks for a quick update during a team meeting.',
          goal: 'Explain your progress, dependency, and next deadline.',
          turns: [
            {
              ai: 'Hi! Can you give me a quick update on the project?',
              expect: 'I have completed the first draft.',
              hint: {
                en: 'Say that the first draft is done.',
                hi: 'बताएँ कि पहला ड्राफ़्ट पूरा हो गया है।',
              },
            },
            {
              ai: 'Great. Is anything holding you up right now?',
              expect: 'I am waiting for feedback from the design team.',
              hint: {
                en: "Say you are waiting for the design team's feedback.",
                hi: 'बताएँ कि आप डिज़ाइन टीम के फ़ीडबैक का इंतज़ार कर रहे हैं।',
              },
            },
            {
              ai: 'Understood. When can you share the final version?',
              expect: 'I will share the final version by Friday.',
              hint: {
                en: 'Promise the final version by Friday.',
                hi: 'शुक्रवार तक फ़ाइनल वर्ज़न देने का वादा करें।',
              },
            },
            {
              ai: 'Friday works. Are there any problems I should know about?',
              expect: 'There is one small delay with the images.',
              hint: {
                en: 'Mention one small delay with the images.',
                hi: 'बताएँ कि इमेजेज़ में थोड़ी देरी हुई है।',
              },
            },
            {
              ai: 'Thanks for telling me early. What would help you most?',
              expect: 'Could we review it together on Monday?',
              hint: {
                en: 'Ask to review it together on Monday.',
                hi: 'सोमवार को साथ मिलकर रिव्यू करने के लिए कहें।',
              },
            },
          ],
          closingLine: "Monday works for me. I'll send an invite. Thanks for the clear update!",
        }),
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
            chunks: ['I have', 'experience', 'working with', 'cross-functional teams.'],
            tip: 'Stress "ex-PEER-ee-ence". "Cross-functional" is said as two words.',
          },
          {
            text: 'I enjoy solving practical problems.',
            hints: { hi: 'मुझे व्यावहारिक समस्याओं को हल करना पसंद है।' },
            chunks: ['I enjoy', 'solving', 'practical problems.'],
            tip: 'Do not drop the last "s" in "problems".',
          },
          {
            text: 'I am excited about this opportunity because it matches my skills.',
            hints: {
              hi: 'मैं इस अवसर को लेकर उत्साहित हूँ क्योंकि यह मेरे कौशल से मेल खाता है।',
            },
            chunks: ['I am excited', 'about this opportunity', 'because it matches', 'my skills.'],
            tip: 'Say "matches" and "skills" with their endings: "it matches", "my skills".',
          },
          {
            text: 'In my last job, I improved our app speed.',
            hints: { hi: 'अपनी पिछली नौकरी में मैंने हमारे ऐप की स्पीड बेहतर की।' },
            chunks: ['In my last job,', 'I improved', 'our app speed.'],
            tip: '"Improved" ends with a "d" sound: im-PROOVD.',
          },
          {
            text: 'Could you tell me more about the team?',
            hints: { hi: 'क्या आप मुझे टीम के बारे में और बता सकते हैं?' },
            chunks: ['Could you', 'tell me more', 'about the team?'],
            tip: 'This is a polite way to ask a question at the end of an interview.',
          },
        ],
      },
      {
        order: 3,
        type: 'roleplay',
        roleplay: withScript({
          aiRole: 'Interviewer',
          userRole: 'Candidate',
          situation: 'You are beginning a job interview.',
          goal: 'Introduce your relevant experience and motivation.',
          turns: [
            {
              ai: 'Thank you for joining us today. Could you tell me about yourself?',
              expect: 'I have experience working with cross-functional teams.',
              hint: {
                en: 'Say that you have experience working with different teams.',
                hi: 'बताएँ कि आपको अलग-अलग टीमों के साथ काम करने का अनुभव है।',
              },
            },
            {
              ai: 'Thanks. What do you enjoy most about your work?',
              expect: 'I enjoy solving practical problems.',
              hint: {
                en: 'Say that you enjoy solving practical problems.',
                hi: 'बताएँ कि आपको व्यावहारिक समस्याएँ हल करना पसंद है।',
              },
            },
            {
              ai: 'Nice. Can you share one achievement from your last job?',
              expect: 'In my last job, I improved our app speed.',
              hint: {
                en: 'Say that in your last job you improved your app speed.',
                hi: 'बताएँ कि पिछली नौकरी में आपने ऐप की स्पीड बेहतर की।',
              },
            },
            {
              ai: 'Impressive. Why are you interested in this role?',
              expect: 'I am excited about this opportunity because it matches my skills.',
              hint: {
                en: 'Say you are excited because the role matches your skills.',
                hi: 'बताएँ कि आप उत्साहित हैं क्योंकि यह भूमिका आपके कौशल से मेल खाती है।',
              },
            },
            {
              ai: 'Good to hear. Do you have any questions for us?',
              expect: 'Could you tell me more about the team?',
              hint: {
                en: 'Politely ask for more about the team.',
                hi: 'विनम्रता से टीम के बारे में और जानने के लिए कहें।',
              },
            },
          ],
          closingLine:
            "Of course. The team is friendly and works closely together. Thank you for your time today, we'll be in touch soon.",
        }),
      },
    ],
  },
];

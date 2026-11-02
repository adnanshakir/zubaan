import type { LessonTranslation } from '../authoring.js';

export const appointmentHi: LessonTranslation = {
  lang: 'hi',
  canDo:
    'मैं क्लिनिक में फ़ोन करके समय माँग सकता/सकती हूँ, अपना नाम बता सकता/सकती हूँ और पूछ सकता/सकती हूँ कि क्या साथ लाना है।',
  phrases: {
    p1: {
      meaning: 'नमस्ते, मुझे एक अपॉइंटमेंट बुक करना है।',
      tip: '"would like to" के बाद क्रिया सादे रूप में आती है: "to book"। "an appointment" को एक साथ बोलें।',
    },
    p2: { meaning: 'क्या शुक्रवार को कोई समय उपलब्ध है?' },
    p3: {
      meaning: 'सुबह दस बजे का समय मेरे लिए ठीक रहेगा।',
      tip: '"in the morning", "in the afternoon", "in the evening" बोलते हैं, लेकिन "at night"।',
    },
    p4: { meaning: 'मेरा नाम अनिल शर्मा है।' },
    p5: {
      meaning: 'क्या मुझे अपने साथ कुछ लाना होगा?',
      tip: '"need to" के बाद क्रिया सादे रूप में आती है: "need to bring"।',
    },
    p6: { meaning: 'धन्यवाद, शुक्रवार को मिलते हैं।' },
  },
  vocab: {
    appointment: 'अपॉइंटमेंट (मिलने का तय समय)',
    available: 'उपलब्ध',
    reschedule: 'समय बदलना',
    confirm: 'पक्का करना',
    receptionist: 'रिसेप्शनिस्ट',
  },
  concepts: {
    c1: {
      prompt: 'रिसेप्शनिस्ट कहती है: "I can fit you in at four." इसका क्या मतलब है?',
      explanation: '"Fit you in" का मतलब है व्यस्त शेड्यूल में आपके लिए समय निकालना।',
    },
    c2: { prompt: 'आपको अपना अपॉइंटमेंट बदलना है। कौन सा वाक्य सबसे अच्छा है?' },
    c3: { prompt: 'फ़ोन पर "Please hold" का क्या मतलब है?' },
    c4: {
      prompt: 'दिन के किस समय के साथ "at" लगता है?',
      explanation:
        '"in the morning", "in the afternoon", "in the evening" बोलते हैं, लेकिन "at night"।',
    },
  },
  drills: {
    'd-best-reply': {
      promptHi: 'रिसेप्शनिस्ट पूछती है: "Which day suits you?" सबसे अच्छा जवाब कौन सा है?',
    },
    'd-fill-available': { hi: 'क्या शुक्रवार को कोई समय उपलब्ध है?' },
    'd-reply-name': { hint: 'पूरे वाक्य में अपना नाम दोबारा बताएँ।' },
  },
  turns: {
    t1: { hint: 'बताएँ कि आप एक अपॉइंटमेंट बुक करना चाहते हैं।' },
    t2: { hint: 'पूछें कि क्या शुक्रवार को कोई समय उपलब्ध है।' },
    t3: { hint: 'सुबह दस बजे का समय चुनें।' },
    t4: { hint: 'अपना नाम बताएँ।' },
    t5: { hint: 'पूछें कि क्या आपको कुछ साथ लाना है।' },
    t6: { hint: 'उन्हें धन्यवाद कहें और बताएँ कि आप शुक्रवार को मिलेंगे।' },
  },
  ui: { spotPrompt: 'सही वाक्य चुनें।' },
};

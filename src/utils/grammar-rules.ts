export type GrammarKind = 'grammar' | 'tense' | 'preposition' | 'word_choice';

export interface GrammarFix {
  explanation: string;
  type: GrammarKind;
}

export interface GrammarResult {
  corrected: string; // the learner's text with every fix applied
  fixes: GrammarFix[]; // at most 3, in the order they were found
}

interface Rule {
  pattern: RegExp;
  fix: (m: RegExpExecArray) => string; // replaces m[0]
  explain: (m: RegExpExecArray) => string;
  type: GrammarKind;
}

const g = (m: RegExpExecArray, index: number): string => m[index] ?? '';
const re = (source: string, flags = 'i'): RegExp => new RegExp(source, flags);

// "does he have" is correct, so a verb right after an auxiliary is never flagged.
const NOT_AFTER_AUX =
  '(?<!\\b(?:does|did|do|will|would|can|could|should|shall|may|might|must)\\s+)';
// "a two year contract" is fine, so a number right after "a" or "an" is skipped.
const NOT_AFTER_A = '(?<!\\b(?:a|an)\\s+)';
// The phrase must clearly end: "two years of experience", "two friends."
const ENDS =
  '(?=\\s*(?:[.,!?;:]|$)|\\s+(?:old|of|in|at|on|for|from|with|and|or|but|who|that|are|were|have|before|after|here|there|too|also)\\b)';
const NUMBERS =
  '(?:[2-9]|[1-9]\\d{1,2}|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many)';

const THIRD_PERSON_VERBS = [
  'go',
  'like',
  'want',
  'need',
  'work',
  'live',
  'play',
  'make',
  'take',
  'come',
  'speak',
  'know',
  'think',
  'say',
  'get',
  'give',
  'love',
  'eat',
  'drink',
  'watch',
  'study',
  'help',
  'use',
  'teach',
  'write',
  'call',
  'try',
  'talk',
  'stay',
  'start',
  'have',
];

function thirdPerson(verb: string): string {
  const irregular: Readonly<Record<string, string>> = { go: 'goes', have: 'has' };
  const known = irregular[verb];
  if (known) return known;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  if (/(ch|sh|s|x|z)$/.test(verb)) return `${verb}es`;
  return `${verb}s`;
}

const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  person: 'people',
  man: 'men',
  woman: 'women',
  child: 'children',
};

function plural(noun: string): string {
  const known = IRREGULAR_PLURALS[noun];
  if (known) return known;
  return /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`;
}

const PAST_TO_BASE: Readonly<Record<string, string>> = {
  went: 'go',
  came: 'come',
  took: 'take',
  made: 'make',
  ate: 'eat',
  bought: 'buy',
  had: 'have',
  gave: 'give',
  told: 'tell',
  said: 'say',
  knew: 'know',
  thought: 'think',
  wrote: 'write',
  began: 'begin',
  spoke: 'speak',
  met: 'meet',
  ran: 'run',
  got: 'get',
};

const WRONG_PAST: Readonly<Record<string, string>> = {
  goed: 'went',
  buyed: 'bought',
  haved: 'had',
  taked: 'took',
  maked: 'made',
  comed: 'came',
  eated: 'ate',
  runned: 'ran',
  writed: 'wrote',
  speaked: 'spoke',
  thinked: 'thought',
  telled: 'told',
  knowed: 'knew',
  gived: 'gave',
  getted: 'got',
  bringed: 'brought',
  catched: 'caught',
  teached: 'taught',
  payed: 'paid',
  selled: 'sold',
  builded: 'built',
  finded: 'found',
  feeled: 'felt',
  meeted: 'met',
  sleeped: 'slept',
  leaved: 'left',
};

const STATIVE: Readonly<Record<string, string>> = {
  knowing: 'know',
  understanding: 'understand',
  wanting: 'want',
  needing: 'need',
  believing: 'believe',
};

const keepCase = (source: string, text: string): string =>
  /^[A-Z]/.test(source) ? text.charAt(0).toUpperCase() + text.slice(1) : text;

const RULES: readonly Rule[] = [
  // he/she + base verb: "she go" -> "she goes"
  {
    pattern: re(
      `${NOT_AFTER_AUX}\\b(he|she)\\s+(${THIRD_PERSON_VERBS.join('|')})\\b(?!\\s+not\\b)`,
    ),
    fix: (m) => `${g(m, 1)} ${thirdPerson(g(m, 2).toLowerCase())}`,
    explain: (m) =>
      `After "${g(m, 1).toLowerCase()}", use "${thirdPerson(g(m, 2).toLowerCase())}", not "${g(m, 2).toLowerCase()}".`,
    type: 'grammar',
  },
  // I/you/we/they + has/does/is: "I has" -> "I have"
  {
    pattern: re('\\b(I|you|we|they)\\s+(has|does|is)\\b'),
    fix: (m) => {
      const subject = g(m, 1);
      const verb = g(m, 2).toLowerCase();
      if (verb === 'has') return `${subject} have`;
      if (verb === 'does') return `${subject} do`;
      return subject.toLowerCase() === 'i' ? `${subject} am` : `${subject} are`;
    },
    explain: (m) => {
      const subject = g(m, 1);
      const verb = g(m, 2).toLowerCase();
      const right =
        verb === 'has'
          ? 'have'
          : verb === 'does'
            ? 'do'
            : subject.toLowerCase() === 'i'
              ? 'am'
              : 'are';
      return `After "${subject}", use "${right}", not "${verb}".`;
    },
    type: 'grammar',
  },
  // he/she/it + are/am/don't: "she don't" -> "she doesn't"
  {
    pattern: re("\\b(he|she|it)\\s+(are|am|don't|do\\s+not)\\b"),
    fix: (m) => {
      const verb = g(m, 2).toLowerCase().replace(/\s+/g, ' ');
      const right = verb === "don't" ? "doesn't" : verb === 'do not' ? 'does not' : 'is';
      return `${g(m, 1)} ${right}`;
    },
    explain: (m) => {
      const verb = g(m, 2).toLowerCase().replace(/\s+/g, ' ');
      const right = verb === "don't" ? "doesn't" : verb === 'do not' ? 'does not' : 'is';
      return `After "${g(m, 1).toLowerCase()}", use "${right}", not "${verb}".`;
    },
    type: 'grammar',
  },
  // "doesn't likes" -> "doesn't like"
  {
    pattern: re(
      "\\b(doesn't|does\\s+not)\\s+(goes|likes|wants|needs|works|lives|plays|makes|takes|comes|speaks|knows|thinks|says|gets|gives|loves|has)\\b",
    ),
    fix: (m) => {
      const verb = g(m, 2).toLowerCase();
      const base = verb === 'goes' ? 'go' : verb === 'has' ? 'have' : verb.slice(0, -1);
      return `${g(m, 1)} ${base}`;
    },
    explain: (m) => `After "${g(m, 1).toLowerCase()}", use the base verb, without "-s".`,
    type: 'grammar',
  },
  // "did you went" / "to met" / "can went" -> base verb
  {
    pattern: re(
      `\\b(?:(?:did|didn't)\\s+(?:(?:you|he|she|they|we|i|it)\\s+)?|(?:can|could|will|would|should|must|may|might|to|don't|doesn't|won't)\\s+)(${Object.keys(PAST_TO_BASE).join('|')})\\b`,
    ),
    fix: (m) => {
      const past = g(m, 1);
      const base = PAST_TO_BASE[past.toLowerCase()] ?? past;
      return g(m, 0).slice(0, g(m, 0).length - past.length) + base;
    },
    explain: (m) => {
      const past = g(m, 1).toLowerCase();
      const base = PAST_TO_BASE[past] ?? past;
      const aux = (g(m, 0).split(/\s+/)[0] ?? '').toLowerCase();
      return `After "${aux}", use the base verb "${base}", not "${past}".`;
    },
    type: 'tense',
  },
  // "goed" -> "went"
  {
    pattern: re(`\\b(${Object.keys(WRONG_PAST).join('|')})\\b`),
    fix: (m) => keepCase(g(m, 1), WRONG_PAST[g(m, 1).toLowerCase()] ?? g(m, 1)),
    explain: (m) =>
      `This verb is irregular: say "${WRONG_PAST[g(m, 1).toLowerCase()] ?? ''}", not "${g(m, 1).toLowerCase()}".`,
    type: 'tense',
  },
  // "two year of" -> "two years of"
  {
    pattern: re(`${NOT_AFTER_A}\\b(${NUMBERS})\\s+(year|month|week|day|hour|minute)${ENDS}`),
    fix: (m) => `${g(m, 0)}s`,
    explain: (m) =>
      `After "${g(m, 1).toLowerCase()}", use the plural: "${g(m, 2).toLowerCase()}s".`,
    type: 'grammar',
  },
  // "two friend" -> "two friends", "many person" -> "many people"
  {
    pattern: re(
      `${NOT_AFTER_A}\\b(${NUMBERS})\\s+(person|man|woman|child|thing|friend|colleague|student|member|project|task|problem|skill|language|country|city)${ENDS}`,
    ),
    fix: (m) => `${g(m, 1)} ${plural(g(m, 2).toLowerCase())}`,
    explain: (m) =>
      `After "${g(m, 1).toLowerCase()}", use the plural: "${plural(g(m, 2).toLowerCase())}".`,
    type: 'grammar',
  },
  // "informations" -> "information"
  {
    pattern: re('\\b(informations|advices|furnitures|equipments|feedbacks|homeworks|luggages)\\b'),
    fix: (m) => keepCase(g(m, 1), g(m, 1).slice(0, -1)),
    explain: (m) => `"${g(m, 1).slice(0, -1).toLowerCase()}" has no plural form. Do not add "s".`,
    type: 'grammar',
  },
  // "a feedback" -> "some feedback"
  {
    pattern: re(
      '\\b(?:a|an)\\s+(information|advice|feedback|furniture|equipment|homework|luggage)\\b',
    ),
    fix: (m) => keepCase(g(m, 0), `some ${g(m, 1)}`),
    explain: (m) =>
      `"${g(m, 1).toLowerCase()}" cannot be counted. Say "some ${g(m, 1).toLowerCase()}" or "a piece of ${g(m, 1).toLowerCase()}".`,
    type: 'grammar',
  },
  // "more better" -> "better"
  {
    pattern: re(
      '\\bmore\\s+(better|easier|faster|cheaper|bigger|smaller|taller|happier|harder|stronger|worse|older|younger|simpler|clearer)\\b',
    ),
    fix: (m) => g(m, 1),
    explain: (m) => `"${g(m, 1).toLowerCase()}" already means "more", so do not add "more".`,
    type: 'grammar',
  },
  // prepositions
  {
    pattern: re('\\bdiscuss(es|ed|ing)?\\s+about\\b'),
    fix: (m) => `discuss${g(m, 1)}`,
    explain: () => '"Discuss" does not need "about".',
    type: 'preposition',
  },
  {
    pattern: re('\\bmarried\\s+with\\b'),
    fix: () => 'married to',
    explain: () => 'Say "married to", not "married with".',
    type: 'preposition',
  },
  {
    pattern: re('\\b(depend|depends|depending)\\s+(?:of|from)\\b'),
    fix: (m) => `${g(m, 1)} on`,
    explain: () => 'Say "depend on".',
    type: 'preposition',
  },
  {
    pattern: re('\\bexplain\\s+me\\b'),
    fix: () => 'explain to me',
    explain: () => 'Say "explain to me". "Explain" needs "to" before the person.',
    type: 'preposition',
  },
  {
    pattern: re(
      '\\b(good|bad|better|best)\\s+in\\s+(?=english|maths?|speaking|writing|cooking|sports?|singing|drawing|coding|communication)',
    ),
    fix: (m) => `${g(m, 1)} at `,
    explain: (m) => `Say "${g(m, 1).toLowerCase()} at" a subject, not "in".`,
    type: 'preposition',
  },
  // "I am agree" -> "I agree"
  {
    pattern: re("\\bI(?:\\s+am|'m)\\s+(not\\s+)?agree\\b"),
    fix: (m) => (g(m, 1) ? 'I do not agree' : 'I agree'),
    explain: () => '"Agree" is a verb, so say "I agree", without "am".',
    type: 'grammar',
  },
  // "I am knowing" -> "I know"
  {
    pattern: re(`\\bI(?:\\s+am|'m)\\s+(${Object.keys(STATIVE).join('|')})\\b`),
    fix: (m) => `I ${STATIVE[g(m, 1).toLowerCase()] ?? g(m, 1)}`,
    explain: (m) =>
      `Say "${STATIVE[g(m, 1).toLowerCase()] ?? ''}", not "${g(m, 1).toLowerCase()}". This verb is not used with "-ing".`,
    type: 'grammar',
  },
  // "I have 25 years old" -> "I am 25 years old"
  {
    pattern: re('\\bI\\s+have\\s+(\\d{1,3})\\s+years?\\s+old\\b'),
    fix: (m) => `I am ${g(m, 1)} years old`,
    explain: () => 'Use "I am" to say your age.',
    type: 'grammar',
  },
  // "Myself Adnan" -> "I am Adnan"
  {
    pattern: re('(^|[.!?]\\s+)[Mm]yself\\s+(?=[A-Z])', ''),
    fix: (m) => `${g(m, 1)}I am `,
    explain: () =>
      'Introduce yourself with "I am ..." or "My name is ...". Do not start with "myself".',
    type: 'word_choice',
  },
  // "a engineer" -> "an engineer"
  {
    pattern: re(
      '\\b([Aa])\\s+(?!(?:one|once|eu|other)[a-z]*\\b)([aeio][a-z]*|umbrella|uncle|ugly|upper|upset|unhappy|unusual|unable)\\b',
      '',
    ),
    fix: (m) => `${g(m, 1)}n ${g(m, 2)}`,
    explain: (m) => `Use "an" before a vowel sound: "an ${g(m, 2)}".`,
    type: 'grammar',
  },
  // "an man" -> "a man" (lowercase words of 4+ letters only, so "an HR" or "an mba" are safe)
  {
    pattern: re(
      '\\b([Aa]n)\\s+(?!(?:hour|honest|honou?r|heir)[a-z]*\\b)([bcdfghjklmnpqrstvwyz][a-z]{3,})\\b',
      '',
    ),
    fix: (m) => `${g(m, 1).charAt(0)} ${g(m, 2)}`,
    explain: (m) => `Use "a" before a consonant sound: "a ${g(m, 2)}".`,
    type: 'grammar',
  },
];

/** Checks a learner's answer against common errors. Returns null when nothing is found. */
export function checkGrammar(input: string): GrammarResult | null {
  let current = input.replace(/[\u2018\u2019]/g, "'").trim();
  const fixes: GrammarFix[] = [];
  for (const rule of RULES) {
    if (fixes.length >= 3) break;
    const match = rule.pattern.exec(current);
    if (!match) continue;
    const replacement = rule.fix(match);
    if (replacement === match[0]) continue;
    fixes.push({ explanation: rule.explain(match), type: rule.type });
    current =
      current.slice(0, match.index) + replacement + current.slice(match.index + match[0].length);
  }
  return fixes.length > 0 ? { corrected: current, fixes } : null;
}

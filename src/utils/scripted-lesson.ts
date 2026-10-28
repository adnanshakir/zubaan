export type CheckType = 'grammar' | 'tense' | 'preposition' | 'word_choice' | 'other';

export interface TurnCheck {
  outcome: 'exact' | 'close' | 'off';
  corrected: string;
  explanation: string;
  mistakeType: CheckType;
}

interface Op {
  kind: 'equal' | 'missing' | 'extra' | 'replace';
  target?: string;
  said?: string;
}

const ALIASES: Readonly<Record<string, string>> = {
  neighbor: 'neighbour',
  neighbors: 'neighbours',
  color: 'colour',
  colors: 'colours',
};

const CONTRACTIONS: Readonly<Record<string, string>> = {
  "i'm": 'i am',
  "i've": 'i have',
  "i'll": 'i will',
  "you're": 'you are',
  "we're": 'we are',
  "they're": 'they are',
  "it's": 'it is',
  "there's": 'there is',
  "don't": 'do not',
  "doesn't": 'does not',
  "couldn't": 'could not',
};

const PREPOSITIONS = new Set([
  'in',
  'on',
  'at',
  'by',
  'for',
  'to',
  'of',
  'with',
  'from',
  'about',
  'into',
  'until',
  'since',
  'during',
  'over',
  'under',
  'between',
]);

const IRREGULAR: ReadonlyArray<readonly [string, string]> = [
  ['go', 'went'],
  ['meet', 'met'],
  ['have', 'had'],
  ['buy', 'bought'],
  ['do', 'did'],
  ['see', 'saw'],
  ['take', 'took'],
  ['make', 'made'],
  ['say', 'said'],
  ['tell', 'told'],
  ['come', 'came'],
  ['get', 'got'],
  ['know', 'knew'],
  ['think', 'thought'],
];

function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ');
  const words: string[] = [];
  for (const raw of cleaned.split(/\s+/)) {
    const word = raw.replace(/^'+|'+$/g, '');
    if (!word) continue;
    const expanded = Object.prototype.hasOwnProperty.call(CONTRACTIONS, word)
      ? CONTRACTIONS[word]
      : Object.prototype.hasOwnProperty.call(ALIASES, word)
        ? ALIASES[word]
        : word;
    words.push(...expanded.split(' '));
  }
  return words;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        current + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

function align(target: readonly string[], said: readonly string[]): Op[] {
  const n = target.length;
  const m = said.length;
  const width = m + 1;
  const cost = new Array<number>((n + 1) * width).fill(0);
  const at = (i: number, j: number): number => cost[i * width + j] ?? 0;
  for (let i = 1; i <= n; i += 1) cost[i * width] = i;
  for (let j = 1; j <= m; j += 1) cost[j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const swap = target[i - 1] === said[j - 1] ? 0 : 1;
      cost[i * width + j] = Math.min(at(i - 1, j - 1) + swap, at(i - 1, j) + 1, at(i, j - 1) + 1);
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const targetWord = target[i - 1];
    const saidWord = said[j - 1];
    if (i > 0 && j > 0 && targetWord !== undefined && saidWord !== undefined) {
      const swap = targetWord === saidWord ? 0 : 1;
      if (at(i, j) === at(i - 1, j - 1) + swap) {
        ops.push(
          swap === 0 ? { kind: 'equal' } : { kind: 'replace', target: targetWord, said: saidWord },
        );
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && targetWord !== undefined && at(i, j) === at(i - 1, j) + 1) {
      ops.push({ kind: 'missing', target: targetWord });
      i -= 1;
      continue;
    }
    if (j > 0 && saidWord !== undefined) {
      ops.push({ kind: 'extra', said: saidWord });
      j -= 1;
      continue;
    }
    break;
  }
  return ops.reverse();
}

function isTensePair(a: string, b: string): boolean {
  if (IRREGULAR.some(([base, past]) => (a === base && b === past) || (a === past && b === base))) {
    return true;
  }
  return a + 'ed' === b || a + 'd' === b || b + 'ed' === a || b + 'd' === a;
}

function isStemPair(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return (
    short.length >= 3 && short !== long && long.startsWith(short) && long.length - short.length <= 3
  );
}

function describe(op: Op): { type: CheckType; text: string } {
  const t = op.target ?? '';
  const s = op.said ?? '';
  if (op.kind === 'missing') {
    return { type: PREPOSITIONS.has(t) ? 'preposition' : 'grammar', text: `Add "${t}".` };
  }
  if (op.kind === 'extra') return { type: 'word_choice', text: `Remove "${s}".` };
  if (PREPOSITIONS.has(t) && PREPOSITIONS.has(s)) {
    return { type: 'preposition', text: `Use "${t}" here, not "${s}".` };
  }
  if (isTensePair(t, s)) return { type: 'tense', text: `Use "${t}" here, not "${s}".` };
  if (isStemPair(t, s)) {
    return {
      type: 'grammar',
      text: t.endsWith('ing')
        ? `Use the -ing form: "${t}".`
        : `Check the ending: "${t}", not "${s}".`,
    };
  }
  if (t.length >= 3 && distance(t, s) <= 1) {
    return { type: 'word_choice', text: `Say "${t}", not "${s}".` };
  }
  return { type: 'word_choice', text: `Use "${t}" instead of "${s}".` };
}

const OFF: TurnCheck = { outcome: 'off', corrected: '', explanation: '', mistakeType: 'other' };

export function checkAgainstTarget(target: string, said: string): TurnCheck {
  const targetWords = tokenize(target);
  const saidWords = tokenize(said);
  if (targetWords.length === 0 || saidWords.length === 0) return OFF;
  const ops = align(targetWords, saidWords);
  const matched = ops.filter((op) => op.kind === 'equal').length;
  const issues = ops.filter((op) => op.kind !== 'equal');
  if (issues.every((op) => op.kind === 'extra')) {
    return { outcome: 'exact', corrected: '', explanation: '', mistakeType: 'other' };
  }
  if (matched / targetWords.length < 0.5) return OFF;
  const notes = issues.slice(0, 2).map(describe);
  return {
    outcome: 'close',
    corrected: target,
    explanation: notes.map((note) => note.text).join(' '),
    mistakeType: notes[0]?.type ?? 'other',
  };
}

export interface ScriptTurn {
  ai: string;
  sentenceId: string;
  alternatives?: readonly string[];
  repeat: string;
  knownMistakes?: readonly {
    wrong: string;
    explanation: string;
    type: Exclude<CheckType, 'other'>;
  }[];
}

export interface ScriptSentence {
  id: string;
  text: string;
}

export interface ScriptState {
  turnIndex: number;
  attempts: number;
}

export type StepOutcome = 'exact' | 'close' | 'off' | 'moved_on';

export interface ScriptStep {
  reply: string;
  state: ScriptState;
  finished: boolean;
  outcome: StepOutcome;
  revealHint: boolean;
  check: TurnCheck;
}

export const MAX_ATTEMPTS = 3;

function containsPhrase(words: readonly string[], phrase: string): boolean {
  const phraseWords = tokenize(phrase);
  if (phraseWords.length === 0 || phraseWords.length > words.length) return false;
  return words.some((_, index) =>
    phraseWords.every((word, phraseIndex) => words[index + phraseIndex] === word),
  );
}

function matchedWordRatio(target: string, said: string): number {
  const targetWords = tokenize(target);
  const saidWords = tokenize(said);
  if (targetWords.length === 0 || saidWords.length === 0) return 0;
  return (
    align(targetWords, saidWords).filter((op) => op.kind === 'equal').length / targetWords.length
  );
}

export function stepScript(
  chat: { turns: readonly ScriptTurn[]; closingLine: string },
  sentences: readonly ScriptSentence[],
  state: ScriptState,
  userText: string,
): ScriptStep {
  const turns = chat.turns;
  const turn = turns[state.turnIndex];
  if (!turn) {
    return {
      reply: chat.closingLine,
      state,
      finished: true,
      outcome: 'off',
      revealHint: false,
      check: OFF,
    };
  }
  const sentence = sentences.find((item) => item.id === turn.sentenceId);
  if (!sentence) {
    throw new Error(`Scripted lesson turn references unknown sentence ${turn.sentenceId}`);
  }
  const candidates = [sentence.text, ...(turn.alternatives ?? [])];
  const checks = candidates.map((candidate) => checkAgainstTarget(candidate, userText));
  const exactIndex = checks.findIndex((candidate) => candidate.outcome === 'exact');
  const bestIndex =
    exactIndex >= 0
      ? exactIndex
      : checks.reduce(
          (best, candidate, index) =>
            matchedWordRatio(candidates[index] ?? '', userText) >
            matchedWordRatio(candidates[best] ?? '', userText)
              ? index
              : best,
          0,
        );
  const selected = checks[bestIndex] ?? OFF;
  const check: TurnCheck =
    selected.outcome === 'off'
      ? selected
      : {
          ...selected,
          corrected: candidates[bestIndex] ?? sentence.text,
        };
  if (check.outcome === 'close') {
    const answerWords = tokenize(userText);
    const known = (turn.knownMistakes ?? []).filter((mistake) =>
      containsPhrase(answerWords, mistake.wrong),
    );
    if (known.length > 0) {
      check.explanation = known
        .slice(0, 2)
        .map((mistake) => mistake.explanation)
        .join(' ');
      check.mistakeType = known[0]?.type ?? check.mistakeType;
    }
  }
  const attempts = state.attempts + 1;
  const otherTurnMatch = turns.some((otherTurn, index) => {
    if (index === state.turnIndex) return false;
    const otherSentence = sentences.find((item) => item.id === otherTurn.sentenceId);
    return otherSentence !== undefined && matchedWordRatio(otherSentence.text, userText) >= 0.8;
  });
  if (check.outcome === 'off' && otherTurnMatch) {
    return {
      reply: `Good sentence, but not yet. ${turn.repeat}`,
      state: { turnIndex: state.turnIndex, attempts },
      finished: false,
      outcome: 'off',
      revealHint: false,
      check,
    };
  }
  const moveOn = check.outcome !== 'off' || attempts >= MAX_ATTEMPTS;
  if (!moveOn) {
    const second = attempts >= 2;
    return {
      reply: second ? `Let's try it together. Say: "${sentence.text}"` : turn.repeat,
      state: { turnIndex: state.turnIndex, attempts },
      finished: false,
      outcome: 'off',
      revealHint: second,
      check,
    };
  }
  const next = turns[state.turnIndex + 1];
  const lead =
    check.outcome === 'off' ? `Let's keep going. You could say: "${sentence.text}". ` : '';
  return {
    reply: `${lead}${next ? next.ai : chat.closingLine}`,
    state: { turnIndex: state.turnIndex + 1, attempts: 0 },
    finished: next === undefined,
    outcome: check.outcome === 'off' ? 'moved_on' : check.outcome,
    revealHint: false,
    check,
  };
}

import { checkGrammar } from '../src/utils/grammar-rules.js';

// [input, expected corrected text, or null when nothing should be flagged]
const cases: ReadonlyArray<readonly [string, string | null]> = [
  [
    'I has two year of experience as a support engineer.',
    'I have two years of experience as a support engineer.',
  ],
  ["She don't like coffee.", "She doesn't like coffee."],
  ['He have a car.', 'He has a car.'],
  ['Does he have a car?', null],
  ['I think she go to school.', 'I think she goes to school.'],
  ['I goed to the market yesterday.', 'I went to the market yesterday.'],
  ['It is nice to met you.', 'It is nice to meet you.'],
  ['Did you went to school?', 'Did you go to school?'],
  ['I am agree with you.', 'I agree with you.'],
  ['This is more better.', 'This is better.'],
  ['I am 25 year old.', 'I am 25 years old.'],
  ['I have 25 years old.', 'I am 25 years old.'],
  ['Myself Adnan.', 'I am Adnan.'],
  ['I am waiting for a feedback.', 'I am waiting for some feedback.'],
  ['We discussed about the plan.', 'We discussed the plan.'],
  ['I have an apple and an orange.', null],
  ['She is a engineer.', 'She is an engineer.'],
  ['I want a umbrella.', 'I want an umbrella.'],
  ['It is a unique idea.', null],
  ['I am very good in English.', 'I am very good at English.'],
  ["She doesn't likes tea.", "She doesn't like tea."],
  ['They is happy.', 'They are happy.'],
  ['I have two years of experience.', null],
  ['I have two friend.', 'I have two friends.'],
  ['He is an HR manager.', null],
  ['I will share the final version by Friday.', null],
  ['I need to see a doctor.', null],
];

let failed = 0;
for (const [input, expected] of cases) {
  const actual = checkGrammar(input)?.corrected ?? null;
  if (actual !== expected) {
    failed += 1;
    console.log(`FAIL: ${input}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}
console.log(
  failed === 0 ? `All ${cases.length} cases passed.` : `${failed} of ${cases.length} failed.`,
);
process.exitCode = failed === 0 ? 0 : 1;

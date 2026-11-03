export type PlacementTier = 1 | 2 | 3 | 4;
export type PlacementKind = 'mcq' | 'listen_pick' | 'read_aloud';

export interface PlacementItemDef {
  id: string;
  tier: PlacementTier;
  kind: PlacementKind;
  prompt?: string; // mcq: the question, with ___ for the gap
  text?: string; // listen_pick: the spoken text (equals correct); read_aloud: the sentence to read
  options?: readonly string[];
  correct?: string;
}

// Order inside a tier matters: the first two items decide most tiers.
export const PLACEMENT_ITEMS: readonly PlacementItemDef[] = [
  // Tier 1: Starter
  {
    id: 'p1-1',
    tier: 1,
    kind: 'mcq',
    prompt: 'She ___ a teacher.',
    options: ['is', 'are', 'am', 'be'],
    correct: 'is',
  },
  { id: 'p1-2', tier: 1, kind: 'read_aloud', text: 'I live with my family.' },
  {
    id: 'p1-3',
    tier: 1,
    kind: 'listen_pick',
    text: 'My name is Ravi.',
    options: ['My name is Ravi.', 'His name is Ravi.', 'My name is Rani.', 'Her name is Ravi.'],
    correct: 'My name is Ravi.',
  },
  // Tier 2: Everyday
  {
    id: 'p2-1',
    tier: 2,
    kind: 'mcq',
    prompt: 'Yesterday I ___ to the market.',
    options: ['went', 'go', 'goed', 'going'],
    correct: 'went',
  },
  {
    id: 'p2-2',
    tier: 2,
    kind: 'read_aloud',
    text: 'Yesterday I went to the market with my friend.',
  },
  {
    id: 'p2-3',
    tier: 2,
    kind: 'listen_pick',
    text: 'I am going to visit my aunt next week.',
    options: [
      'I am going to visit my aunt next week.',
      'I am going to visit my aunt last week.',
      'I am going to visit my uncle next week.',
      'I was going to visit my aunt next week.',
    ],
    correct: 'I am going to visit my aunt next week.',
  },
  // Tier 3: Confident
  {
    id: 'p3-1',
    tier: 3,
    kind: 'mcq',
    prompt: 'If I ___ more time, I would learn another language.',
    options: ['had', 'have', 'will have', 'having'],
    correct: 'had',
  },
  {
    id: 'p3-2',
    tier: 3,
    kind: 'read_aloud',
    text: 'I have been working on this project since January.',
  },
  {
    id: 'p3-3',
    tier: 3,
    kind: 'mcq',
    prompt: 'She suggested ___ the deadline.',
    options: ['moving', 'to move', 'move', 'to moving'],
    correct: 'moving',
  },
  // Tier 4: Fluent
  {
    id: 'p4-1',
    tier: 4,
    kind: 'mcq',
    prompt: 'By the time we arrived, the film ___.',
    options: [
      'had already started',
      'already started',
      'has already started',
      'was already starting',
    ],
    correct: 'had already started',
  },
  {
    id: 'p4-2',
    tier: 4,
    kind: 'read_aloud',
    text: 'Despite the delay, the team managed to deliver the project successfully.',
  },
  {
    id: 'p4-3',
    tier: 4,
    kind: 'mcq',
    prompt: 'I wish I ___ about the problem earlier.',
    options: ['had known', 'knew', 'have known', 'would know'],
    correct: 'had known',
  },
];

export const PLACEMENT_INSTRUCTIONS_EN: Readonly<
  Record<'mcq' | 'listen_pick' | 'read_aloud' | 'free', string>
> = {
  mcq: 'Choose the correct word.',
  listen_pick: 'Listen and choose what you hear.',
  read_aloud: 'Read this sentence out loud.',
  free: 'Tell us about your day in a few sentences.',
};

export const PLACEMENT_FREE_SECONDS = 25;

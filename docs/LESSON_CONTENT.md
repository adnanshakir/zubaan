# Lesson content authoring

Lessons are authored in `src/seed/lessons/`, stored as a language-neutral
`LessonDef` plus one `LessonTranslation` per language, and built when requested.
The seed stores the definition in `Lesson` and translation data in
`LessonTranslation`; learners receive only the selected language.

## Folder layout

Each lesson has a folder containing `<lesson>.ts` for its `LessonDef` and one
`<language>.ts` file for each translation. `src/seed/lessons/index.ts` adds
each pair to `lessonSources`. `assertLessonsValid()` runs before any seed write.

## Authoring fields

`PhraseDef` fields:

- `id`: stable phrase identifier.
- `text`: English sentence.
- `chunks`: words/chunks whose joined text equals `text`.
- `tip`: English pronunciation or usage tip.
- `why`: optional grammar explanation (defaults to `tip`).
- `mistakeType`: optional `grammar`, `tense`, `preposition`, or `word_choice`.
- `gap`: optional `{ word, options }` gap exercise configuration.
- `wrong`: optional incorrect sentence alternatives.
- `distractors`: optional listen-and-pick alternatives.
- `extraWords`: optional wrong word-order tiles.
- `focus`: optional `{ sound?, grammar? }` metadata.

`TurnDef` fields are `id`, `ai`, `phraseId`, optional `alternatives`, English
`hint`, `repeat`, optional `knownMistakes`, and optional `free`. A free turn
accepts any answer with at least three Latin-script words.

`ConceptDef` fields are `id`, `prompt`, `options`, `correct`, and
`explanation`.

`LessonTranslation` contains `lang`, optional `canDo`, `phrases` keyed by
phrase id (`meaning`, optional `tip` and `why`), `vocab` keyed by vocab id,
optional `concepts` keyed by concept id (`prompt` and `explanation`), `turns`
keyed by turn id (`hint`), and `ui.spotPrompt`.

## Generated content

The builder creates `sentences` from phrases, a `words` stage, and a
`sentences` stage. It creates a match-pairs exercise when there are at least
three vocabulary items, one MCQ per concept, up to two listen-pick exercises
from phrases with distractors, one gap/MCQ/order-words exercise when the phrase
has the corresponding configuration (or is at least four words), and one
speak exercise per phrase. Exercise ids are stable: `w-match`, `w-c-<concept>`,
`w-l-<phrase>`, `g-<phrase>`, and `say-<phrase>`.

Chat turns expose `free` only when authored. A free turn with fewer than three
Latin-script words follows the normal off-answer retry behavior. A qualifying
answer that is not an exact target match advances normally: it is exact when
the grammar pass finds no fixes, or close with the grammar correction when it
does.

## Adding content

To add a lesson, create its definition and `hi` translation files, then add
them to `lessonSources`. Keep ids stable because attempts and mistakes refer to
them. To add a language, create a new hi-style translation file, add it to the
lesson's `lessonSources` entry, and add the language to `SUPPORTED_LANGS` in
`src/services/lessonBuilder.ts`.

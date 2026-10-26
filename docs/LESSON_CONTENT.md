# Lesson content authoring

Lesson files live in `src/seed/lessons/` and export a `LessonContent` value.
`validateLesson` runs before seeding and rejects inconsistent content.

## Sentences and chat

`sentences` is the single source of truth for what the learner says. Every
chat turn points to one sentence with `sentenceId`. `alternatives` contains
other accepted answers and those answers count as exact.

Each turn has an always-visible `hint`, a `repeat` line for the first nudge
after an unrelated answer, and optional `knownMistakes`. Known mistakes take
precedence over the automatic word-diff explanation. Their `wrong` value is
normalized and matched as a whole-word phrase. Up to two matching explanations
are shown.

After the second nudge the sentence is revealed behind the client’s tap. After
the third unrelated answer the script moves on. If an off-topic answer matches
another turn’s sentence, the learner receives:
`Good sentence, but not yet. <repeat>`.

## Stages and exercises

Stages are `words` and `sentences`. Every exercise has an `id` and `type`:

- `mcq`: `prompt`, optional `promptHi`, `options`, `correct`, `explanation`
- `gap`: `sentence` (containing `___`), `hi`, `options`, `correct`,
  `explanation`
- `listen_pick`: `prompt`, `text`, `options`, `correct`, `explanation`
- `match_pairs`: `prompt`, and 3–6 `{ en, hi }` pairs
- `order_words`: `promptHi`, `answer`, optional `extraWords`, `explanation`
- `speak`: `sentenceId`

Exercise answers are stored as mixed values in MongoDB, but the
`Exercise` union and `validateLesson` provide authoring-time type checking and
validation. `validateLesson` also checks sentence chunks, IDs, options,
sentence references, and that every sentence is spoken and asked in chat.

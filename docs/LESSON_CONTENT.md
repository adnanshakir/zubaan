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

Every unrelated answer receives the turn’s repeat line. The second nudge also
reveals the sentence behind the client’s tap, and the third unrelated answer
moves on with no extra text. An off-topic answer that matches another turn’s
sentence follows the same nudge behavior.

## Stages and exercises

Stages are `words` and `sentences`. Every exercise has an `id` and `type`:

- `mcq`: `prompt`, optional `promptHi`, `options`, `correct`, `explanation`
- `gap`: `sentence` (containing `___`), `hi`, `options`, `correct`,
  `explanation`
- `listen_pick`: `prompt`, `text`, `options`, `correct`, `explanation`
- `match_pairs`: `prompt`, and 3–6 `{ en, hi }` pairs
- `order_words`: `promptHi`, `answer`, optional `extraWords`, `explanation`
- `speak`: `sentenceId`

The `mcq`, `gap`, and `order_words` exercise types may also set
`mistakeType` to `grammar`, `tense`, `preposition`, or `word_choice`.
Only exercises with this field are registered in the mistake bank when the
learner submits a wrong answer with an answer value. For a gap exercise,
`original` is the sentence with `___` replaced by the chosen answer and
`corrected` replaces it with `correct`. For order words, they are
`answer.join(' ')` and the exercise `answer`; for an MCQ, they are the chosen
option and `correct`. The exercise explanation is stored with the result.

Exercise answers are stored as mixed values in MongoDB, but the
`Exercise` union and `validateLesson` provide authoring-time type checking and
validation. `validateLesson` also checks sentence chunks, IDs, options,
sentence references, and that every sentence is spoken and asked in chat.

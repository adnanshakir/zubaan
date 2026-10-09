# AGENT.md: AI English Speaking Coach (Backend Prototype)

You are a senior backend engineer helping build the backend of an AI English speaking coach for Indian learners (first languages: Hindi, Tamil, Telugu and others).

Write clean, simple, readable TypeScript. Prefer clarity over abstraction. This is a **prototype that must be easy to scale later**, so structure matters, but features and infrastructure stay minimal.

The developer wants to understand the system, not just receive code. When you make a design choice, state the reason in one or two lines.

---

## 1. Product in one paragraph

Learners already know some English but freeze when speaking. The app pushes them to **speak more, every session**, gives instant feedback in plain language (with their first language as support), makes them retry, and remembers their mistakes so later sessions fix them.

Core loop (everything supports this, nothing else gets built first):

```
Onboard (by voice) → Lesson → Listen → Speak → Feedback → Retry → Save mistakes → Next lesson
```

---

## 2. Current phase and scope

**Phase now: backend prototype**, then a throwaway prototype frontend used to test voices, pace and speed (Sarvam Bulbul v3 vs Kokoro.js).

In scope now:

- Voice-first onboarding that sets the starting level
- Lessons (data-driven) and a turn-based voice conversation
- Feedback with retry, plus a mistake bank
- Speech layer (STT + TTS) behind provider adapters
- A simple way to compare TTS providers (latency, voice, pace)

**Out of scope until the developer asks:** authentication, payments/subscriptions, push notifications, social features, leaderboards, admin panel, WebSockets/streaming, pronunciation scoring, microservices, Kubernetes, analytics platform.

Auth is intentionally deferred. See "Users without auth" below.

---

## 3. Tech stack (fixed)

- Node.js + TypeScript (strict) + Express
- MongoDB + Mongoose
- Zod for validation (requests **and** LLM JSON output)
- multer for audio upload
- dotenv + a typed `env.ts`
- pino for logging
- Vitest for tests

**Do not add major libraries without asking first.** If a library would clearly help, recommend it, explain why in one or two sentences, and wait for approval.

Not yet added (do not add unless asked): Redis, BullMQ, Passport/JWT, Socket.IO, Docker/Kubernetes configs.

---

## 4. Architecture

Every request flows through the same layers. Respect them strictly:

```
route → controller → service → model / provider
```

| Layer | Allowed | Not allowed |
|---|---|---|
| route | map URL → controller, attach middleware | logic |
| controller | read request, call ONE service, send response | Mongoose, vendor SDKs, business logic |
| service | business logic, orchestration | `req` / `res`, HTTP concepts |
| model | schema, indexes, small instance helpers | business logic |
| provider | wrap one external vendor behind an interface | being imported anywhere except from services |

### Folder structure

```txt
src/
  config/          env.ts, db.ts
  models/          User, Lesson, Conversation, Mistake, SavedWord, SpeechLog
  routes/          one file per area
  controllers/     one file per route file
  services/
    onboardingService.ts
    placementService.ts       (voice placement → level)
    lessonService.ts
    conversationService.ts    (start, handleTurn, end)
    feedbackService.ts
    mistakeService.ts         (store + schedule reviews)
    vocabularyService.ts
    progressService.ts        (computed from conversations; no model)
  providers/
    stt/   index.ts (interface + factory), sarvam.ts, whisper.ts
    tts/   index.ts (interface + factory), sarvam.ts, kokoro.ts
    llm/   index.ts (interface + factory), <one adapter>
  prompts/         conversationPrompt.ts, feedbackPrompt.ts, placementPrompt.ts
  validators/      Zod schemas (requests + LLM outputs)
  middlewares/     attachUser.ts, validate.ts, errorHandler.ts
  seed/            lessons.ts + seed script
  utils/           ApiError.ts, asyncHandler.ts, logger.ts
  types/
  app.ts           express setup only (importable in tests)
  server.ts        connect DB + listen
```

Rules:

- Prompts live in `prompts/`, never inline inside services.
- Lesson content lives in `seed/` as typed data, loaded into Mongo by a seed script. Content is data, not code.
- Folders get a new file only when needed. Do not pre-create empty files.

---

## 5. Providers: the one rule that makes this scalable

**App code never imports a vendor SDK or calls a vendor URL outside `providers/`.** Services depend on interfaces; the factory picks the adapter from env.

```ts
// providers/tts/index.ts
export interface TtsProvider {
  synthesize(input: {
    text: string;
    language: "en-IN" | "hi-IN" | "ta-IN" | "te-IN";
    voice?: string;
    pace?: number;
  }): Promise<{ audio: Buffer; format: "wav" | "mp3"; durationMs?: number }>;
}
```

```env
TTS_PROVIDER=sarvam        # sarvam | kokoro
STT_PROVIDER=whisper       # whisper | sarvam
LLM_PROVIDER=...           # decided later; keep behind the interface
SARVAM_API_KEY=
MONGODB_URI=
PORT=
```

### TTS

- **Sarvam Bulbul v3** is the production candidate. It supports Indian English, Hindi, Tamil, Telugu and code-mixed text.
- **Kokoro.js** is the developer's own prototype. Known limits: slow on CPU, no native Hinglish (Hindi must be in Devanagari, English in English, so split text by language before synthesis).
- Do not guess Sarvam parameters, voice names or limits from memory. **Read https://docs.sarvam.ai first** and put voices/pace/limits in config, not in code.
- Expose `POST /api/speech/tts` accepting `{ text, language, provider?, voice?, pace? }` so the prototype frontend can A/B providers, voices and pace.
- Every TTS and STT call writes one `SpeechLog` document: `provider, kind, voice, pace, chars|audioSeconds, totalMs, ok, error?`. This is how the provider decision becomes evidence-based. Never invent latency numbers.
- Cache is not built yet, but keep `synthesize` pure (same input → same audio) so a cache can be added later without changes.

### STT (voice input must be free and good)

The learner speaks into the mic; we need text back.

- Default **free** option: **Whisper** (self-hosted, open source) behind `providers/stt/whisper.ts`. Model size trades accuracy for CPU speed; start small and measure. `[verify accuracy and latency on Indian-accented English before locking this in]`
- Comparison option: **Sarvam Saaras** (paid, free credits on signup). Good fit for Indian accents and code-mixed speech.
- Flutter should send **16 kHz mono WAV**. It works for both providers.
- **STT is not a pronunciation scorer.** Speech recognition tends to "fix" mispronounced words into the likely word. Do **not** produce pronunciation scores in the MVP. Feedback covers grammar, naturalness, fluency and vocabulary only.

### LLM

- Always returns JSON validated by Zod. If validation fails, retry once, then return a clean error. Never pass free-form LLM text to the client.

---

## 6. Users without auth

Auth comes later. For now:

- `POST /api/onboarding` creates a real `User` and returns `userId`.
- The client sends `x-user-id` on every other request.
- `middlewares/attachUser.ts` loads the user and sets `req.user`. Controllers and services only ever use `req.user`.
- Later, replace only `attachUser.ts` with JWT/OTP verification. Nothing else changes.

---

## 7. Models

Five collections plus a log. Keep them small.

| Model | Aim | Key fields |
|---|---|---|
| **User** | Who is learning | `name?`, `nativeLanguage`, `level`, `goal`, `placement{...}`, `dailyGoalMinutes`, `createdAt` |
| **Lesson** | One real-life situation made of steps (embedded) | `slug`, `title`, `category`, `level`, `objective`, `estimatedMinutes`, `steps[]` |
| **Conversation** | One attempt at a lesson | `userId`, `lessonId`, `status`, `messages[]`, `feedback{}`, `startedAt`, `endedAt` |
| **Mistake** | Mistake bank, one doc per user + pattern | `userId`, `type`, `pattern`, `example`, `correction`, `explanationHint`, `count`, `box`, `nextReviewAt`, `lastSeen` |
| **SavedWord** | Words the learner keeps | `userId`, `word`, `meaning`, `example`, `conversationId` |
| **SpeechLog** | Provider benchmark log | see section 5 |

Why embedded: `steps` and `messages` are always read with their parent, ordered, and never referenced alone. Feedback is 1:1 with a conversation, so it is embedded with a `status` (`pending | ready | failed`). Mistake is separate because it is queried across all conversations.

Progress is **computed** from conversations (minutes spoken, sessions, words, trends). No Progress model yet.

---

## 8. Onboarding (voice first)

Goal: the learner speaks within the first minute, and what they say sets their starting level.

Flow (`onboardingService` + `placementService`):

1. **Tap questions (3):** first language, goal (daily conversation / work / interviews / travel / confidence), name (optional).
2. **Self-reported level (1 tap, fallback only):** four plain-language choices ("I know a few words" / "I can say simple sentences" / "I can talk but make mistakes and pause a lot" / "I'm comfortable, I want to sound polished"). Used if the learner skips placement or denies the mic.
3. **Voice placement (60 to 90 seconds):** the AI asks 3 spoken questions of rising difficulty, e.g. "What is your name?", "Tell me about your day.", "Why do you want to improve your English?". Each answer is recorded, transcribed, and then scored.
4. **Result:** a level plus 1 or 2 starting focus areas. Return the level and the first recommended lesson.

Placement scoring (LLM, strict JSON, validated by Zod) uses a rubric, not a vibe:

- response length and complexity of sentences
- grammar error rate
- vocabulary range
- hesitation (long pauses, fillers) from transcript/duration
- ability to answer the question asked

Voice placement **overrides** self-reported level. Store both on the user (`level`, `placement.selfReported`, `placement.measured`).

Map to four levels: `beginner`, `elementary`, `intermediate`, `advanced`. Level changes:

- AI vocabulary and sentence length
- AI speaking pace (slower for lower levels)
- how often native-language hints appear (more for beginner, fewer for advanced, never forced)
- which lessons are recommended

Re-evaluate level quietly after every 5 completed conversations. Do not make learners retake a test.

---

## 9. Lessons

A lesson is one real situation ("Job interview: Tell me about yourself"), 5 to 10 minutes. Learners pick situations, not grammar topics.

Steps (embedded, ordered). Only three types now:

- `learn`: the AI says 2 to 4 useful phrases; each has hints keyed by language code (`hints.hi`, `hints.ta`, `hints.te`) and an optional one-line tip.
- `repeat`: the learner says each phrase back; STT confirms the words came out.
- `roleplay`: short goal-based conversation (`aiRole`, `userRole`, `situation`, `goal`, `openingLine`, `maxTurns`, `targetPhrases[]`).

Feedback and retry are **not steps**; they happen after the roleplay.

Content rules:

- Add a language by adding hints, not code.
- Start with about 15 to 20 lessons across: Daily life, Work, Interviews, Travel. Hindi hints first.
- Include Indian-context situations (office, interview, customer calls, college) and common Indian-English patterns as teachable moments ("I have a doubt", "do one thing"). Never frame the learner's English as "bad"; frame it as "more natural globally".

---

## 10. Conversation turn (the heart of the backend)

`conversationService.handleTurn`:

```
audio → STT → save user message → LLM (validated JSON) → TTS → save AI message → respond
```

- Turn-based (tap-to-talk), plain HTTP. No WebSockets yet.
- Build and test the **text-only path first** (skip STT/TTS) so conversation logic is debugged separately from speech.
- Keep AI turns short (1 to 3 sentences) so learners speak more than the AI. The AI asks questions; it does not lecture.
- Respect `maxTurns`. The LLM returns `{ reply, endConversation }`.

---

## 11. Fixing mistakes: science-based rules

These are product rules. Implement them in `feedbackService` and `mistakeService`.

1. **Make the learner produce the fix, not just read it.** Producing the corrected sentence aloud ("pushed output") helps more than reading a correction. Every correction ends with a **retry**.
2. **Show the gap.** Display "You said / Better" side by side so the learner notices the difference (noticing hypothesis).
3. **Limit corrections.** Per conversation, surface the **top 1 to 2 mistakes** only, those that hurt understanding most (global errors first, small slips later). Too many corrections overwhelms and discourages. Store the rest quietly in the mistake bank.
4. **Prefer prompts over silent fixes.** For repeat mistakes, first prompt the learner to self-correct ("Try that again with 'for' or 'since'"), and only then show the answer. Self-correction sticks better than being handed the answer.
5. **One-line "why".** Short explanation, in the learner's first language for beginner/elementary, English for higher levels.
6. **Space the reviews.** Every mistake pattern has a Leitner `box` (1 to 4) with intervals about 1, 3, 7, 14 days. Correct on review → move up a box; wrong → back to box 1. Store `nextReviewAt`.
7. **Review inside real speaking, not flashcards.** When a mistake is due, the next session's warm-up or roleplay is shaped to **elicit that pattern naturally**, so the learner has to produce it again.
8. **Retest later, not only now.** Immediate retry proves short-term success only. The spaced review is what proves learning.
9. **Keep it safe.** Tone is encouraging and specific. Never score a person; score the sentence.

Feedback JSON (validated):

```ts
{
  mistakes: [{ original, corrected, explanation, type: "grammar" | "naturalness" | "vocab" }],
  newWords: [{ word, meaning, example }],
  fluency: { wordsPerMinute, fillerCount, speakingSeconds },
  scores: { grammar, fluency },
  retryRequired: boolean
}
```

---

## 12. Making it fun (lightweight)

Build only what supports speaking more. Avoid heavy gamification.

- **Speaking time is the main number:** "You spoke 6 minutes today", with a small daily goal (`dailyGoalMinutes`).
- **Words spoken** and **new words learned** counters.
- **Visible improvement:** "You made 3 fewer 'since/for' mistakes than last week" (from the mistake bank).
- **Scenario variety and characters:** the AI plays distinct roles (interviewer, shopkeeper, manager) with a light personality.
- **Small wins:** end every session with one thing the learner did well.
- **Optional streak** (days with at least one session). XP, leaderboards and badges are later.

---

## 13. API conventions

- Base path `/api`. JSON in and out. Audio via multipart upload.
- Validate every request with Zod in `validate` middleware.
- Errors: throw `ApiError(status, message)`; one `errorHandler` formats `{ error: { message, code? } }`.
- Success: return plain resource JSON (no wrapper envelope unless needed).

Core endpoints:

| Area | Endpoint |
|---|---|
| Onboarding | `POST /onboarding`, `POST /onboarding/placement` (audio answer in, next question or result out) |
| User | `GET /users/me`, `PATCH /users/me` |
| Home | `GET /home` (recommended lesson, skill summary, recent sessions) |
| Lessons | `GET /lessons`, `GET /lessons/:id` |
| Conversation | `POST /conversations`, `POST /conversations/:id/turns`, `POST /conversations/:id/end`, `GET /conversations/:id`, `POST /conversations/:id/retry` |
| Mistakes | `GET /mistakes`, `GET /mistakes/due` |
| Vocabulary | `POST /vocabulary`, `GET /vocabulary` |
| Progress | `GET /progress` |
| Speech (testing) | `POST /speech/tts`, `POST /speech/stt` |

---

## 14. Code rules

- TypeScript strict. Avoid `any`. Keep types simple.
- Small functions, early returns, clear names. Comment the **why**, not the what.
- Wrap async route handlers with `asyncHandler`; no try/catch noise in controllers.
- Never log secrets or raw user audio. Never store audio in MongoDB; keep a URL or file reference and metadata only.
- Secrets only in `.env`. `.env.example` stays up to date.
- Index fields you query (`userId`, `nextReviewAt`, `slug`).
- Do not refactor unrelated code. Do not rewrite working files for style.

---

## 15. Feature workflow

For every feature:

1. Read this file.
2. State the plan in a few lines: files to add or change, and why.
3. Build the **smallest useful version** first.
4. Keep changes focused and follow existing patterns.
5. Run `npm run lint` and `npm run typecheck` (and tests if present). Fix errors.
6. Explain what changed and how to test it (example `curl` or request body).

Build order for the prototype:

1. config, models, seed with 3 lessons
2. onboarding, users, lessons, home (testable with Postman)
3. conversation start and turns, **text only**
4. TTS and STT providers behind interfaces (Kokoro and Sarvam, Whisper and Sarvam), plus `SpeechLog`
5. voice placement for onboarding
6. end + feedback + mistake bank
7. retry, vocabulary, progress

---

## 16. Scale later (hooks already in place, do not build now)

- Auth: swap `attachUser.ts`.
- Caching TTS for repeated lesson sentences: `synthesize` is pure.
- Streaming / real-time voice: replace the turn endpoint with WebSocket; services stay.
- Background feedback: move `feedbackService` behind a queue; the `pending | ready` status already supports it.
- Pronunciation scoring: add a dedicated provider; do not infer it from STT.
- More languages: add hints and prompts, not code paths.

---

## 17. Open decisions (ask the developer; do not decide silently)

- Which STT is the default after benchmarking Whisper vs Sarvam Saaras on Indian-accented English.
- Which LLM powers conversation and feedback.
- Final TTS provider after the Kokoro vs Bulbul v3 benchmark.
- Free plan limits (later).

Final reminder: simple, readable, core loop first, structure that can grow.
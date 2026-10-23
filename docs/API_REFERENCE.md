# Zubaan API Reference

> **How to keep this doc updated**: Any change to an endpoint, request/response
> shape, validation rule, or environment variable **must** update this file in
> the same commit. Search for the endpoint's `###` heading and verify every
> field, status code, and example still matches the code.

> **Last verified against code**: 2026-10-23

---

## Table of Contents

1. [Overview](#1-overview)
2. [Global Conventions](#2-global-conventions)
3. [Endpoint Reference](#3-endpoint-reference)
   - [Health](#31-health)
   - [Onboarding](#32-onboarding)
   - [Home](#33-home)
   - [Lessons](#34-lessons)
   - [Conversations](#35-conversations)
   - [Speech — TTS](#36-speech--tts)
   - [Speech — STT](#37-speech--stt)
4. [Data Models](#4-data-models)
5. [Flows](#5-flows)
6. [Providers and Configuration](#6-providers-and-configuration)
7. [Limits and Constraints](#7-limits-and-constraints)
8. [Frontend Integration Notes](#8-frontend-integration-notes)
9. [Not Implemented / Known Gaps](#9-not-implemented--known-gaps)

---

## 1. Overview

Zubaan is an AI English speaking coach for Indian learners. The backend
provides APIs for user onboarding, structured lessons, voice-based roleplay
conversations with LLM-generated AI replies, and speech services (TTS/STT).

| Item               | Value                                    |
| ------------------ | ---------------------------------------- |
| Base URL           | `http://<host>:<PORT>`                   |
| API prefix         | `/api`                                   |
| Versioning         | None (no version prefix)                 |
| Transport          | JSON over HTTP (audio via multipart)     |
| Framework          | Express 5 (Node.js + TypeScript)         |
| Database           | MongoDB (Mongoose ODM)                   |
| Auth mechanism     | `x-user-id` header (see §2)             |
| Static audio files | Served at `/audio/<filename>`            |

The server also exposes:
- `GET /health` — outside `/api`, no auth required.
- `GET /audio/*` — static file serving for generated TTS audio.

---

## 2. Global Conventions

### 2.1 Authentication

There is **no real auth** (no JWT, no OTP). Identity is established via:

| Header       | Value                            | Required on            |
| ------------ | -------------------------------- | ---------------------- |
| `x-user-id`  | MongoDB ObjectId string (24 hex) | Every endpoint **except** `POST /api/onboarding` and `GET /health` |

The `attachUser` middleware:
1. Reads `x-user-id` from the request header.
2. Validates it is a valid Mongoose ObjectId.
3. Loads the `User` document from MongoDB.
4. If missing, invalid, or no matching user → responds **401**.

```json
{ "error": { "message": "Unauthorized" } }
```

`POST /api/onboarding` does **not** use `attachUser`; it creates the user.

### 2.2 Success Response Shape

Endpoints return **plain resource JSON** (no wrapper envelope). The HTTP
status code indicates success.

The only exception is `GET /health`, which uses a wrapper:

```json
{ "success": true, "message": "API is running" }
```

### 2.3 Error Response Shape

All errors follow this envelope:

```json
{
  "error": {
    "message": "Human-readable error description"
  }
}
```

There is no `code` field in the current implementation. The `error` object
contains only `message`.

### 2.4 Status Codes Used

| Code | Meaning                                                        |
| ---- | -------------------------------------------------------------- |
| 200  | Success                                                        |
| 201  | Resource created (onboarding, conversation start)              |
| 400  | Validation error, bad input, unsupported format, duration exceeded |
| 401  | Missing or invalid `x-user-id` header                          |
| 404  | Resource not found (lesson, conversation)                      |
| 409  | Conflict (conversation not active, max turns reached)          |
| 429  | External provider rate limit (proxied from Sarvam)             |
| 500  | Unconfigured provider or unexpected server error               |
| 502  | External provider request failed                               |
| 504  | External provider timed out                                    |

### 2.5 CORS Configuration

CORS is enabled via the `cors` middleware with **default options**: all
origins allowed, standard headers. No custom allowed-headers configuration
exists in code.

### 2.6 Request Validation

Every request is validated with Zod schemas via the `validate` middleware.
The middleware parses `{ body, params, query }` against the schema.

On validation failure, the response is:

```json
{
  "error": {
    "message": "<first Zod issue message>"
  }
}
```

Status code: **400**. Only the **first** validation issue message is
returned; subsequent issues are not surfaced.

Validated data is stored on `res.locals.validated` (the original `req.body`
is not mutated).

### 2.7 Multer Errors

For multipart uploads (STT), if the file exceeds the size limit:

```json
{
  "error": {
    "message": "Audio file exceeds 10485760 bytes"
  }
}
```

Status code: **400**. Other multer errors return `"Invalid multipart upload"`.

### 2.8 Request Body Size Limits

JSON and URL-encoded bodies are limited to **1 MB** (`express.json({ limit: '1mb' })`).

### 2.9 Rate Limits

No application-level rate limiting is implemented. External provider rate
limits (Sarvam 429) are proxied to the client.

---

## 3. Endpoint Reference

### 3.1 Health

#### `GET /health`

| Item           | Value                    |
| -------------- | ------------------------ |
| **Purpose**    | Health check             |
| **Auth**       | No                       |

**Request**: None.

**Success Response** — `200`:

```json
{
  "success": true,
  "message": "API is running"
}
```

**Example curl**:

```bash
curl http://localhost:5000/health
```

---

### 3.2 Onboarding

#### `POST /api/onboarding`

| Item           | Value                                              |
| -------------- | -------------------------------------------------- |
| **Purpose**    | Create a new user and return their first recommendation |
| **Auth**       | No (this **creates** the user)                     |

**Request Body** (`application/json`):

| Field            | Type     | Required | Validation                                                                                                             | Default |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| `nativeLanguage` | `string` | Yes      | One of: `"hi"`, `"ta"`, `"te"`, `"mr"`, `"bn"`, `"kn"`, `"ml"`, `"gu"`, `"pa"`, `"or"`                                | —       |
| `goal`           | `string` | Yes      | One of: `"daily_conversation"`, `"work"`, `"interviews"`, `"travel"`, `"confidence"`                                   | —       |
| `level`          | `string` | Yes      | One of: `"beginner"`, `"elementary"`, `"intermediate"`, `"advanced"`                                                   | —       |
| `name`           | `string` | No       | Trimmed, max 50 chars                                                                                                  | —       |

**Success Response** — `201`:

```json
{
  "userId": "665f1a2b3c4d5e6f7a8b9c0d",
  "user": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "name": "Adnan",
    "nativeLanguage": "hi",
    "level": "elementary",
    "goal": "work",
    "dailyGoalMinutes": 10,
    "placement": {
      "selfReported": "elementary"
    },
    "createdAt": "2026-10-13T07:30:00.000Z",
    "updatedAt": "2026-10-13T07:30:00.000Z"
  },
  "recommendedLesson": {
    "id": "665f1a2b3c4d5e6f7a8b9c0e",
    "slug": "give-your-manager-a-quick-work-update",
    "title": "Give your manager a quick work update",
    "category": "work",
    "level": "elementary",
    "objective": "Share a clear, concise update with your manager.",
    "estimatedMinutes": 6
  }
}
```

`recommendedLesson` may be `null` if no lessons exist in the database.

**Error Responses**:

| Status | When                          | Message (example)                |
| ------ | ----------------------------- | -------------------------------- |
| 400    | Validation fails              | `"Invalid enum value. ..."`      |

**Side Effects**:
- Creates a `User` document in MongoDB with `placement.selfReported` set to
  the provided `level`.

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "nativeLanguage": "hi",
    "goal": "work",
    "level": "elementary",
    "name": "Adnan"
  }'
```

---

### 3.3 Home

#### `GET /api/home`

| Item           | Value                                          |
| -------------- | ---------------------------------------------- |
| **Purpose**    | Dashboard data: greeting + recommended lesson  |
| **Auth**       | Yes — `x-user-id` header                       |

**Request**: No body, no query params.

**Success Response** — `200`:

```json
{
  "greetingName": "Adnan",
  "recommendedLesson": {
    "id": "665f1a2b3c4d5e6f7a8b9c0e",
    "slug": "give-your-manager-a-quick-work-update",
    "title": "Give your manager a quick work update",
    "category": "work",
    "level": "elementary",
    "objective": "Share a clear, concise update with your manager.",
    "estimatedMinutes": 6
  }
}
```

`greetingName` defaults to `"there"` if the user has no name.
`recommendedLesson` may be `null`.

**Error Responses**:

| Status | When                          | Message             |
| ------ | ----------------------------- | ------------------- |
| 401    | Missing/invalid `x-user-id`  | `"Unauthorized"`    |

**Example curl**:

```bash
curl http://localhost:5000/api/home \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d"
```

---

### 3.4 Lessons

#### `GET /api/lessons`

| Item           | Value                                |
| -------------- | ------------------------------------ |
| **Purpose**    | List lessons, optionally filtered    |
| **Auth**       | Yes — `x-user-id` header            |

**Query Parameters**:

| Param      | Type     | Required | Validation                                                      |
| ---------- | -------- | -------- | --------------------------------------------------------------- |
| `category` | `string` | No       | One of: `"daily"`, `"work"`, `"career"`, `"travel"`             |
| `level`    | `string` | No       | One of: `"beginner"`, `"elementary"`, `"intermediate"`, `"advanced"` |

**Success Response** — `200`:

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c0e",
    "slug": "introduce-yourself-to-a-new-neighbour",
    "title": "Introduce yourself to a new neighbour",
    "category": "daily",
    "level": "beginner",
    "objective": "Start a friendly conversation with a new neighbour.",
    "estimatedMinutes": 5
  }
]
```

Returns an empty array `[]` if no lessons match.

**Error Responses**:

| Status | When                          | Message               |
| ------ | ----------------------------- | --------------------- |
| 400    | Invalid query param value     | Zod issue message     |
| 401    | Missing/invalid `x-user-id`  | `"Unauthorized"`      |

**Example curl**:

```bash
curl "http://localhost:5000/api/lessons?category=work&level=elementary" \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d"
```

---

#### `GET /api/lessons/:id`

| Item           | Value                                         |
| -------------- | --------------------------------------------- |
| **Purpose**    | Get full lesson detail including steps         |
| **Auth**       | Yes — `x-user-id` header                      |

**Path Parameters**:

| Param | Type     | Required | Validation                     |
| ----- | -------- | -------- | ------------------------------ |
| `id`  | `string` | Yes      | Trimmed, min 1 char (ObjectId) |

**Success Response** — `200`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0e",
  "slug": "introduce-yourself-to-a-new-neighbour",
  "title": "Introduce yourself to a new neighbour",
  "category": "daily",
  "level": "beginner",
  "objective": "Start a friendly conversation with a new neighbour.",
  "estimatedMinutes": 5,
  "steps": [
    {
      "order": 1,
      "type": "learn",
      "phrases": [
        {
          "text": "Hi, I am your new neighbour.",
          "hints": { "hi": "नमस्ते, मैं आपका नया पड़ोसी हूँ।" },
          "tip": null
        }
      ]
    },
    {
      "order": 2,
      "type": "repeat",
      "phraseIndexes": [0, 1, 2]
    },
    {
      "order": 3,
      "type": "roleplay",
      "roleplay": {
        "aiRole": "Neighbour",
        "userRole": "New resident",
        "situation": "You meet a neighbour outside your apartment building.",
        "goal": "Introduce yourself and make a friendly first impression.",
        "openingLine": "Hello! I have not seen you here before. Are you new to the building?",
        "maxTurns": 4,
        "targetPhrases": [
          "Hi, I am your new neighbour.",
          "I just moved in last week.",
          "It is nice to meet you."
        ]
      }
    }
  ]
}
```

**Error Responses**:

| Status | When                          | Message                |
| ------ | ----------------------------- | ---------------------- |
| 401    | Missing/invalid `x-user-id`  | `"Unauthorized"`       |
| 404    | Invalid ObjectId or not found | `"Lesson not found"`   |

**Example curl**:

```bash
curl http://localhost:5000/api/lessons/665f1a2b3c4d5e6f7a8b9c0e \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d"
```

---

### 3.5 Conversations

#### `POST /api/conversations`

| Item           | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Purpose**    | Start a new conversation from a lesson's roleplay    |
| **Auth**       | Yes — `x-user-id` header                             |

**Request Body** (`application/json`):

| Field      | Type     | Required | Validation                     |
| ---------- | -------- | -------- | ------------------------------ |
| `lessonId` | `string` | Yes      | Trimmed, min 1 char (ObjectId) |

**Success Response** — `201`:

```json
{
  "conversationId": "665f1a2b3c4d5e6f7a8b9c10",
  "status": "active",
  "messages": [
    {
      "role": "ai",
      "text": "Hello! I have not seen you here before. Are you new to the building?",
      "audioUrl": "/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.wav",
      "createdAt": "2026-10-13T07:35:00.000Z"
    }
  ],
  "turnsRemaining": 4
}
```

`audioUrl` may be `null` if TTS synthesis fails (failure is swallowed).

**Error Responses**:

| Status | When                            | Message                          |
| ------ | ------------------------------- | -------------------------------- |
| 400    | Validation fails                | Zod issue message                |
| 400    | Lesson has no roleplay step     | `"Lesson has no roleplay step"`  |
| 401    | Missing/invalid `x-user-id`    | `"Unauthorized"`                 |
| 404    | Lesson not found / invalid ID  | `"Lesson not found"`             |

**Side Effects**:
- Creates a `Conversation` document with status `"active"`.
- The AI opening message is the lesson's `roleplay.openingLine`.
- TTS is called to synthesize the opening line; audio is saved to disk.
- A `SpeechLog` document is created for the TTS call.

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Content-Type: application/json" \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d" \
  -d '{ "lessonId": "665f1a2b3c4d5e6f7a8b9c0e" }'
```

---

#### `POST /api/conversations/:id/turns`

| Item           | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Purpose**    | Send user text, receive AI reply (the core conversation turn) |
| **Auth**       | Yes — `x-user-id` header                                  |

**Path Parameters**:

| Param | Type     | Required | Validation                     |
| ----- | -------- | -------- | ------------------------------ |
| `id`  | `string` | Yes      | Trimmed, min 1 char (ObjectId) |

**Request Body** (`application/json`):

| Field  | Type     | Required | Validation             |
| ------ | -------- | -------- | ---------------------- |
| `text` | `string` | Yes      | Trimmed, 1–500 chars   |

**Success Response** — `200`:

```json
{
  "reply": "That sounds great! How are you finding the neighbourhood so far?",
  "audioUrl": "/audio/b2c3d4e5-f6a7-8901-bcde-f12345678901.wav",
  "endConversation": false,
  "turnsRemaining": 3,
  "correction": {
    "corrected": "I went to the market yesterday.",
    "explanation": "Use \"went\" as the past tense of \"go\".",
    "type": "tense"
  },
  "feedback": null
}
```

`audioUrl` may be `null` if TTS fails.

`correction` is `null` when the learner's message has no mistake. When
present it contains the corrected sentence, a short explanation, and a
mistake type. See `Correction` in §4.
`feedback` is `null` unless this turn completed the conversation.

When `endConversation` is `true`, the conversation status changes to
`"completed"` and no further turns can be taken.

**Error Responses**:

| Status | When                                           | Message                                                                          |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 400    | Validation fails                               | Zod issue message                                                                |
| 401    | Missing/invalid `x-user-id`                   | `"Unauthorized"`                                                                 |
| 404    | Conversation not found or not owned by user    | `"Conversation not found"`                                                       |
| 404    | Lesson associated with conversation not found  | `"Lesson not found"`                                                             |
| 409    | Conversation not active or max turns reached   | `"Cannot take turn: conversation is not active or has reached the maximum number of turns"` |
| 502    | LLM returned invalid JSON after retry          | `"AI response was invalid"`                                                      |

**Side Effects**:
- Appends the user message to `conversation.messages` (atomic update with
  guard against exceeding `maxTurns`).
- Calls the LLM provider to generate a response (validated JSON) which
  now includes correction fields alongside the reply.
- Computes a `Correction` from the LLM output and attaches it to the user
  message (same save that appends the AI message).
- Calls TTS to synthesize the AI reply; audio saved to disk.
- Appends the AI message to `conversation.messages`.
- If `turnsRemaining === 0` or LLM sets `endConversation: true`, the
  conversation status is set to `"completed"`, `endedAt` and `durationSec`
  are recorded.
- If LLM fails, the user message is rolled back (`$pop`).
- `SpeechLog` documents created for TTS calls.

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/conversations/665f1a2b3c4d5e6f7a8b9c10/turns \
  -H "Content-Type: application/json" \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d" \
  -d '{ "text": "Hi, I am your new neighbour. I just moved in last week." }'
```

---

#### `POST /api/conversations/:id/end`

| Item           | Value                                      |
| -------------- | ------------------------------------------ |
| **Purpose**    | Manually end an active conversation        |
| **Auth**       | Yes — `x-user-id` header                   |

**Path Parameters**:

| Param | Type     | Required | Validation                     |
| ----- | -------- | -------- | ------------------------------ |
| `id`  | `string` | Yes      | Trimmed, min 1 char (ObjectId) |

**Request Body**: None.

**Success Response** — `200`:

```json
{
  "conversationId": "665f1a2b3c4d5e6f7a8b9c10",
  "status": "completed",
  "durationSec": 185,
  "userTurns": 3,
  "feedback": {
    "userTurns": 3,
    "durationSec": 185,
    "mistakeCount": 1,
    "corrections": [
      {
        "original": "I goed to market yesterday",
        "corrected": "I went to market yesterday",
        "explanation": "Use \"went\" as the past tense of \"go\".",
        "type": "tense"
      }
    ],
    "targetPhrases": {
      "used": ["I just moved in last week."],
      "missed": ["Hi, I am your new neighbour.", "It is nice to meet you."]
    }
  }
}
```

If the conversation was already `"completed"`, the response returns its
existing data (idempotent for completed status).

`feedback` contains `userTurns`, `durationSec` (`number | null`),
`mistakeCount`, `corrections[]`, and `targetPhrases.used` / `missed`.

**Error Responses**:

| Status | When                                         | Message                       |
| ------ | -------------------------------------------- | ----------------------------- |
| 401    | Missing/invalid `x-user-id`                 | `"Unauthorized"`              |
| 404    | Conversation not found or not owned by user  | `"Conversation not found"`    |
| 409    | Conversation is `"abandoned"`                | `"Conversation is not active"` |

**Side Effects**:
- Sets `status` to `"completed"`, `endedAt` to now, calculates `durationSec`
  from `startedAt`.

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/conversations/665f1a2b3c4d5e6f7a8b9c10/end \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d"
```

---

#### `GET /api/conversations/:id`

| Item           | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Retrieve full conversation with messages |
| **Auth**       | Yes — `x-user-id` header                 |

**Path Parameters**:

| Param | Type     | Required | Validation                     |
| ----- | -------- | -------- | ------------------------------ |
| `id`  | `string` | Yes      | Trimmed, min 1 char (ObjectId) |

**Success Response** — `200`:

```json
{
  "conversationId": "665f1a2b3c4d5e6f7a8b9c10",
  "lessonId": "665f1a2b3c4d5e6f7a8b9c0e",
  "status": "active",
  "messages": [
    {
      "role": "ai",
      "text": "Hello! I have not seen you here before. Are you new to the building?",
      "audioUrl": "/audio/a1b2c3d4-e5f6-7890-abcd-ef1234567890.wav",
      "createdAt": "2026-10-13T07:35:00.000Z"
    },
    {
      "role": "user",
      "text": "I goed to the market yesterday.",
      "audioUrl": null,
      "correction": {
        "corrected": "I went to the market yesterday.",
        "explanation": "Use \"went\" as the past tense of \"go\".",
        "type": "tense"
      },
      "createdAt": "2026-10-13T07:35:30.000Z"
    }
  ],
  "startedAt": "2026-10-13T07:35:00.000Z",
  "feedback": null
}
```

`feedback` is non-null only when status is completed. `endedAt` and
`durationSec` are omitted while status is active and present once completed.

**Error Responses**:

| Status | When                                         | Message                    |
| ------ | -------------------------------------------- | -------------------------- |
| 401    | Missing/invalid `x-user-id`                 | `"Unauthorized"`           |
| 404    | Conversation not found or not owned by user  | `"Conversation not found"` |

**Example curl**:

```bash
curl http://localhost:5000/api/conversations/665f1a2b3c4d5e6f7a8b9c10 \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d"
```

---

### 3.6 Speech — TTS

#### `POST /api/speech/tts`

| Item           | Value                                              |
| -------------- | -------------------------------------------------- |
| **Purpose**    | Synthesize text to speech, return audio URL         |
| **Auth**       | Yes — `x-user-id` header                           |

**Request Body** (`application/json`):

| Field      | Type     | Required | Validation                                              | Default                |
| ---------- | -------- | -------- | ------------------------------------------------------- | ---------------------- |
| `text`     | `string` | Yes      | Trimmed, 1–2500 chars                                   | —                      |
| `language` | `string` | Yes      | One of: `"en-IN"`, `"hi-IN"`, `"ta-IN"`, `"te-IN"`     | —                      |
| `provider` | `string` | No       | One of: `"kokoro"`, `"sarvam"`                          | `env.TTS_PROVIDER`     |
| `voice`    | `string` | No       | Trimmed, 1–120 chars                                    | Provider default       |
| `pace`     | `number` | No       | 0.5–2.0                                                 | Provider default       |

**Success Response** — `200`:

```json
{
  "audioUrl": "/audio/c3d4e5f6-a7b8-9012-cdef-123456789012.wav",
  "provider": "sarvam",
  "voice": "shubh",
  "pace": 1,
  "chars": 42,
  "totalMs": 1523,
  "durationMs": null,
  "cached": false
}
```

| Field        | Type              | Description                                    |
| ------------ | ----------------- | ---------------------------------------------- |
| `audioUrl`   | `string`          | Relative path to the stored audio file         |
| `provider`   | `string`          | Provider used (`"kokoro"` or `"sarvam"`)       |
| `voice`      | `string \| null`  | Voice used, or null if not specified            |
| `pace`       | `number \| null`  | Pace used, or null if not specified             |
| `chars`      | `number`          | Character count of input text                  |
| `totalMs`    | `number`          | Wall-clock time of the provider call (ms)      |
| `durationMs` | `number \| null`  | Duration of generated audio (ms), if available |
| `cached`     | `boolean`         | True when an existing file was reused. On a hit no provider call is made: `totalMs` is 0, `durationMs` is null and no SpeechLog is written. |

**Error Responses**:

| Status | When                                                      | Message                                                       |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| 400    | Validation fails                                          | Zod issue message                                             |
| 400    | Kokoro + non-English language                             | `"Kokoro supports English only"`                              |
| 400    | Text exceeds 2500 chars (Sarvam)                          | `"Sarvam Bulbul v3 supports up to 2500 characters per request"` |
| 401    | Missing/invalid `x-user-id`                              | `"Unauthorized"`                                              |
| 429    | Sarvam rate limit                                         | `"TTS provider rate limit exceeded"`                          |
| 500    | Provider not configured (missing API key)                 | `"TTS provider is not configured"`                            |
| 502    | Provider returned bad data or request failed              | `"TTS provider request failed"`                               |
| 502    | Sarvam auth failed (401/403 from Sarvam)                  | `"TTS provider authentication failed"`                        |
| 504    | Provider timed out                                        | `"TTS provider timed out"`                                    |

**Side Effects**:
- Audio file saved to `storage/audio/` directory.
- A `SpeechLog` document is created (kind: `"tts"`).

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/speech/tts \
  -H "Content-Type: application/json" \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d" \
  -d '{
    "text": "Hello! How are you doing today?",
    "language": "en-IN",
    "provider": "sarvam",
    "voice": "shubh",
    "pace": 1
  }'
```

---

### 3.7 Speech — STT

#### `POST /api/speech/stt`

| Item           | Value                                            |
| -------------- | ------------------------------------------------ |
| **Purpose**    | Transcribe uploaded audio to text                |
| **Auth**       | Yes — `x-user-id` header                         |

**Request**: `multipart/form-data`

| Form Field   | Type   | Required | Validation / Constraints                            |
| ------------ | ------ | -------- | --------------------------------------------------- |
| `audio`      | File   | Yes      | Max 10 MB (10,485,760 bytes). Must be a supported MIME type (see below); MIME parameters are tolerated. |
| `language`   | string | No       | One of the STT language codes (see §4.5). Default: `"unknown"`. |
| `provider`   | string | No       | One of: `"sarvam"`. Default: `env.STT_PROVIDER`.    |

**Supported MIME Types** (validated by multer file filter after lowercasing,
trimming, and removing MIME parameters):

`audio/mpeg`, `audio/mp3`, `audio/mpeg3`, `audio/x-mpeg-3`, `audio/x-mp3`,
`audio/wav`, `audio/x-wav`, `audio/wave`, `audio/aac`, `audio/x-aac`,
`audio/aiff`, `audio/x-aiff`, `audio/ogg`, `audio/opus`, `audio/flac`,
`audio/x-flac`, `audio/mp4`, `audio/x-m4a`, `audio/amr`, `audio/x-ms-wma`,
`audio/webm`, `audio/pcm_s16le`, `audio/pcm_l16`, `audio/pcm_raw`

For example, a browser upload labelled `Audio/WebM; codecs=opus` is normalized
to `audio/webm` before validation, provider upload, and logging.

**Success Response** — `200`:

```json
{
  "text": "Hi, I am your new neighbour. I just moved in last week.",
  "languageCode": "en-IN",
  "provider": "sarvam",
  "totalMs": 2341,
  "durationSeconds": 4.5
}
```

| Field            | Type              | Description                                |
| ---------------- | ----------------- | ------------------------------------------ |
| `text`           | `string`          | Transcribed text                           |
| `languageCode`   | `string \| null`  | Detected/specified language code           |
| `provider`       | `string`          | Provider used (`"sarvam"`)                 |
| `totalMs`        | `number`          | Wall-clock time of the provider call (ms)  |
| `durationSeconds`| `number \| null`  | Duration of the input audio when metadata can determine it; otherwise `null` |

The server first reads normal container metadata. If that is unavailable, it
performs one full scan while the upload is within the file-size cap; an unknown
duration then proceeds as `null`, with Sarvam enforcing its own 30-second limit.

**Error Responses**:

| Status | When                                              | Message                                                              |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| 400    | No file uploaded                                  | `"audio file is required"`                                           |
| 400    | Unsupported MIME type                             | `"Unsupported audio format for STT"`                                 |
| 400    | File exceeds size limit                           | `"Audio file exceeds 10485760 bytes"`                                |
| 400    | Audio duration exceeds max                        | `"Sarvam STT REST supports up to 30 seconds per request"`           |
| 400    | Sarvam rejects the audio input, including its 30-second limit (422) | `"Sarvam STT REST supports up to 30 seconds per request"` |
| 401    | Missing/invalid `x-user-id`                      | `"Unauthorized"`                                                     |
| 429    | Sarvam rate limit                                 | `"STT provider rate limit exceeded"`                                 |
| 500    | Provider not configured                           | `"STT provider is not configured"`                                   |
| 502    | Provider returned bad data or request failed      | `"STT provider request failed"`                                      |
| 502    | Sarvam auth failed                                | `"STT provider authentication failed"`                               |
| 504    | Provider timed out                                | `"STT provider timed out"`                                           |

**Side Effects**:
- A `SpeechLog` document is created (kind: `"stt"`).
- Audio is **not** persisted to disk (processed in-memory only).

**Example curl**:

```bash
curl -X POST http://localhost:5000/api/speech/stt \
  -H "x-user-id: 665f1a2b3c4d5e6f7a8b9c0d" \
  -F "audio=@recording.wav;type=audio/wav" \
  -F "language=en-IN"
```

---

## 4. Data Models

### 4.1 User

| Field              | Type     | Required | Default | Notes                          |
| ------------------ | -------- | -------- | ------- | ------------------------------ |
| `_id`              | ObjectId | Auto     | —       | MongoDB auto-generated         |
| `name`             | string   | No       | —       | Trimmed                        |
| `nativeLanguage`   | string   | Yes      | —       | Enum: see `Language` below     |
| `level`            | string   | Yes      | —       | Enum: see `Level` below        |
| `goal`             | string   | Yes      | —       | Enum: see `Goal` below         |
| `dailyGoalMinutes` | number   | No       | `10`    |                                |
| `placement.selfReported` | string | Yes   | —       | Enum: `Level`                  |
| `placement.measured`     | string | No    | —       | Enum: `Level`                  |
| `createdAt`        | Date     | Auto     | —       | Mongoose timestamps            |
| `updatedAt`        | Date     | Auto     | —       | Mongoose timestamps            |

### 4.2 Lesson

| Field              | Type           | Required | Notes                         |
| ------------------ | -------------- | -------- | ----------------------------- |
| `_id`              | ObjectId       | Auto     |                               |
| `slug`             | string         | Yes      | Unique, indexed               |
| `title`            | string         | Yes      |                               |
| `category`         | string         | Yes      | Enum: `LessonCategory`        |
| `level`            | string         | Yes      | Enum: `Level`                 |
| `objective`        | string         | Yes      |                               |
| `estimatedMinutes` | number         | Yes      |                               |
| `steps`            | `LessonStep[]` | Yes      | Embedded array (see below)    |
| `createdAt`        | Date           | Auto     |                               |
| `updatedAt`        | Date           | Auto     |                               |

**LessonStep**:

| Field          | Type              | Required | Notes                              |
| -------------- | ----------------- | -------- | ---------------------------------- |
| `order`        | number            | Yes      | Step sequence number               |
| `type`         | string            | Yes      | `"learn"` \| `"repeat"` \| `"roleplay"` |
| `phrases`      | `LessonPhrase[]`  | No       | Present on `learn` steps           |
| `phraseIndexes`| `number[]`        | No       | Present on `repeat` steps          |
| `roleplay`     | `RoleplayStep`    | No       | Present on `roleplay` steps        |

**LessonPhrase**:

| Field  | Type                                | Required | Notes                       |
| ------ | ----------------------------------- | -------- | --------------------------- |
| `text` | string                              | Yes      |                             |
| `hints`| `Record<Language, string>` (partial)| No       | Keyed by language code      |
| `tip`  | string                              | No       |                             |

**RoleplayStep**:

| Field           | Type       | Required |
| --------------- | ---------- | -------- |
| `aiRole`        | string     | Yes      |
| `userRole`      | string     | Yes      |
| `situation`     | string     | Yes      |
| `goal`          | string     | Yes      |
| `openingLine`   | string     | Yes      |
| `maxTurns`      | number     | Yes      |
| `targetPhrases` | `string[]` | Yes      |

### 4.3 Conversation

| Field        | Type                        | Required | Default       | Notes                     |
| ------------ | --------------------------- | -------- | ------------- | ------------------------- |
| `_id`        | ObjectId                    | Auto     | —             |                           |
| `userId`     | ObjectId (ref: User)        | Yes      | —             | Indexed                   |
| `lessonId`   | ObjectId (ref: Lesson)      | Yes      | —             |                           |
| `status`     | string                      | Yes      | `"active"`    | `"active"` \| `"completed"` \| `"abandoned"` |
| `messages`   | `ConversationMessage[]`     | Yes      | `[]`          | Embedded array            |
| `startedAt`  | Date                        | Yes      | `Date.now`    |                           |
| `endedAt`    | Date                        | No       | —             |                           |
| `durationSec`| number                      | No       | —             | Min: 0                    |
| `createdAt`  | Date                        | Auto     | —             |                           |
| `updatedAt`  | Date                        | Auto     | —             |                           |

**ConversationMessage**:

| Field        | Type                  | Required | Default      | Notes |
| ------------ | --------------------- | -------- | ------------ | ----- |
| `role`       | string                | Yes      | —            | `"user"` \| `"ai"` |
| `text`       | string                | Yes      | —            | Trimmed |
| `audioUrl`   | string                | No       | `null`       | |
| `correction` | `Correction` \| null  | No       | `null`       | User messages only. See `Correction` below. |
| `createdAt`  | Date                  | Yes      | `Date.now`   | |

**Correction** (embedded in user messages when a mistake is found):

| Field         | Type          | Required | Notes |
| ------------- | ------------- | -------- | ----- |
| `corrected`   | string        | Yes      | The corrected sentence |
| `explanation` | string        | Yes      | One short sentence, max 160 chars |
| `type`        | `MistakeType` | Yes      | See §4.5 |

### 4.4 SpeechLog

| Field         | Type     | Required | Notes                              |
| ------------- | -------- | -------- | ---------------------------------- |
| `_id`         | ObjectId | Auto     |                                    |
| `kind`        | string   | Yes      | `"tts"` \| `"stt"`                |
| `provider`    | string   | Yes      | `"kokoro"` \| `"sarvam"`          |
| `voice`       | string   | No       | TTS only                           |
| `pace`        | number   | No       | TTS only                           |
| `language`    | string   | Yes      |                                    |
| `chars`       | number   | No       | TTS: character count               |
| `audioSeconds`| number   | No       | STT: input audio duration          |
| `mimeType`    | string   | No       | STT: input audio MIME type         |
| `audioBytes`  | number   | Yes      |                                    |
| `durationMs`  | number   | No       | TTS: generated audio duration (ms) |
| `totalMs`     | number   | Yes      | Wall-clock provider call time (ms) |
| `ok`          | boolean  | Yes      |                                    |
| `error`       | string   | No       | Max 160 chars                      |
| `createdAt`   | Date     | Yes      | Default: now                       |

### 4.5 Enums

**Language** (native languages):

```
"hi" | "ta" | "te" | "mr" | "bn" | "kn" | "ml" | "gu" | "pa" | "or"
```

**Level**:

```
"beginner" | "elementary" | "intermediate" | "advanced"
```

**Goal**:

```
"daily_conversation" | "work" | "interviews" | "travel" | "confidence"
```

**LessonCategory**:

```
"daily" | "work" | "career" | "travel"
```

**Goal → LessonCategory mapping** (used for recommendations):

| Goal                 | Category |
| -------------------- | -------- |
| `daily_conversation` | `daily`  |
| `work`               | `work`   |
| `interviews`         | `career` |
| `travel`             | `travel` |
| `confidence`         | `daily`  |

**TtsLanguage**:

```
"en-IN" | "hi-IN" | "ta-IN" | "te-IN"
```

**TtsProviderName**:

```
"kokoro" | "sarvam"
```

**SttProviderName**:

```
"sarvam"
```

**SttLanguageCode**:

```
"unknown" | "hi-IN" | "bn-IN" | "kn-IN" | "ml-IN" | "mr-IN" | "od-IN" |
"pa-IN" | "ta-IN" | "te-IN" | "en-IN" | "gu-IN" | "as-IN" | "ur-IN" |
"ne-IN" | "kok-IN" | "ks-IN" | "sd-IN" | "sa-IN" | "sat-IN" | "mni-IN" |
"brx-IN" | "mai-IN" | "doi-IN"
```

**ConversationStatus**:

```
"active" | "completed" | "abandoned"
```

**LlmProvider**:

```
"mock" | "sarvam"
```

**MistakeType**:

```
"grammar" | "tense" | "preposition" | "word_choice" | "other"
```

### 4.6 TypeScript Interfaces

```typescript
// ── Enums ──────────────────────────────────────────────────

type Language = "hi" | "ta" | "te" | "mr" | "bn" | "kn" | "ml" | "gu" | "pa" | "or";
type Level = "beginner" | "elementary" | "intermediate" | "advanced";
type Goal = "daily_conversation" | "work" | "interviews" | "travel" | "confidence";
type LessonCategory = "daily" | "work" | "career" | "travel";
type TtsLanguage = "en-IN" | "hi-IN" | "ta-IN" | "te-IN";
type TtsProviderName = "kokoro" | "sarvam";
type SttProviderName = "sarvam";
type ConversationStatus = "active" | "completed" | "abandoned";
type MessageRole = "user" | "ai";

type SttLanguageCode =
  | "unknown" | "hi-IN" | "bn-IN" | "kn-IN" | "ml-IN" | "mr-IN"
  | "od-IN" | "pa-IN" | "ta-IN" | "te-IN" | "en-IN" | "gu-IN"
  | "as-IN" | "ur-IN" | "ne-IN" | "kok-IN" | "ks-IN" | "sd-IN"
  | "sa-IN" | "sat-IN" | "mni-IN" | "brx-IN" | "mai-IN" | "doi-IN";

// ── Request Bodies ──────────────────────────────────────────

interface OnboardingRequest {
  nativeLanguage: Language;
  goal: Goal;
  level: Level;
  name?: string;                  // max 50 chars
}

interface ConversationStartRequest {
  lessonId: string;
}

interface ConversationTurnRequest {
  text: string;                   // 1–500 chars
}

interface TtsRequest {
  text: string;                   // 1–2500 chars
  language: TtsLanguage;
  provider?: TtsProviderName;
  voice?: string;                 // 1–120 chars
  pace?: number;                  // 0.5–2.0
}

interface SttRequest {
  // multipart: "audio" file field
  language?: SttLanguageCode;
  provider?: SttProviderName;
}

// ── Response Bodies ─────────────────────────────────────────

interface OnboardingResponse {
  userId: string;
  user: User;
  recommendedLesson: LessonListItem | null;
}

interface HomeResponse {
  greetingName: string;
  recommendedLesson: LessonListItem | null;
}

interface LessonListItem {
  id: string;
  slug: string;
  title: string;
  category: LessonCategory;
  level: Level;
  objective: string;
  estimatedMinutes: number;
}

interface LessonDetail extends LessonListItem {
  steps: LessonStep[];
}

interface LessonStep {
  order: number;
  type: "learn" | "repeat" | "roleplay";
  phrases?: LessonPhrase[];
  phraseIndexes?: number[];
  roleplay?: RoleplayStep;
}

interface LessonPhrase {
  text: string;
  hints: Partial<Record<Language, string>>;
  tip?: string | null;
}

interface RoleplayStep {
  aiRole: string;
  userRole: string;
  situation: string;
  goal: string;
  openingLine: string;
  maxTurns: number;
  targetPhrases: string[];
}

interface ConversationStartResponse {
  conversationId: string;
  status: ConversationStatus;
  messages: ConversationMessage[];
  turnsRemaining: number;
}

interface ConversationTurnResponse {
  reply: string;
  audioUrl: string | null;
  endConversation: boolean;
  turnsRemaining: number;
  correction: Correction | null;
  feedback: ConversationFeedback | null;
}

interface ConversationEndResponse {
  conversationId: string;
  status: ConversationStatus;
  durationSec: number;
  userTurns: number;
  feedback: ConversationFeedback;
}

interface ConversationGetResponse {
  conversationId: string;
  lessonId: string;
  status: ConversationStatus;
  messages: ConversationMessage[];
  startedAt: string;              // ISO 8601
  endedAt?: string;               // ISO 8601; present once completed
  durationSec?: number;           // present once completed
  feedback: ConversationFeedback | null;
}

interface ConversationMessage {
  role: MessageRole;
  text: string;
  audioUrl: string | null;
  correction?: Correction | null; // user messages only
  createdAt: string;              // ISO 8601
}

type MistakeType = "grammar" | "tense" | "preposition" | "word_choice" | "other";

interface Correction {
  corrected: string;
  explanation: string;
  type: MistakeType;
}

interface FeedbackCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: MistakeType;
}

interface ConversationFeedback {
  userTurns: number;
  durationSec: number | null;
  mistakeCount: number;
  corrections: FeedbackCorrection[];
  targetPhrases: { used: string[]; missed: string[] };
}

interface TtsResponse {
  audioUrl: string;
  provider: TtsProviderName;
  voice: string | null;
  pace: number | null;
  chars: number;
  totalMs: number;
  durationMs: number | null;
  cached: boolean;
}

interface SttResponse {
  text: string;
  languageCode: string | null;
  provider: SttProviderName;
  totalMs: number;
  durationSeconds: number | null;
}

interface ApiErrorResponse {
  error: {
    message: string;
  };
}

interface HealthResponse {
  success: boolean;
  message: string;
}

// ── Internal (not directly in API but part of User) ─────────

interface User {
  _id: string;
  name?: string;
  nativeLanguage: Language;
  level: Level;
  goal: Goal;
  dailyGoalMinutes: number;
  placement: {
    selfReported: Level;
    measured?: Level;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Flows

### 5.1 First-Time User + Onboarding

The user onboards with a single API call, receives a `userId`, and uses it
for all subsequent requests.

**Sequence**:

1. **Client** → `POST /api/onboarding`
   - Sends `{ nativeLanguage, goal, level, name? }`
2. **Server** → `201`
   - Creates `User` document
   - Returns `{ userId, user, recommendedLesson }`
3. **Client** stores `userId` for use in the `x-user-id` header on all
   future requests.
4. **Client** can immediately navigate to the recommended lesson or the home
   screen.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MongoDB

    C->>S: POST /api/onboarding<br/>{nativeLanguage, goal, level, name?}
    S->>DB: User.create(...)
    DB-->>S: User document
    S->>DB: Lesson.findOne(category, level)
    DB-->>S: Recommended lesson
    S-->>C: 201 {userId, user, recommendedLesson}
    Note over C: Store userId for x-user-id header
```

### 5.2 Loading Home and Lessons

**Home screen**:

1. **Client** → `GET /api/home` with `x-user-id`
2. **Server** → `200 { greetingName, recommendedLesson }`

**Browse lessons**:

1. **Client** → `GET /api/lessons` (optionally with `?category=...&level=...`)
   with `x-user-id`
2. **Server** → `200 [LessonListItem, ...]`
3. **Client** → `GET /api/lessons/:id` with `x-user-id` to load full lesson
   detail (steps, phrases, roleplay).

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: GET /api/home<br/>x-user-id: {userId}
    S-->>C: 200 {greetingName, recommendedLesson}

    C->>S: GET /api/lessons?category=work<br/>x-user-id: {userId}
    S-->>C: 200 [LessonListItem, ...]

    C->>S: GET /api/lessons/{lessonId}<br/>x-user-id: {userId}
    S-->>C: 200 LessonDetail (with steps)
```

### 5.3 Full Speaking Loop (Conversation)

This is the core flow. The client starts a conversation from a lesson,
sends user text each turn, receives AI text + audio, and eventually ends
the conversation.

**Sequence**:

1. **Client** → `POST /api/conversations` with `{ lessonId }`
   - **Server** finds the lesson's roleplay step
   - **Server** calls TTS to synthesize the AI opening line
   - **Server** creates a `Conversation` document
   - Returns `{ conversationId, status, messages, turnsRemaining }`
   - `messages[0]` contains the AI opening line + `audioUrl`

2. **Client** plays the audio from `audioUrl`

3. **Client** records user speech

4. **Client** → `POST /api/speech/stt` (multipart with audio file)
   - Returns `{ text, ... }`

5. **Client** → `POST /api/conversations/:id/turns` with `{ text }`
   - **Server** appends user message (atomic, guarded by maxTurns)
   - **Server** calls LLM to generate AI reply
   - **Server** calls TTS to synthesize AI reply
   - **Server** appends AI message
   - Returns `{ reply, audioUrl, endConversation, turnsRemaining }`

6. **Client** plays the AI reply audio

7. **Repeat steps 3–6** until `endConversation === true` or
   `turnsRemaining === 0`

8. (Optional) **Client** → `POST /api/conversations/:id/end`
   - Manually ends the conversation early
   - Returns `{ conversationId, status, durationSec, userTurns }`

9. (Optional) **Client** → `GET /api/conversations/:id`
   - Retrieve the full conversation with all messages

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant LLM as LLM Provider
    participant TTS as TTS Provider
    participant STT as STT Provider

    C->>S: POST /api/conversations<br/>{lessonId}
    S->>TTS: synthesize(openingLine)
    TTS-->>S: audio buffer
    S-->>C: 201 {conversationId, messages[ai], turnsRemaining}
    Note over C: Play AI opening audio

    loop Each turn (until endConversation or turnsRemaining=0)
        Note over C: Record user speech
        C->>S: POST /api/speech/stt<br/>multipart: audio file
        S->>STT: transcribe(audio)
        STT-->>S: {text}
        S-->>C: 200 {text, languageCode, ...}

        C->>S: POST /api/conversations/:id/turns<br/>{text}
        S->>LLM: generate(system, messages)
        LLM-->>S: {reply, endConversation}
        S->>TTS: synthesize(reply)
        TTS-->>S: audio buffer
        S-->>C: 200 {reply, audioUrl, endConversation, turnsRemaining}
        Note over C: Play AI reply audio
    end

    opt Manual end
        C->>S: POST /api/conversations/:id/end
        S-->>C: 200 {conversationId, status, durationSec, userTurns}
    end
```

### 5.4 Text-Only Conversation (No Speech)

The conversation turn endpoint accepts text directly. STT and TTS are not
required for the core conversation loop:

1. `POST /api/conversations` → start (TTS is called for opening but audio
   failure is swallowed)
2. `POST /api/conversations/:id/turns` with `{ text: "user typed text" }`
   → AI reply text returned (audioUrl may be null)

This path is useful for text-based testing or if the client wants to skip
speech entirely.

### 5.5 Standalone TTS/STT Testing

For A/B testing providers, voices, and pace:

1. `POST /api/speech/tts` with `{ text, language, provider?, voice?, pace? }`
   → Returns `{ audioUrl, provider, totalMs, ... }`
2. `POST /api/speech/stt` with audio file → Returns `{ text, totalMs, ... }`

These endpoints operate independently of conversations.

---

## 6. Providers and Configuration

### 6.1 Provider Selection

| Provider Type | Default (env)       | Per-request override field | Allowed values         |
| ------------- | ------------------- | -------------------------- | ---------------------- |
| TTS           | `TTS_PROVIDER`      | `provider` in TTS body     | `"kokoro"`, `"sarvam"` |
| STT           | `STT_PROVIDER`      | `provider` in STT body     | `"sarvam"`             |
| LLM           | `LLM_PROVIDER`      | Not overridable per-request| `"mock"`, `"sarvam"`   |

During conversations, the TTS provider is determined by `env.TTS_PROVIDER`
and is **not** overridable per-turn. Voice and pace are set from
`env.SARVAM_TTS_VOICE` and `env.SARVAM_TTS_PACE` when using Sarvam.

### 6.2 TTS Provider Details

**Sarvam (Bulbul v3)**:
- Languages: `en-IN`, `hi-IN`, `ta-IN`, `te-IN`
- Voice: configurable via `voice` field or `SARVAM_TTS_VOICE` env
- Pace: 0.5–2.0, configurable via `pace` field or `SARVAM_TTS_PACE` env
- Max chars per request: **2500**
- Output format: **WAV**
- Timeout: `SARVAM_TTS_TIMEOUT_MS` (default: 30000)

**Kokoro**:
- Languages: **`en-IN` only** (rejects other languages with 400)
- Default voice: `"af_heart"`
- Pace: **not supported** by Kokoro (the `pace` field is ignored)
- Output format: **WAV**
- Timeout: `KOKORO_TIMEOUT_MS` (default: 90000)
- Streams NDJSON chunks of base64-encoded WAV audio

Audio is cached on disk. The file name is a hash of provider, model, language,
effective voice, effective pace (ignored for Kokoro) and text, so identical
requests share one file.

### 6.3 STT Provider Details

**Sarvam (Saaras v3)**:
- Model: `saaras:v3`
- Mode: `verbatim`
- Supports 24 Indian language codes (see §4.5)
- Accepts many audio formats (see §3.7)
- Timeout: `SARVAM_STT_TIMEOUT_MS` (default: 15000)
- Max file size: `STT_MAX_FILE_SIZE_BYTES` (default: 10 MB)
- Max duration: `STT_MAX_DURATION_SECONDS` (default: 30 seconds)
- Supports raw PCM codecs: `pcm_s16le`, `pcm_l16`, `pcm_raw`

### 6.4 LLM Provider Details

**Mock** (`LLM_PROVIDER=mock`):
- Always returns `{ "reply": "Nice! Can you tell me more?", "endConversation": false }` with
  correction fields.
- Correction rule: if the learner's text matches `/\bgoed\b/i`, returns
  `hasMistake: true`, replaces "goed" with "went", explanation
  `'Use "went" as the past tense of "go".'`, mistakeType `"tense"`.
  Otherwise `hasMistake: false` with empty correction fields.
- Useful for frontend development without external dependencies

**Sarvam** (`LLM_PROVIDER=sarvam`):
- Uses Sarvam chat completions API
- Models: `"sarvam-105b"` or `"sarvam-105b-conversations"`
- Temperature: `0.2` (hardcoded)
- Enforces JSON schema response format
- Timeout: 15 seconds (hardcoded)
- LLM output is validated by Zod; retried once on validation failure

### 6.5 Environment Variables

All environment variable **names** (never values):

| Variable                   | Affects client behavior?  | Notes                                    |
| -------------------------- | ------------------------- | ---------------------------------------- |
| `NODE_ENV`                 | No                        | `development` \| `test` \| `production`  |
| `PORT`                     | Yes (server URL)          | 1–65535                                  |
| `MONGODB_URI`              | No                        |                                          |
| `JWT_SECRET`               | No                        | Exists in schema but unused currently    |
| `LLM_PROVIDER`             | Yes (AI reply quality)    | `"mock"` \| `"sarvam"`                   |
| `TTS_PROVIDER`             | Yes (default TTS)         | `"kokoro"` \| `"sarvam"`                |
| `STT_PROVIDER`             | Yes (default STT)         | `"sarvam"`                               |
| `SARVAM_API_KEY`           | No (secret)               | Required when any provider is `sarvam`   |
| `SARVAM_LLM_MODEL`        | Yes (reply behavior)      | `"sarvam-105b"` \| `"sarvam-105b-conversations"` |
| `SARVAM_TTS_VOICE`         | Yes (conversation voice)  | Used in conversation TTS calls           |
| `SARVAM_TTS_PACE`          | Yes (conversation pace)   | 0.5–2.0                                 |
| `SARVAM_TTS_TIMEOUT_MS`    | Yes (latency)             | Default: 30000                           |
| `SARVAM_STT_TIMEOUT_MS`    | Yes (latency)             | Default: 15000                           |
| `STT_MAX_FILE_SIZE_BYTES`  | Yes (upload limit)        | Default: 10485760 (10 MB)               |
| `STT_MAX_DURATION_SECONDS` | Yes (audio length limit)  | Default: 30, max: 30                     |
| `KOKORO_TTS_URL`           | No                        | Default: `https://tts-system.vercel.app/api/tts` |
| `KOKORO_TIMEOUT_MS`        | Yes (latency)             | Default: 90000                           |

---

## 7. Limits and Constraints

### 7.1 Audio

| Constraint                      | Value                          |
| ------------------------------- | ------------------------------ |
| STT max file size               | 10 MB (10,485,760 bytes)       |
| STT max audio duration          | 30 seconds                     |
| Unknown metadata duration       | Full scan once when within the file-size cap; otherwise Sarvam is the 30-second backstop |
| STT accepted MIME types         | 24 types, with MIME parameters tolerated (see §3.7) |
| Recommended recording format    | 16 kHz mono WAV                |
| TTS output format               | WAV (both providers)           |

### 7.2 Text

| Constraint                      | Value                          |
| ------------------------------- | ------------------------------ |
| TTS input text max length       | 2500 chars (Zod + Sarvam)      |
| Conversation turn text          | 1–500 chars                    |
| User name max length            | 50 chars                       |
| LLM reply max length            | 600 chars (Zod schema)         |
| JSON/URL-encoded body max size  | 1 MB                           |

### 7.3 Timeouts

| Provider call                   | Default timeout                |
| ------------------------------- | ------------------------------ |
| Sarvam TTS                      | 30,000 ms                     |
| Sarvam STT                      | 15,000 ms                     |
| Kokoro TTS                      | 90,000 ms                     |
| Sarvam LLM                      | 15,000 ms (hardcoded)         |

### 7.4 Conversation Limits

| Constraint                      | Value                          |
| ------------------------------- | ------------------------------ |
| Max user turns per conversation | `roleplay.maxTurns` (per lesson; typically 4–5) |
| LLM context window              | Last 10 messages (sliding window) |

---

## 8. Frontend Integration Notes

### 8.1 Error Handling in UI

| Error status | UI guidance                                                 |
| ------------ | ----------------------------------------------------------- |
| 400          | Show validation message to user (from `error.message`)      |
| 401          | Redirect to onboarding (user does not exist or invalid ID)  |
| 404          | Show "not found" state; lesson/conversation may be deleted  |
| 409          | Conversation is done; disable the "send" button             |
| 429          | Show "please wait" / retry after a delay                    |
| 500          | Show generic error; likely a server misconfiguration        |
| 502          | External AI service failed; retry or show fallback          |
| 504          | External AI service timed out; suggest retry                |

### 8.2 Required Headers

Every authenticated request must include:

```
x-user-id: <ObjectId from onboarding>
Content-Type: application/json        (for JSON endpoints)
```

For STT, use `Content-Type: multipart/form-data` (set automatically by
the HTTP client when using `FormData`).

### 8.3 Audio Recording Requirements

**Browser clients must send 16 kHz mono WAV** until WebM/Opus support is
confirmed with Sarvam. Sarvam's REST documentation lists WAV, MP3, AAC, FLAC
and OGG as accepted formats — WebM is not mentioned.

The backend does accept browser WebM uploads and forwards a normalized
`audio/webm` part named `audio.webm`, but Sarvam may reject it. WAV is the
only format verified end-to-end.

Recording checklist:
- **Format**: 16 kHz mono WAV (PCM 16-bit). Required for browser clients.
- **Encoding**: Use `MediaRecorder` → `AudioContext.decodeAudioData` →
  `OfflineAudioContext` (resample to 16 kHz mono) → 44-byte RIFF header.
  A tested, dependency-free encoder is in `tools/stt-recorder.html`
  (`decodeToMono16k`, `floatTo16BitPCM`, `encodeWav`) — copy these functions
  into the Next.js frontend as-is.
- **MIME type**: Set to `audio/wav` in the multipart upload.
- **Duration**: Under 30 seconds.
- **Size**: Under 10 MB.
- **Flutter**: Record 16 kHz mono WAV natively (no browser encoding needed).

### 8.4 Audio Playback

- TTS responses return a relative `audioUrl` (e.g., `/audio/uuid.wav`).
- Different messages can share the same `audioUrl`.
- Build the full URL: `http://<host>:<port>/audio/<filename>.wav`
- Format is always WAV from both TTS providers.
- `audioUrl` may be `null` if TTS fails — the client should handle this
  gracefully (show text only, do not crash).

### 8.5 Ordering of Calls

1. Always onboard first (to get `userId`).
2. Load lesson detail before starting a conversation (to show learn/repeat
   steps in the UI).
3. Start conversation → get `conversationId` → use it for turns and end.
4. STT is optional; you can send typed text directly to the turns endpoint.

### 8.6 Known Quirks and Edge Cases

- **Onboarding returns the full Mongoose `user` object**, including `_id`,
  `__v`, and Mongoose internals. Use `userId` (the plain string) for the
  `x-user-id` header.
- **`endConversation`** in the turn response can be `true` even if
  `turnsRemaining > 0` — the LLM can decide the conversation is complete.
- **Turn rollback**: If the LLM fails, the user message is rolled back
  from the conversation. The client should allow the user to retry.
- **TTS failure in conversations is swallowed**: `audioUrl` will be `null`
  but the conversation proceeds. The client must handle null audio.
- **`hints` field** in lesson phrases uses a `Map` type in Mongoose. In
  JSON responses, this serializes as a plain object: `{ "hi": "...", "ta": "..." }`.
- **No pagination** on lesson list or conversation messages. All results
  are returned at once.
- **Conversation end is partially idempotent**: Ending an already-completed
  conversation returns `200` with the existing data. But ending an
  `"abandoned"` conversation returns `409`.
- **Feedback is computed on read from stored corrections (no LLM call).**
  Target-phrase matching is a normalised whole-word match, so contractions
  (`'I'm'` vs `'I am'`) count as missed.
- **The `GET /api/lessons` endpoint requires auth** (`x-user-id`), even
  though lessons are not user-specific. This is because `attachUser` is
  applied to the route.

---

## 9. Not Implemented / Known Gaps

The following are planned or referenced in the codebase/AGENT.md but **do
not exist yet**. Do not build frontend features that depend on these.

| Feature                          | Status                                                |
| -------------------------------- | ----------------------------------------------------- |
| **Real authentication** (JWT/OTP)| Not implemented. Using `x-user-id` header only.       |
| **`PATCH /api/users/me`**        | Listed in AGENT.md but **no route, controller, or service exists**. |
| **`GET /api/users/me`**          | Listed in AGENT.md but **no route, controller, or service exists**. |
| **`POST /api/conversations/:id/retry`** | Listed in AGENT.md but **no route exists**. |
| **`GET /api/mistakes`**          | Listed in AGENT.md but **no route, model, or service exists**. |
| **`GET /api/mistakes/due`**      | Listed in AGENT.md but **no route, model, or service exists**. |
| **`POST /api/vocabulary`**       | Listed in AGENT.md but **no route, model, or service exists**. |
| **`GET /api/vocabulary`**        | Listed in AGENT.md but **no route, model, or service exists**. |
| **`GET /api/progress`**          | Listed in AGENT.md but **no route or service exists**. |
| **`POST /api/onboarding/placement`** | Listed in AGENT.md but **no route exists**. Voice placement is not implemented. |
| **Mistake model**                | Listed in AGENT.md but **no Mongoose model exists**.   |
| **SavedWord model**              | Listed in AGENT.md but **no Mongoose model exists**.   |
| **Whisper STT provider**         | Referenced in AGENT.md but no implementation exists. Only Sarvam is available. |
| **WebSocket / streaming**        | Explicitly out of scope.                               |
| **Pronunciation scoring**        | Explicitly out of scope.                               |
| **Re-evaluation of level**       | AGENT.md says re-evaluate after 5 conversations; not implemented. |
| **Streak tracking**              | AGENT.md mentions optional streak; not implemented.    |
| **Redis / BullMQ**               | Not added.                                             |

---

## Cross-Check: Routes vs Documentation

### Routes registered in code (from `app.ts` and route files):

| Route                                  | Documented? |
| -------------------------------------- | ----------- |
| `GET /health`                          | ✅ §3.1     |
| `POST /api/onboarding`                | ✅ §3.2     |
| `GET /api/home`                        | ✅ §3.3     |
| `GET /api/lessons`                     | ✅ §3.4     |
| `GET /api/lessons/:id`                | ✅ §3.4     |
| `POST /api/conversations`             | ✅ §3.5     |
| `POST /api/conversations/:id/turns`   | ✅ §3.5     |
| `POST /api/conversations/:id/end`     | ✅ §3.5     |
| `GET /api/conversations/:id`          | ✅ §3.5     |
| `POST /api/speech/tts`                | ✅ §3.6     |
| `POST /api/speech/stt`                | ✅ §3.7     |
| `GET /audio/*` (static)               | ✅ §1       |

### Endpoints listed in AGENT.md but **NOT** in code:

| Endpoint                                  | Status           |
| ----------------------------------------- | ---------------- |
| `POST /api/onboarding/placement`         | Not implemented  |
| `GET /api/users/me`                      | Not implemented  |
| `PATCH /api/users/me`                    | Not implemented  |
| `POST /api/conversations/:id/retry`      | Not implemented  |
| `GET /api/mistakes`                      | Not implemented  |
| `GET /api/mistakes/due`                  | Not implemented  |
| `POST /api/vocabulary`                   | Not implemented  |
| `GET /api/vocabulary`                    | Not implemented  |
| `GET /api/progress`                      | Not implemented  |

**All 11 routes in code are documented. Zero mismatches.**

# Zubaan Backend

## API so far

Base URL: `http://localhost:3000/api`

### Onboarding

- `POST /onboarding`

```json
{
  "nativeLanguage": "hi",
  "goal": "daily_conversation",
  "level": "beginner",
  "name": "Asha"
}
```

### Lessons

- `GET /lessons` (requires `x-user-id`)
- `GET /lessons/:id` (requires `x-user-id`)

### Conversations

- `POST /conversations` (requires `x-user-id`)

```json
{
  "lessonId": "670000000000000000000001"
}
```

Response now includes optional `audioUrl` for AI messages:

```json
{
  "conversationId": "6700000000000000000000aa",
  "status": "active",
  "messages": [
    {
      "role": "ai",
      "text": "Hello, I am your interviewer today. Tell me about yourself.",
      "audioUrl": "/audio/5ca9b63d-4fd0-4a61-a2d3-2ef13f2f9ce7.wav",
      "createdAt": "2026-10-12T10:45:00.000Z"
    }
  ],
  "turnsRemaining": 4
}
```

- `POST /conversations/:id/turns` (requires `x-user-id`)

```json
{
  "text": "I am a support engineer with three years of experience."
}
```

```json
{
  "reply": "Great start. Can you share one customer issue you solved recently?",
  "audioUrl": "/audio/0a0d69a9-8dd5-4be5-87ec-3f2856cb6a6f.wav",
  "endConversation": false,
  "turnsRemaining": 3
}
```

If TTS fails, conversation still succeeds and returns `audioUrl: null`.

- `POST /conversations/:id/end` (requires `x-user-id`)
- `GET /conversations/:id` (requires `x-user-id`)

### Speech (provider benchmarking)

- `POST /speech/tts` (requires `x-user-id`)

```json
{
  "text": "Welcome to Zubaan. Let us practice one short response.",
  "language": "en-IN",
  "provider": "kokoro",
  "voice": "af_heart",
  "pace": 1
}
```

```json
{
  "audioUrl": "/audio/6ebf66ce-cdf2-4d4f-896b-9e787a8bcfd0.wav",
  "provider": "kokoro",
  "voice": "af_heart",
  "pace": 1,
  "chars": 57,
  "totalMs": 1820,
  "durationMs": null
}
```

- `POST /speech/stt` (requires `x-user-id`, multipart/form-data)
  - Field `audio` (file)
  - Optional field `language` (`unknown` for auto-detect, `en-IN`, `hi-IN`, `ta-IN`, `te-IN`, etc.)
  - Sarvam REST constraints enforced server-side:
    - Supported MIME types: WAV, MP3, AAC, AIFF, OGG/Opus, FLAC, MP4/M4A, AMR, WMA, WebM, PCM
    - Max audio duration: 30 seconds

```bash
curl -X POST http://localhost:5000/api/speech/stt \
  -H "x-user-id: <USER_ID>" \
  -F "audio=@./sample.wav;type=audio/wav" \
  -F "language=unknown"
```

```json
{
  "text": "I goed to market yesterday",
  "languageCode": "en-IN",
  "provider": "sarvam",
  "totalMs": 842,
  "durationSeconds": 2.4
}
```

### Home

- `GET /home` (requires `x-user-id`)

## Environment variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_SECRET=
LLM_PROVIDER=mock
TTS_PROVIDER=kokoro
STT_PROVIDER=sarvam
SARVAM_API_KEY=
SARVAM_LLM_MODEL=sarvam-105b-conversations
SARVAM_TTS_VOICE=shubh
SARVAM_TTS_PACE=1
SARVAM_TTS_TIMEOUT_MS=15000
SARVAM_STT_TIMEOUT_MS=15000
STT_MAX_FILE_SIZE_BYTES=10485760
STT_MAX_DURATION_SECONDS=30
KOKORO_TTS_URL=https://tts-system.vercel.app/api/tts
KOKORO_TIMEOUT_MS=90000
```

## Benchmark command

```bash
npm run bench:tts
```

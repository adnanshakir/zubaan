# Zubaan Postman collection

This folder contains an importable Postman Collection v2.1 for the Zubaan
backend and a local environment with safe, empty placeholders. It documents
all 17 HTTP routes currently implemented in the code, including `GET /health`.

## Import and configure

1. Import `zubaan.postman_collection.json` into Postman.
2. Import `local.postman_environment.json` and select **Zubaan local**.
3. Keep `baseUrl` as `http://localhost:5000/api` unless `PORT` is different.
   The health request is outside the API prefix and handles that automatically.
4. Do not put a real provider key, JWT, or personal data in the collection.

The backend has no JWT or session-cookie authentication. `POST /api/onboarding`
is public and creates a user. Copying its returned `userId` into
`{{userId}}` (or running the request with its test script) supplies the
`x-user-id` header required by every other API route. The value must be a real
24-hex MongoDB ObjectId belonging to a user in the configured database.

## Smoke flow

Run the folder **Smoke flow (run in order)** in the Collection Runner. It
loads a lesson, starts an attempt, records correct and wrong exercise results,
completes the attempt, starts a conversation linked to that attempt, sends
right/wrong/off-topic typed turns, ends it, reads it back, lists mistakes, and
gets the attempt. The earlier request test scripts save lesson, exercise,
attempt, and conversation IDs into collection variables. A sentence-stage
exercise must be present in the selected lesson for the wrong-result step.

For free local conversation testing, configure:

```text
LLM_PROVIDER=mock
TTS_PROVIDER=kokoro
```

TTS, STT, and conversation requests can call external providers and may cost
money unless the mock/free local configuration is used. STT still needs a
local audio file in the multipart `audio` field and a provider configuration.
The TTS response is JSON metadata; `audioUrl` points to generated WAV audio.

## Errors and limits

Errors use the same shape everywhere:

```json
{
  "error": {
    "message": "Human-readable error description"
  }
}
```

Validation errors are `400`, missing or invalid `x-user-id` is `401`, missing
resources are generally `404`, conversation conflicts are `409`, and provider
failures may be `429`, `500`, `502`, or `504`. There is no application-level
rate limiter. JSON bodies are limited to 1 MB, TTS text is limited to 2,500
characters, and STT uploads are limited to 10 MB by default.

# Technical Specification Validator — Backend

Fastify + TypeScript backend that validates a technical specification (ТЗ) text using Google Gemini.

All AI logic lives here; the frontend talks to it over plain REST.

## Stack

- Node.js 24 (via NVM)
- TypeScript 5 (strict, NodeNext modules, `rewriteRelativeImportExtensions`)
- Fastify 5 + `@fastify/cors`
- Google Gemini SDK — `@google/genai`
- Zod 4 — env + request validation
- Pino (Fastify default) — structured logging
- `tsx` — TS runtime for dev
- ESLint 9 + Prettier

## Folder layout (FSD-style layers)

```
src/
  app/                       # composition root
    index.ts                 # process entrypoint
    server.ts                # Fastify instance wiring
  shared/
    config/env.ts            # Zod-validated process.env
    errors/AppError.ts       # AppError / ValidationError / GeminiError
    prompts/
      idealSpecTemplate.ts   # canonical "ideal ТЗ" reference
      systemPrompt.ts        # buildSystemPrompt()
  entities/
    validation/
      model/types.ts         # ValidationRequest / ValidationResult
  features/
    validate-spec/
      api/
        route.ts             # Fastify plugin: POST /api/validate, GET /api/template, GET /api/health
        schema.ts            # Zod request/response schemas
      lib/geminiClient.ts    # Thin @google/genai wrapper
      model/service.ts       # ValidateSpecService
```

## HTTP API

| Method | Path             | Body                  | Response                                                          |
| ------ | ---------------- | --------------------- | ----------------------------------------------------------------- |
| POST   | `/api/validate`  | `{ "text": "..." }`   | `{ markdown: string, meta: { model: string, durationMs: number } }` |
| GET    | `/api/template`  | —                     | `{ markdown: string }` (reference "ideal ТЗ")                     |
| GET    | `/api/health`    | —                     | `{ status: "ok" }`                                                |

Error shape: `{ error: { code: string, message: string } }`.

Common errors:
- `400 VALIDATION_ERROR` — empty / oversized text
- `502 GEMINI_ERROR` — upstream Gemini failure
- `500 INTERNAL_ERROR` — anything unexpected

## Getting started

```bash
# Pick Node 24 via NVM
nvm install 24
nvm use            # reads .nvmrc -> 24

# Install
npm install

# Configure environment
cp .env.example .env
# then open .env and paste your GEMINI_API_KEY=...

# Dev (hot reload via node --watch + tsx)
npm run dev

# Production
npm run build
npm start
```

## Environment variables

| Variable          | Required | Default                | Description                                          |
| ----------------- | -------- | ---------------------- | ---------------------------------------------------- |
| `GEMINI_API_KEY`  | yes      | —                      | Google AI Studio API key                             |
| `GEMINI_MODEL`    | no       | `gemini-2.5-flash`     | Gemini model name                                    |
| `PORT`            | no       | `3001`                 | HTTP port                                            |
| `HOST`            | no       | `127.0.0.1`            | Bind host                                            |
| `CORS_ORIGIN`     | no       | `http://localhost:5173`| Comma-separated allowed origins, or `*`              |
| `LOG_LEVEL`       | no       | `info`                 | Pino log level (`debug`/`info`/`warn`/`error`/...)   |
| `NODE_ENV`        | no       | `development`          | `development` enables pino-pretty                    |

## Scripts

| Script        | What it does                                |
| ------------- | ------------------------------------------- |
| `dev`         | `node --env-file=.env --watch --import tsx` |
| `build`       | `tsc -p tsconfig.json` → `dist/`            |
| `start`       | run compiled output from `dist/`            |
| `typecheck`   | `tsc --noEmit`                              |
| `lint`        | ESLint                                      |
| `format`      | Prettier write                              |

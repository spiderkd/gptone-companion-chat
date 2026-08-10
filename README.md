# GPTone Companion Chat

GPTone is a full-stack companion chat app built with Next.js, LangGraph, Postgres, Prisma, S3-compatible file storage, and Model Context Protocol tools. The project focuses on communication style as a real product control: users can talk with animated companion characters, switch personas mid-thread, bring their own model keys, and keep conversation memory across sessions.

## What It Does

- Companion characters map to backend personas such as Friendly Guide, Calm Coach, Technical Analyst, Guardian Reviewer, Creative Partner, and Proud Champion.
- Persona switching keeps factual continuity while changing the assistant's tone and decision style.
- JEV/Codiv classification can recommend a better companion for the current message before the user sends it.
- BYOK settings let users provide OpenAI, Gemini, and JEV/Codiv keys from the browser UI for demo use.
- LangGraph powers streaming chat, persistent thread state, tool approval, and MCP tool execution.
- Prisma and Postgres store threads, MCP server settings, OAuth tokens, file metadata, and checkpoints.
- S3-compatible storage supports local MinIO in development and Cloudflare R2, AWS S3, or another compatible bucket in production.

## Tech Stack

- Next.js App Router and React
- LangGraph.js and LangChain model adapters
- OpenAI and Google Gemini model providers
- JEV/Codiv companion classification
- Prisma with Postgres
- MCP server and tool integration
- S3-compatible object storage
- Three.js companion avatars

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start Postgres and local S3-compatible storage:

```bash
docker compose up -d
```

Create your environment file:

```bash
cp .env.example .env
```

Generate Prisma client and run migrations:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment

The app is designed for BYOK demos. Users can enter provider keys in the UI, and those keys are sent only with the matching provider request. Server-side fallback keys are optional for hosted demos.

Required for local persistence:

- `DATABASE_URL`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`

Optional server fallbacks:

- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `CODIV_API_KEY`
- `CODIV_BASE_URL`
- `CODIV_MODEL`

See `.env.example` for the full list.

## Main Screens

- `/` - active companion chat
- `/characters` - companion character selection
- `/demo` - portfolio demo view
- `/thread/[threadId]` - persisted thread view
- `/api-docs` - generated API explorer

## Documentation

- `docs/ARCHITECTURE.md` explains the companion, memory, MCP, storage, and persona-switching architecture.
- `docs/API.md` documents the current API route surface.
- `docs/OAUTH.md` explains optional OAuth support for HTTP MCP servers.

## License And Notices

This project includes substantial code derived from `IBJunior/fullstack-langgraph-nextjs-agent` by Ali Ibrahim Jr, licensed under MIT. The repository keeps the original notice in `LICENSE` and adds project-specific attribution for additions.

Third-party decoder and model notices under `public/` must remain with their corresponding files.
